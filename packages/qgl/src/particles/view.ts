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