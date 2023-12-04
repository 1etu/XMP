import { design, measured, verified } from "@vsh/resource";
import type { QglFrame } from "../frame.js";
import { STEX_H, STEX_W } from "../lines/spline.js";
import type { Part } from "../preset.js";

export const MAX_PARTICLES = verified(2048);
export const STATE_FLOATS = verified(12);
export const CAMERA_Z = verified(2);
export const LIFE_BOUND = verified(10);
const ASPECT = measured(16 / 9);
const FIXED_HZ = verified(60);
const MAX_FRAME_GAP = design(1000);
const DEAD_AGE = verified(-666);