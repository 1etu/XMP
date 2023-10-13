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

function luminanceCurve(glass: number): Curve {
  const coefficient = (i: 0 | 1 | 2, j: 0 | 1 | 2, k: 0 | 1 | 2): Rgb => {
    const [x, y] = LUMINANCE_POINTS[i];
    const a = LUMINANCE_POINTS[j][0];
    const b = LUMINANCE_POINTS[k][0];
    return [a, b, (y * glass) / ((x - a) * (x - b))];
  };
  return [coefficient(0, 1, 2), coefficient(1, 0, 2), coefficient(2, 0, 1)];
}
