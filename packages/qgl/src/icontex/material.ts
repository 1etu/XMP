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

export function iconMaterialOf(
  values: Readonly<Record<string, number>> = {},
  state: IconMaterialState = {},
): IconMaterial {
  const rotation =
    state.environmentRotation ?? measured(Math.atan2(0.4974066, 0.86751747));
  const refractionScale = values.refrScl ?? measured(11.5655);
  const color = state.color ?? DEFAULT_COLOR;
  return {
    ambient: [
      values.ambR ?? measured(1.05025),
      values.ambG ?? measured(1.05025),
      values.ambB ?? measured(1.05025),
    ],
    lights: [
      light(values.lit1AngX ?? measured(92.4901), values.lit1AngZ ?? measured(22.4976)),
      light(values.lit2AngX ?? measured(84.9909), values.lit2AngZ ?? measured(282.47)),
    ],
    diffuseGain: values.attnDiff ?? measured(3.12367),
    specularGains: [
      values.attnSpec1 ?? measured(0.484729),
      values.attnSpec2 ?? measured(2.45394),
    ],
    specularPowers: [
      values.spec1Pow ?? measured(44.8563),
      values.spec2Pow ?? measured(74.1114),
    ],
    environmentGain: values.attnEnv ?? measured(0.107345),
    environmentRotation: [Math.cos(rotation), Math.sin(rotation)],
    exposure: values.expose ?? measured(1.1574),
    displayGain: state.displayGain ?? measured(0.8),
    changingColor: [
      color[0],
      color[1],
      color[2],
      values.timeColorMix ?? measured(0.61799),
    ],
    refraction: [
      (values.refrR ?? measured(-0.032)) * refractionScale,
      (values.refrG ?? measured(-0.038)) * refractionScale,
      (values.refrB ?? measured(-0.048)) * refractionScale,
      values.refrTweak ?? measured(0.0416622),
    ],
    luminance: luminanceCurve(values.glass ?? measured(0.0624733)),
    eye: state.eye ?? DEFAULT_EYE,
    supersampling: [
      state.supersample === false ? 0 : (values.multiSamp ?? measured(0.5)),
      ((values.multiRot ?? measured(30)) * verified(3.142)) / 180,
    ],
    ...(state.background === undefined ? {} : { background: state.background }),
    backgroundLod: Math.floor((values.refrBlur ?? measured(0.12)) * 256) / 256,
    screen: state.screen ?? [0, 0, 1, 1],
    ...(state.pixelSize === undefined ? {} : { pixelSize: state.pixelSize }),
  };
}
