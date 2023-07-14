import type { Bg, Hdr, Line, Part, Rgb } from "./preset.js";
import type { Lattice } from "./lines/spline.js";

export const QUALITIES = ["static", "low", "standard", "high"] as const;

export type Quality = (typeof QUALITIES)[number];

export interface Viewport {
  readonly wid: number;
  readonly hgt: number;
  readonly dpr: number;
}

export interface Scene {
  readonly corners: readonly Rgb[];
  readonly bg: Bg;
  readonly hdr: Hdr;
  readonly line: Line;
  readonly part: Part;
  readonly daylight: number;
  readonly palette: Uint8Array<ArrayBuffer>;
  readonly linearPalette?: Float32Array<ArrayBuffer>;
  readonly particleSoftness?: number;
  readonly fresLut: Uint8Array<ArrayBuffer>;
  readonly spline: Float32Array<ArrayBuffer>;
  readonly normals: Float32Array<ArrayBuffer>;
  readonly quality: Quality;
  readonly reducedMotion: boolean;
  readonly particleWarmup?: { readonly lattice: Lattice; readonly durationMs: number };
  readonly waveTransfer?: readonly [number, number, number];
  readonly waveGain?: number;
}

export interface QglFrame {
  readonly no: number;
  readonly deltaMs: number;
  readonly elapsedMs: number;
  readonly scene: Scene;
}
