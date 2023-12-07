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
const RETIRE_AGE = verified(0.999989986);
const MIN_AGE_RATE = verified(0.001);
const MIN_MOTION = verified(0.0001);
const TRAIL_PROBABILITY = verified(0.06);
const TRAIL_LENGTH = verified(100);
const TRAIL_VARIANCE = verified(80);