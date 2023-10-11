import { measured, verified } from "@vsh/resource";

import type { Rgb } from "../preset.js";
import { DEFAULT_COLOR, DEFAULT_EYE, LUMINANCE_POINTS } from "./const.js";
import type {
  Curve,
  IconAmbientPalette,
  IconMaterial,
  IconMaterialState,
} from "./kind.js";

function light(x: number, z: number): Rgb {
  const a = (x * Math.PI) / 180;
  const b = (z * Math.PI) / 180;
  return [Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b)];
}
