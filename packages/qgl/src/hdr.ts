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
