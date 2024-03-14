import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { QglFrame } from "../frame.js";
import type { Part, Preset } from "../preset.js";
import { bgOf, hdrOf, lineOf, partOf } from "../preset.js";
import { STEX_H, STEX_W, type Lattice } from "../lines/spline.js";
import { MAX_PARTICLES, PARTICLE_FLOATS, Particles } from "./view.js";
import { ParticleSimulation, STATE_FLOATS } from "./sim.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../resources/qgl");
const preset = JSON.parse(
  readFileSync(resolve(root, "presets/night.json"), "utf8"),
) as Preset;
const still: Part = {
  ...partOf(preset),
  emitProb: 1,
  emitPerFrame: 1,
  emitConeAngle: 0,
  emitNegProb: 0,
  emitVelMin: 1,
  emitVelMul: 0,
  agingSpeed: 0.005,
  agingVariance: 0,
  friction: 0,
  gravity: 0,
  brownianScale: 0,
  windScale: 0,
};
const step = 1000 / 60;

function frame(
  elapsedMs: number,
  part = still,
  x = elapsedMs / 1000,
  z = -6,
): QglFrame {
  const spline = new Float32Array(STEX_W * STEX_H * 4);
  for (let o = 0; o < spline.length; o += 4) {
    spline[o] = x / (16 / 9);
    spline[o + 3] = -z;
  }
  return {
    no: Math.round(elapsedMs / step),
    deltaMs: step,
    elapsedMs,
    scene: {
      bg: { ...bgOf(preset), fovy: 90 },
      hdr: hdrOf(preset),
      line: lineOf(preset),
      part,
      corners: preset.corners,
      daylight: 0,
      palette: new Uint8Array(0),
      fresLut: new Uint8Array(0),
      spline,
      normals: new Float32Array(spline.length),
      quality: "standard",
      reducedMotion: false,
    },
  };
}

describe("ParticleSimulation", () => {
  it("does not launch particles from a stationary wave", () => {
    const simulation = new ParticleSimulation();
    for (let tick = 0; tick < 120; tick += 1)
      simulation.advance(frame(tick * step, still, 0));
    expect(simulation.count).toBe(0);
  });

  it("retains the wave depth and launches in the wave motion direction", () => {
    const simulation = new ParticleSimulation();
    simulation.advance(frame(0));
    simulation.advance(frame(step));
    expect(simulation.count).toBe(1);
    expect(simulation.state[2]).toBe(-6);
    expect(simulation.state[4]).toBe(1);
    expect(simulation.state[5]).toBe(0);
    expect(simulation.state[6]).toBe(0);
    expect(simulation.state[0]).toBeCloseTo(step / 1000 + still.deltaTime, 6);
  });

  it("removes launch depth velocity without moving the birth onto a focus plane", () => {
    const simulation = new ParticleSimulation();
    simulation.advance(frame(0, still, 0, -5));
    simulation.advance(frame(step, still, 0, -4));
    expect(simulation.count).toBe(1);
    expect(simulation.state[2]).toBe(-4);
    expect(simulation.state[4]).toBe(0);
    expect(simulation.state[5]).toBe(0);
    expect(simulation.state[6]).toBe(0);
  });

  it("lets emitted particles move independently of later wave changes", () => {
    const a = new ParticleSimulation();
    const b = new ParticleSimulation();
    for (let tick = 0; tick < 3; tick += 1) {
      const input = frame(tick * step);
      a.advance(input);
      b.advance(input);
    }
    a.advance(frame(step * 3, still, 0.05));
    b.advance(frame(step * 3, still, 3));
    expect(a.state.slice(0, STATE_FLOATS)).toEqual(b.state.slice(0, STATE_FLOATS));
  });

  it("gives equal states at 30, 60, and 120 Hz for the same linear wave", () => {
    const states: Float32Array[] = [];
    for (const hz of [30, 60, 120]) {
      const simulation = new ParticleSimulation();
      for (let tick = 0; tick <= hz; tick += 1) {
        simulation.advance(frame((tick * 1000) / hz));
      }
      states.push(simulation.state);
    }
    for (let i = 1; i < states.length; i += 1) {
      const reference = states[0] ?? new Float32Array();
      const candidate = states[i] ?? new Float32Array();
      let error = 0;
      for (let j = 0; j < reference.length; j += 1) {
        error = Math.max(error, Math.abs((reference[j] ?? 0) - (candidate[j] ?? 0)));
      }
      expect(error).toBeLessThan(1e-6);
    }
  });

  it("keeps the native pool bounded and retires particles at the life boundary", () => {
    const simulation = new ParticleSimulation();
    const part = { ...still, emitPerFrame: MAX_PARTICLES, agingSpeed: 0.1 };
    simulation.advance(frame(0, part));
    simulation.advance(frame(step, part));
    expect(simulation.count).toBe(MAX_PARTICLES);
    const stopped = { ...part, emitProb: 0 };
    for (let tick = 2; tick <= 12; tick += 1) {
      simulation.advance(frame(tick * step, stopped, step / 1000));
      expect(simulation.count).toBeLessThanOrEqual(MAX_PARTICLES);
    }
    expect(simulation.count).toBe(0);
  });

  it("keeps rotating quaternions normalized", () => {
    const simulation = new ParticleSimulation();
    for (let tick = 0; tick < 120; tick += 1) simulation.advance(frame(tick * step));
    expect(simulation.state[8]).not.toBe(0);
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const o = i * STATE_FLOATS;
      if ((simulation.state[o + 3] ?? -1) < 0) continue;
      expect(Math.hypot(...simulation.state.slice(o + 8, o + 12))).toBeCloseTo(1, 6);
    }
  });

  it("retains a recycled slot's rotation", () => {
    const simulation = new ParticleSimulation();
    const part = { ...still, agingSpeed: 0.5, spinTimeScale: 0 };
    simulation.advance(frame(0, part));
    simulation.advance(frame(step, part));
    simulation.state[8] = 0.6;
    simulation.state[11] = 0.8;
    simulation.advance(frame(step * 2, part));
    expect(simulation.state[3]).toBeLessThan(0);
    simulation.advance(frame(step * 3, part));
    expect(simulation.state[3]).toBe(0.5);
    expect(simulation.state[8]).toBeCloseTo(0.6, 6);
    expect(simulation.state[11]).toBeCloseTo(0.8, 6);
  });
});

describe("Particles", () => {
  it("keeps the live particle field when reduced motion requests a frozen redraw", () => {
    const lattice = JSON.parse(
      readFileSync(resolve(root, "wave-lattice.json"), "utf8"),
    ) as Lattice;
    const particles = new Particles();
    for (let tick = 0; tick <= 60; tick += 1)
      particles.write(frame(tick * step), MAX_PARTICLES);
    const input = frame(60 * step);
    const live = new Float32Array(particles.write(input, MAX_PARTICLES));
    const frozen = {
      ...input,
      scene: {
        ...input.scene,
        reducedMotion: true,
        particleWarmup: { lattice, durationMs: 30000 },
      },
    };
    expect(particles.write(frozen, MAX_PARTICLES)).toEqual(live);
  });

  it("retains particle positions and light ratios through a visibility fade", () => {
    const particles = new Particles();
    for (let tick = 0; tick <= 60; tick += 1)
      particles.write(frame(tick * step), MAX_PARTICLES);
    const input = frame(60 * step);
    const full = new Float32Array(particles.write(input, MAX_PARTICLES));
    const half = new Float32Array(
      particles.write(
        {
          ...input,
          scene: {
            ...input.scene,
            part: {
              ...input.scene.part,
              globalAlpha: input.scene.part.globalAlpha * 0.5,
            },
          },
        },
        MAX_PARTICLES,
      ),
    );
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const offset = i * PARTICLE_FLOATS;
      expect(half.slice(offset, offset + 8)).toEqual(full.slice(offset, offset + 8));
      for (const channel of [8, 9, 10, 12, 13, 14])
        expect(half[offset + channel]).toBeCloseTo(
          (full[offset + channel] ?? 0) * 0.5,
          7,
        );
    }
  });
  it("warms a frozen scene once and preserves its particles on later redraws", () => {
    const lattice = JSON.parse(
      readFileSync(resolve(root, "wave-lattice.json"), "utf8"),
    ) as Lattice;
    const input = frame(0, partOf(preset));
    const frozen = {
      ...input,
      scene: {
        ...input.scene,
        reducedMotion: true,
        particleWarmup: { lattice, durationMs: 1000 },
      },
    };
    const particles = new Particles();
    const first = new Float32Array(particles.write(frozen, MAX_PARTICLES));
    expect(first.some((value) => value > 0)).toBe(true);
    expect(particles.write(frozen, MAX_PARTICLES)).toEqual(first);
  });

  it("provides identical finite streams for both renderer instances", () => {
    const gl = new Particles();
    const gpu = new Particles();
    for (let tick = 0; tick < 120; tick += 1) {
      const input = frame(tick * step, partOf(preset));
      const a = gl.write(input, MAX_PARTICLES);
      const b = gpu.write(input, MAX_PARTICLES);
      expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
      expect(a.every(Number.isFinite)).toBe(true);
      expect(a.length).toBe(MAX_PARTICLES * PARTICLE_FLOATS);
    }
  });

  it("holds a paused frame and rotates flakes when the clock advances", () => {
    const particles = new Particles();
    for (let tick = 0; tick < 60; tick += 1) particles.write(frame(tick * step), 64);
    const first = new Float32Array(particles.write(frame(1000), 64));
    expect(particles.write(frame(1000), 64)).toEqual(first);
    const next = particles.write(frame(1100), 64);
    expect(next.slice(4, 8)).not.toEqual(first.slice(4, 8));
    expect(next.slice(8, 11)).not.toEqual(first.slice(8, 11));
  });
});
