import * as Dds from "./dds.ts";
import type * as Qrc from "./qrc.ts";

const N_MONTH = 12;
const GRID_W = 4;
const GRID_H = 8;
const DAY_PFX = "textures/month_bg/rgb/";
const NIGHT_PFX = "textures/month_bg/night/";

export type Rgb = readonly [number, number, number];

export interface Palette {
  readonly month: number;
  readonly day: readonly Rgb[];
  readonly night: readonly Rgb[];
}

export class PairError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PalettePairError";
    this.detail = detail;
  }
}
