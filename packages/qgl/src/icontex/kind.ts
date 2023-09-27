import type { Rgb } from "../preset.js";

export type Pair = readonly [number, number];
export type Quad = readonly [number, number, number, number];
export type Curve = readonly [Rgb, Rgb, Rgb];
export type BackgroundSamples = readonly [IconTexture, IconTexture, number];
