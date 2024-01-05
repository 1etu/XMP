import { measured, verified } from "@vsh/resource";
import type { QglFrame } from "../frame.js";
import { Spline } from "../lines/spline.js";
import {
  CAMERA_Z,
  LIFE_BOUND,
  MAX_PARTICLES,
  ParticleSimulation,
  STATE_FLOATS,
} from "./sim.js";

export { MAX_PARTICLES } from "./sim.js";
export const PARTICLE_FLOATS = 16;
const ASPECT = measured(16 / 9);
const DISPLAY_GAIN = measured(0.8);
const LIFE_FADE_IN = verified(0.02);
const LIFE_FADE_OUT = verified(0.94);
const LIFE_FADE_OUT_GAIN = verified(16.6666667);
const BOUND_FADE = verified(5);
const FOCUS_BAND = verified(0.2);
const FOCUS_BAND_COUNT = verified(3);
const BASE_FUZZINESS = verified(0.85);
const FIXED_HZ = verified(60);
