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

export function hasSched(p: Preset): boolean {
  const v = p.bg.val;

  return (
    v["night2dayEnd"] !== undefined &&
    v["day2nightBegin"] !== undefined &&
    v["day2nightEnd"] !== undefined
  );
}

export function schedOf(p: Preset): Sched {
  const bg = bgOf(p);

  return {
    night2dayBegin: bg.night2dayBegin,
    night2dayEnd: bg.night2dayEnd,
    day2nightBegin: bg.day2nightBegin,
    day2nightEnd: bg.day2nightEnd,
  };
}

export function hdrOf(p: Preset): Hdr {
  const v = p.hdr.val;

  return {
    enabled: v["enabled"] ?? 0,
    exposure: v["exposure"] ?? 0,
    whiteLevel: v["whiteLevel"] ?? 0,
    glareLevel: v["glareLevel"] ?? 0,
    glareThresh: v["glareThresh"] ?? 0,
    gaussianRadR: v["gaussianRadR"] ?? 0,
    gaussianRadG: v["gaussianRadG"] ?? 0,
    gaussianRadB: v["gaussianRadB"] ?? 0,
    glareSumPow: v["glareSumPow"] ?? 0,
    texSize: v["texSize"] ?? 0,
    texMaxMip: v["texMaxMip"] ?? 0,
    glare: v["glare"] ?? 0,
    glareOnly: v["glareOnly"] ?? 0,
    tonebefore: v["tonebefore"] ?? 0,
    blur: v["blur"] ?? 0,
    dither: v["dither"] ?? 0,
    gamma: v["gamma"] ?? 1,
  };
}

export function lineOf(p: Preset): Line {
  const v = p.line.val;

  return {
    damping: v["damping"] ?? 0,
    length: v["length"] ?? 0,
    tension: v["tension"] ?? 0,
    spacing: v["spacing"] ?? 0,
    thinness: v["thinness"] ?? 0,
    brightness: v["brightness"] ?? 0,
    mipmapBias: v["mipmapBias"] ?? 0,
    fresnel: v["fresnel"] ?? 0,
    falloff: v["falloff"] ?? 0,
    timestep: v["timestep"] ?? 0,
    perturbation: v["perturbation"] ?? 0,
    posX: v["posX"] ?? 0,
    posY: v["posY"] ?? 0,
    posZ: v["posZ"] ?? 0,
    angX: v["angX"] ?? 0,
    angY: v["angY"] ?? 0,
    angZ: v["angZ"] ?? 0,
    angRot: v["angRot"] ?? 0,
    endX: v["endX"] ?? 0,
    endY: v["endY"] ?? 0,
    endZ: v["endZ"] ?? 0,
    ffdScale1X: v["ffdScale1X"] ?? 0,
    ffdScale1Y: v["ffdScale1Y"] ?? 0,
    ffdScale1Z: v["ffdScale1Z"] ?? 0,
    ffdScale2X: v["ffdScale2X"] ?? 0,
    ffdScale2Y: v["ffdScale2Y"] ?? 0,
    ffdScale2Z: v["ffdScale2Z"] ?? 0,
    ffdOffsetX: v["ffdOffsetX"] ?? 0,
    ffdOffsetY: v["ffdOffsetY"] ?? 0,
    ffdOffsetZ: v["ffdOffsetZ"] ?? 0,
    ffdParam1: v["ffdParam1"] ?? 0,
  };
}

export function partOf(p: Preset): Part {
  const v = p.part.val;

  return {
    spinTimeScale: v["spinTimeScale"] ?? 0,
    spotPosX: v["spotPosX"] ?? 0,
    spotPosY: v["spotPosY"] ?? 0,
    spotPosZ: v["spotPosZ"] ?? 0,
    specularPower: v["specularPower"] ?? 0,
    specularCoeff: v["specularCoeff"] ?? 0,
    spotAttnX: v["spotAttnX"] ?? 1,
    spotAttnY: v["spotAttnY"] ?? 0,
    spotAttnZ: v["spotAttnZ"] ?? 0,
    iridescentExp: v["iridescentExp"] ?? 1,
    colorControl: v["colorControl"] ?? 0,
    lambertCoeff: v["lambertCoeff"] ?? 0,
    exposure: v["exposure"] ?? 0,
    fresnel: v["fresnel"] ?? 0,
    nearFocus: v["nearFocus"] ?? 0,
    nearFocusDist: v["nearFocusDist"] ?? 0,
    nearFocusPow: v["nearFocusPow"] ?? 0,
    nearDarkness: v["nearDarkness"] ?? 0,
    nearFuzziness: v["nearFuzziness"] ?? 0,
    farFocus: v["farFocus"] ?? 0,
    farFocusDist: v["farFocusDist"] ?? 0,
    farFocusPow: v["farFocusPow"] ?? 0,
    farDarkness: v["farDarkness"] ?? 0,
    nearAlign: v["nearAlign"] ?? 0,
    sizeAlign: v["sizeAlign"] ?? 0,
    glareP1: v["glareP1"] ?? 0,
    glareP2: v["glareP2"] ?? 0,

    emitVelMin: v["emitVelMin"] ?? 0,
    emitVelMul: v["emitVelMul"] ?? 0,
    emitVelVar: v["emitVelVar"] ?? 0,
    emitVelZscale: v["emitVelZscale"] ?? 0,
    emitConeAngle: v["emitConeAngle"] ?? 0,
    emitNegProb: v["emitNegProb"] ?? 0,
    emitPerFrame: v["emitPerFrame"] ?? 0,
    emitProb: v["emitProb"] ?? 0,
    agingSpeed: v["agingSpeed"] ?? 0,
    agingVariance: v["agingVariance"] ?? 0,
    friction: v["friction"] ?? 0,
    deltaTime: v["deltaTime"] ?? 0,
    gravity: v["gravity"] ?? 0,
    windDirX: v["windDirX"] ?? 0,
    windDirY: v["windDirY"] ?? 0,
    windDirZ: v["windDirZ"] ?? 0,
    windScale: v["windScale"] ?? 0,
    brownianScale: v["brownianScale"] ?? 0,
    globalAlpha: v["globalAlpha"] ?? 0,
    sizeMiddle: v["sizeMiddle"] ?? 0,
    sizeNear: v["sizeNear"] ?? 0,
    sizeFar: v["sizeFar"] ?? 0,
    glare: v["glare"] ?? 0,
    glareScale: v["glareScale"] ?? 0,
  };
}
