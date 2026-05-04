import {
  design,
  iconMaterialOf,
  iconThemeColor,
  shadeLoadedIcons,
  verified,
} from "@vsh/qgl";
import type { IconAmbientPalette, IconTextures, Preset } from "@vsh/qgl";
import type { Snapshot } from "@vsh/paf";
import type {
  IconBase,
  IconDraw,
  IconShadeJob,
  IconWorkerOutput,
} from "./icon-material-job.js";

const VIEW_WIDTH = verified(1920);
const VIEW_HEIGHT = verified(1080);
const CAMERA_HEIGHT = verified(480);
const EYE_OFFSET = verified(400);
const EYE_DEPTH = verified(1200);
const FOCUS_AXIS = verified(0.29453125);
const PORTRAIT_WIDTH = design(720);
const PORTRAIT_AXIS = design(0.24);