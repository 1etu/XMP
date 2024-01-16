import type { PresetId } from "./id.js";

export type Rgb = readonly [number, number, number];
export type Par = Readonly<Record<string, number>>;

export interface Group {
  readonly val: Par;
  readonly ints: readonly string[];
}
