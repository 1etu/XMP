export const EXPOSURE_SAMPLES = verified(128);
export const DISPLAY_GAIN = verified(0.8);
export const GAUSSIAN_TAPS = verified(8);
const MAX_GLARE_SIZE = design(9);
const MAX_GLARE_LEVELS = design(9);
const scratch = new Float32Array(1);
const scratchBits = new Uint32Array(scratch.buffer);

function halfTruncate(value: number): number {
  if (value === 0 || !Number.isFinite(value)) return 0;
  scratch[0] = value;
  const bits = scratchBits[0] ?? 0;
  const exponent = ((bits >>> 23) & 255) - 127;
  if (exponent < -14) return Math.trunc(value * 16777216) / 16777216;
  scratchBits[0] = bits & 0xffffe000;
  return scratch[0];
}

function exposureSample(index: number, h: Hdr): number {
  const x = (index / (EXPOSURE_SAMPLES - 1)) * 16 * h.exposure;
  const whiteSq = Math.max(h.whiteLevel * h.whiteLevel, 0.000001);
  return (x * (1 + x / whiteSq)) / (1 + x);
}

export function writeExposure(h: Hdr, out: Float32Array): void {
  for (let i = 0; i < EXPOSURE_SAMPLES; i += 1) {
    const p = exposureSample(i, h);
    out[i * 4] = halfTruncate(DISPLAY_GAIN * p);
    out[i * 4 + 1] =
      i === 0 ? 0 : halfTruncate(((p / Math.min(p, 1)) * (p - h.glareThresh)) / 8);
    out[i * 4 + 2] = 0;
    out[i * 4 + 3] = 1;
  }
}

export function inverseDisplay(display: number, h: Hdr): number {
  if (h.enabled < 0.5) return Math.max(0, display);
  if (display <= 0) return 0.5 / 8;
  const p = display / DISPLAY_GAIN;
  const whiteSq = Math.max(h.whiteLevel * h.whiteLevel, 0.000001);
  const x = 0.5 * whiteSq * (p - 1 + Math.sqrt((1 - p) ** 2 + (4 * p) / whiteSq));
  const estimate = ((x / Math.max(h.exposure, 0.000001)) * (EXPOSURE_SAMPLES - 1)) / 16;
  let lo = Math.min(EXPOSURE_SAMPLES - 2, Math.max(0, Math.floor(estimate)));
  while (lo > 0 && halfTruncate(DISPLAY_GAIN * exposureSample(lo, h)) > display)
    lo -= 1;
  while (
    lo < EXPOSURE_SAMPLES - 2 &&
    halfTruncate(DISPLAY_GAIN * exposureSample(lo + 1, h)) < display
  )
    lo += 1;
  const a = halfTruncate(DISPLAY_GAIN * exposureSample(lo, h));
  const b = halfTruncate(DISPLAY_GAIN * exposureSample(lo + 1, h));
  return (
    (lo + Math.min(1, Math.max(0, (display - a) / Math.max(b - a, 0.000001))) + 0.5) / 8
  );
}

export function writeGaussian(h: Hdr, out: Float32Array): void {
  const sigmas = [h.gaussianRadR, h.gaussianRadG, h.gaussianRadB];
  out.fill(0);
  for (let channel = 0; channel < 3; channel += 1) {
    const sigma = Math.max(sigmas[channel] ?? 0, 0.000001);
    const radius = Math.min(GAUSSIAN_TAPS - 1, Math.max(0, Math.floor(3 * sigma) - 1));
    let sum = 1;
    for (let i = 1; i <= radius; i += 1)
      sum += 2 * Math.exp((-i * i) / (2 * sigma * sigma));
    for (let i = 0; i <= radius; i += 1)
      out[i * 4 + channel] = Math.exp((-i * i) / (2 * sigma * sigma)) / sum;
  }
}

export function glareLayout(
  h: Hdr,
  aspect: number,
  budget: number,
): { wid: number; hgt: number; levels: number } {
  const size = Math.min(MAX_GLARE_SIZE, Math.max(1, Math.round(h.texSize)));
  const hgt = 2 ** (size - 1);
  const wid = hgt * (aspect > 1.5 ? 2 : 1);
  const levels = Math.min(
    MAX_GLARE_LEVELS,
    size,
    Math.max(1, Math.round(h.texMaxMip)),
    Math.max(1, budget),
  );
  return { wid, hgt, levels };
}
