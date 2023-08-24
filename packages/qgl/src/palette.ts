import { mix } from "./preset.js";
import type { Rgb } from "./preset.js";
import { measured } from "@vsh/resource";

export const PAL_W = measured(4);
export const PAL_H = measured(8);
export const PAL_STOPS = PAL_W * PAL_H;
export const LUT_W = measured(512);
