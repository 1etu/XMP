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
