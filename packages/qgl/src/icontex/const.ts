import { measured, verified } from "@vsh/resource";

import type { Rgb } from "../preset.js";
import type { Quad } from "./kind.js";

export const LOG2_E = verified(1.4429434537887573);
export const REFRACTION_FLOOR = verified(0.6669999957084656);
export const LUMINANCE_POINTS = [
  [verified(0.2044299989938736), verified(-0.7366139888763428)],
  [verified(0.5444409847259521), verified(-0.2599810063838959)],
  [verified(1), verified(0)],
] as const;
export const DEFAULT_COLOR: Rgb = [
  measured(230 / 255),
  measured(160 / 255),
  measured(238 / 255),
];