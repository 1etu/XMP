import * as Mnu from "./mnu.ts";
import * as Qrc from "./qrc.ts";

const N_CORNER = 4;
const BASE_ID = "base";
const CHAN = ["RED", "GREEN", "BLUE"] as const;

const SIG: Readonly<Record<string, string>> = {
  BACKGROUND: "1 RED",
  HDR: "ENABLED",
  LINE1: "STATE",
  PARTICLES: "emit vel min",
  PARTICLES_SPE: "delta time",
  PARTICLES_UI: "brownian",
};

export type Rgb = readonly [number, number, number];

export interface Group {
  readonly val: Mnu.Block;
  readonly ints: readonly string[];
}

export interface Preset {
  readonly id: string;
  readonly corners: readonly Rgb[];
  readonly bg: Group;
  readonly hdr: Group;
  readonly line: Group;
  readonly part: Group;
}

interface Src {
  readonly val: Mnu.Block;
  readonly kind: Mnu.Kinds;
}

export class PairError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PresetPairError";
    this.detail = detail;
  }
}

export function camel(key: string): string {
  const parts = key
    .trim()
    .split(/[\s_]+/)
    .filter((p) => p.length > 0)
    .map((p) => p.toLowerCase());

  return parts
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}
