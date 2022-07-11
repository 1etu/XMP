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

function sample(img: Dds.Image): Rgb[] {
  const out: Rgb[] = [];

  for (let gy = 0; gy < GRID_H; gy += 1) {
    for (let gx = 0; gx < GRID_W; gx += 1) {
      const x = Math.min(img.wid - 1, Math.round(((gx + 0.5) / GRID_W) * img.wid));
      const y = Math.min(img.hgt - 1, Math.round(((gy + 0.5) / GRID_H) * img.hgt));
      const o = (y * img.wid + x) * 4;
      out.push([img.rgba[o] ?? 0, img.rgba[o + 1] ?? 0, img.rgba[o + 2] ?? 0]);
    }
  }

  return out;
}
