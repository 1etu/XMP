import type { PresetId } from "./id.js";

export type Rgb = readonly [number, number, number];
export type Par = Readonly<Record<string, number>>;

export interface Group {
  readonly val: Par;
  readonly ints: readonly string[];
}

export interface Preset {
  readonly id: string;
  readonly corners: readonly Rgb[];
  readonly bg: Group;
  readonly hdr: Group;
  readonly line: Group;
  readonly part: Group;
  readonly icons?: Group;
}

export type Catalog = Readonly<Record<PresetId, Preset>>;
