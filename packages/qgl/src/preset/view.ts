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
