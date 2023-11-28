import { design, measured, verified } from "@vsh/resource";
import type { QglFrame } from "../frame.js";
import { STEX_H, STEX_W } from "../lines/spline.js";
import type { Part } from "../preset.js";

export const MAX_PARTICLES = verified(2048);
export const STATE_FLOATS = verified(12);