import type { Preset } from "./kind.js";

export interface Bg {
  readonly fovy: number;
  readonly colourShader: number;
  readonly nightBlend: number;
  readonly night2dayBegin: number;
  readonly night2dayEnd: number;
  readonly day2nightBegin: number;
  readonly day2nightEnd: number;
  readonly dayspread: number;
  readonly nightWhitBias: number;
}

export interface Hdr {
  readonly enabled: number;
  readonly exposure: number;
  readonly whiteLevel: number;
  readonly glareLevel: number;
  readonly glareThresh: number;
  readonly gaussianRadR: number;
  readonly gaussianRadG: number;
  readonly gaussianRadB: number;
  readonly glareSumPow: number;
  readonly texSize: number;
  readonly texMaxMip: number;
  readonly glare: number;
  readonly glareOnly: number;
  readonly tonebefore: number;
  readonly blur: number;
  readonly dither: number;
  readonly gamma: number;
}

export interface Line {
  readonly damping: number;
  readonly length: number;
  readonly tension: number;
  readonly spacing: number;
  readonly thinness: number;
  readonly brightness: number;
  readonly mipmapBias: number;
  readonly fresnel: number;
  readonly falloff: number;
  readonly timestep: number;
  readonly perturbation: number;
  readonly posX: number;
  readonly posY: number;
  readonly posZ: number;
  readonly angX: number;
  readonly angY: number;
  readonly angZ: number;
  readonly angRot: number;
  readonly endX: number;
  readonly endY: number;
  readonly endZ: number;
  readonly ffdScale1X: number;
  readonly ffdScale1Y: number;
  readonly ffdScale1Z: number;
  readonly ffdScale2X: number;
  readonly ffdScale2Y: number;
  readonly ffdScale2Z: number;
  readonly ffdOffsetX: number;
  readonly ffdOffsetY: number;
  readonly ffdOffsetZ: number;
  readonly ffdParam1: number;
}

export interface Part {
  readonly spinTimeScale: number;
  readonly spotPosX: number;
  readonly spotPosY: number;
  readonly spotPosZ: number;
  readonly specularPower: number;
  readonly specularCoeff: number;
  readonly spotAttnX: number;
  readonly spotAttnY: number;
  readonly spotAttnZ: number;
  readonly iridescentExp: number;
  readonly colorControl: number;
  readonly lambertCoeff: number;
  readonly exposure: number;
  readonly fresnel: number;
  readonly nearFocus: number;
  readonly nearFocusDist: number;
  readonly nearFocusPow: number;
  readonly nearDarkness: number;
  readonly nearFuzziness: number;
  readonly farFocus: number;
  readonly farFocusDist: number;
  readonly farFocusPow: number;
  readonly farDarkness: number;
  readonly nearAlign: number;
  readonly sizeAlign: number;
  readonly glareP1: number;
  readonly glareP2: number;

  readonly emitVelMin: number;
  readonly emitVelMul: number;
  readonly emitVelVar: number;
  readonly emitVelZscale: number;
  readonly emitConeAngle: number;
  readonly emitNegProb: number;
  readonly emitPerFrame: number;
  readonly emitProb: number;
  readonly agingSpeed: number;
  readonly agingVariance: number;
  readonly friction: number;
  readonly deltaTime: number;
  readonly gravity: number;
  readonly windDirX: number;
  readonly windDirY: number;
  readonly windDirZ: number;
  readonly windScale: number;
  readonly brownianScale: number;
  readonly globalAlpha: number;
  readonly sizeMiddle: number;
  readonly sizeNear: number;
  readonly sizeFar: number;
  readonly glare: number;
  readonly glareScale: number;
}

export interface Sched {
  readonly night2dayBegin: number;
  readonly night2dayEnd: number;
  readonly day2nightBegin: number;
  readonly day2nightEnd: number;
}

export function bgOf(p: Preset): Bg {
  const v = p.bg.val;

  return {
    fovy: v["fovy"] ?? 0,
    colourShader: v["colourShader"] ?? 0,
    nightBlend: v["nightBlend"] ?? 0,
    night2dayBegin: v["night2dayBegin"] ?? 0,
    night2dayEnd: v["night2dayEnd"] ?? 0,
    day2nightBegin: v["day2nightBegin"] ?? 0,
    day2nightEnd: v["day2nightEnd"] ?? 0,
    dayspread: v["dayspread"] ?? 0,
    nightWhitBias: v["nightWhitBias"] ?? 0,
  };
}
