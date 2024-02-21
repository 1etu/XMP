import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { budgetOf } from "./frame.js";
import {
  DISPLAY_GAIN,
  EXPOSURE_SAMPLES,
  glareLayout,
  inverseDisplay,
  writeExposure,
  writeGaussian,
  writeGlareWeights,
  writeHalfPalette,
  writeParticleBlur,
} from "./hdr.js";
import { hdrOf } from "./preset.js";
import type { Preset } from "./preset.js";

const night = hdrOf(
  JSON.parse(
    readFileSync(
      new URL("../../../resources/qgl/presets/night.json", import.meta.url),
      "utf8",
    ),
  ) as Preset,
);
const capture = {
  ...night,
  exposure: 1.04999995,
  whiteLevel: 0.899180974,
  glareThresh: 0.738857,
  glareLevel: 1.10245,
  glareSumPow: 0.557478,
  gaussianRadR: 1.23888,
  gaussianRadG: 1.43176,
  gaussianRadB: 1.55787,
  texSize: 7,
  texMaxMip: 6,
};

function displayAt(input: number, lut: Float32Array): number {
  const q = Math.max(0, Math.min(127, input * 8 - 0.5));
  const lo = Math.floor(q);
  const a = lut[lo * 4] ?? 0;
  const b = lut[Math.min(127, lo + 1) * 4] ?? 0;
  return a + (b - a) * (q - lo);
}

describe("native HDR lookup", () => {
  it("matches the captured lookup samples within one half-float step", () => {
    const lut = new Float32Array(EXPOSURE_SAMPLES * 4);
    writeExposure(capture, lut);
    const samples = [
      [1, 0.10870361328125, -0.0753173828125],
      [4, 0.457763671875, -0.020782470703125],
      [8, 0.94921875, 0.06646728515625],
      [32, 4.03515625, 2.712890625],
      [127, 16.4375, 50.90625],
    ];
    for (const [index = 0, display = 0, mask = 0] of samples) {
      expect(Math.abs((lut[index * 4] ?? 0) - display)).toBeLessThanOrEqual(
        Math.abs(display) / 1024,
      );
      expect(Math.abs((lut[index * 4 + 1] ?? 0) - mask)).toBeLessThanOrEqual(
        Math.max(0.00002, Math.abs(mask) / 1024),
      );
    }
    expect(lut[1]).toBe(0);
    expect(lut.every(Number.isFinite)).toBe(true);
  });

  it("preserves display targets through the sampled inverse across boot exposure", () => {
    const lut = new Float32Array(EXPOSURE_SAMPLES * 4);
    for (const h of [night, capture, { ...night, exposure: 1.64 }]) {
      writeExposure(h, lut);
      for (const display of [0, 0.005, 0.02, 0.1, 0.3, 0.53, 0.9]) {
        expect(displayAt(inverseDisplay(display, h), lut)).toBeCloseTo(display, 6);
      }
      expect(displayAt(0.0625, lut)).toBe(0);
    }
  });

  it("keeps the black input continuous when a background target reaches zero", () => {
    const black = inverseDisplay(0, night);
    expect(black).toBe(0.0625);
    expect(inverseDisplay(1e-12, night)).toBeCloseTo(black, 10);
    const lut = new Float32Array(EXPOSURE_SAMPLES * 4);
    writeExposure(night, lut);
    expect(displayAt(black, lut)).toBe(0);
    expect(displayAt(0.2 + black, lut)).toBeCloseTo(
      displayAt(0.2 + inverseDisplay(1e-12, night), lut),
      10,
    );
    expect(inverseDisplay(0, { ...night, enabled: 0 })).toBe(0);
  });

  it("keeps glare below the threshold black and uses one mask for all RGB channels", () => {
    const lut = new Float32Array(EXPOSURE_SAMPLES * 4);
    writeExposure(capture, lut);
    const below = Math.max(0, lut[4 * 4 + 1] ?? 0);
    expect(below).toBe(0);
    const mask = Math.max(0, lut[8 * 4 + 1] ?? 0);
    const color = [0.6, 0.3, 0.1];
    const glare = color.map((channel) => channel * mask * 8);
    expect((glare[0] ?? 0) / (glare[1] ?? 1)).toBeCloseTo(2, 10);
    expect(DISPLAY_GAIN).toBe(0.8);
  });
});

describe("native glare filters", () => {
  it("matches the captured independent RGB kernels and preserves constant fields", () => {
    const kernel = new Float32Array(32);
    writeGaussian(capture, kernel);
    const expected = [
      0.334747195, 0.282191455, 0.26191178, 0, 0.241677791, 0.221113428, 0.213148385, 0,
      0.090948604, 0.106372371, 0.11488495, 0, 0, 0.031418465, 0.041010801, 0,
    ];
    expected.forEach((value, i) => {
      expect(kernel[i]).toBeCloseTo(value, 7);
    });
    for (let channel = 0; channel < 3; channel += 1) {
      let sum = kernel[channel] ?? 0;
      for (let i = 1; i < 8; i += 1) sum += 2 * (kernel[i * 4 + channel] ?? 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it("matches all six captured level weights and the squared glare level", () => {
    const weights = new Float32Array(6);
    writeGlareWeights(capture, 6, weights);
    const expected = [
      0.5544833540916, 0.3091123104095, 0.1723233163357, 0.0960664525628,
      0.0535549372435, 0.029855703935,
    ];
    expected.forEach((value, i) => {
      expect(weights[i]).toBeCloseTo(value, 7);
    });
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(capture.glareLevel ** 2, 6);
  });

  it("allocates native preset dimensions and caps only the reduced quality path", () => {
    expect(glareLayout(capture, 1.25, 8)).toEqual({ wid: 64, hgt: 64, levels: 6 });
    expect(glareLayout(night, 16 / 9, budgetOf("standard").glareMips)).toEqual({
      wid: 256,
      hgt: 128,
      levels: 8,
    });
    expect(glareLayout(night, 16 / 9, budgetOf("low").glareMips).levels).toBe(3);
  });

  it("keeps HDR palette values above one without byte wrapping", () => {
    const out = new Uint16Array(4);
    writeHalfPalette(new Float32Array([0, 0.5, 1, 2]), out);
    expect([...out]).toEqual([0, 0x3800, 0x3c00, 0x4000]);
    writeHalfPalette(new Uint8Array([0, 128, 255, 255]), out);
    expect([...out]).toEqual([0, 0x3804, 0x3c00, 0x3c00]);
  });
  it("preserves particle light through the measured capture filter", () => {
    const kernel = new Float32Array(32);
    writeParticleBlur(0.9, kernel);
    const expected = [0.44328936397, 0.239113610804, 0.0375279859314, 0.00171372127978];
    for (let channel = 0; channel < 3; channel += 1) {
      let sum = kernel[channel] ?? 0;
      for (let i = 0; i < expected.length; i += 1)
        expect(kernel[i * 4 + channel]).toBeCloseTo(expected[i] ?? 0, 7);
      for (let i = 1; i < 8; i += 1) sum += 2 * (kernel[i * 4 + channel] ?? 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    writeParticleBlur(0, kernel);
    expect(kernel[0]).toBe(1);
    expect(kernel[4]).toBe(0);
  });
});
