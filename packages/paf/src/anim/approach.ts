import { verified } from "@vsh/resource";

export const NATIVE_HZ = verified(60);

const BOOST = verified(Math.fround(1.000001));
const SHORT = [1, 0.96153849, 0.78125, 0.63694263, 0.52910054].map(verified);
const SLOPE = verified(Math.fround(0.33333299));
const INTERCEPT = verified(Math.fround(2.2));
const MS_PER_S = verified(Math.fround(0.001));

export function framesOf(durationMs: number): number {
  return Math.trunc(Math.fround(Math.fround(durationMs * MS_PER_S) * NATIVE_HZ));
}

export function gainOf(durationMs: number): number {
  const frames = framesOf(durationMs);

  return Math.fround(
    SHORT[frames] ?? 1 / Math.fround((frames - 5) * SLOPE + INTERCEPT),
  );
}

export function step(value: number, gain: number): number {
  return Math.min(
    1,
    Math.fround(Math.fround(Math.fround(1 - value) * gain + value) * BOOST),
  );
}
