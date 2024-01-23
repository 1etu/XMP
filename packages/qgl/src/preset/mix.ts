import type { Group, Preset, Rgb } from "./kind.js";

const N_CORNER = 4;

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
