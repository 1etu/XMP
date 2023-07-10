import type { Bg, Hdr, Line, Part, Rgb } from "./preset.js";
import type { Lattice } from "./lines/spline.js";

export const QUALITIES = ["static", "low", "standard", "high"] as const;

export type Quality = (typeof QUALITIES)[number];
