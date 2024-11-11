import { QglInitError, budgetOf } from "../../frame.js";
import type { QglBackend, QglFrame, Viewport } from "../../frame.js";
import { STEX_H, STEX_W } from "../../lines/spline.js";
import {
  EXPOSURE_SAMPLES,
  glareLayout,
  writeExposure,
  writeGaussian,
  writeGlareWeights,
  writeParticleBlur,
  writeHalfPalette,
} from "../../hdr.js";
import { LUT_W, PAL_H, PAL_W } from "../../palette.js";
import { design, measured } from "@vsh/resource";
import { MAX_PARTICLES, PARTICLE_FLOATS, Particles } from "../../particles.js";
import { BG_WGSL, PART_WGSL, POST_WGSL, WAVE_WGSL } from "./shaders.js";

const ROWS = measured(128);
const COLS = measured(128);
const WAVE_GAIN = design(1.6);
const PARTICLE_REFERENCE_WIDTH = measured(1280);
const WAVE_WIDTH = measured(1440);
const WAVE_HEIGHT = measured(592);
