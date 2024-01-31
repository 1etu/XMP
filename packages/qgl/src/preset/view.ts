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
