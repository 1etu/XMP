import { mix } from "./preset.js";
import type { Rgb } from "./preset.js";
import { measured } from "@vsh/resource";

export const PAL_W = measured(4);
export const PAL_H = measured(8);
export const PAL_STOPS = PAL_W * PAL_H;
export const LUT_W = measured(512);

const N_MONTH = 12;
const RGBA = 4;
const FULL = 255;

export interface MonthPalette {
  readonly month: number;
  readonly day: readonly Rgb[];
  readonly night: readonly Rgb[];
}

export interface PaletteFile {
  readonly months: readonly MonthPalette[];
}

export class PaletteError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PaletteError";
    this.detail = detail;
  }
}
