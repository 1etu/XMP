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
