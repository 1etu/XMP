import type { Rgb } from "../preset.js";

export type Pair = readonly [number, number];
export type Quad = readonly [number, number, number, number];
export type Curve = readonly [Rgb, Rgb, Rgb];
export type BackgroundSamples = readonly [IconTexture, IconTexture, number];

export interface IconTexture {
  readonly data: Uint8ClampedArray | Float32Array;
  readonly width: number;
  readonly height: number;
}

export interface IconAmbientPalette {
  readonly width: number;
  readonly height: number;
  readonly rgb: readonly Rgb[];
}

export interface IconMaterialState {
  readonly color?: Rgb;
  readonly eye?: Quad;
  readonly background?: IconTexture;
  readonly screen?: Quad;
  readonly pixelSize?: Pair;
  readonly environmentRotation?: number;
  readonly displayGain?: number;
  readonly supersample?: boolean;
}

export interface IconMaterial {
  readonly ambient: Rgb;
  readonly lights: readonly [Rgb, Rgb];
  readonly diffuseGain: number;
  readonly specularGains: Pair;
  readonly specularPowers: Pair;
  readonly environmentGain: number;
  readonly environmentRotation: Pair;
  readonly exposure: number;
  readonly displayGain: number;
  readonly changingColor: Quad;
  readonly refraction: Quad;
  readonly luminance: Curve;
  readonly eye: Quad;
  readonly supersampling: Pair;
  readonly background?: IconTexture;
  readonly backgroundLod: number;
  readonly screen: Quad;
  readonly pixelSize?: Pair;
}

export interface IconTextures {
  readonly normals: Readonly<Record<number, ImageData>>;
  readonly diffuse: ImageData | undefined;
  readonly environment: ImageData | undefined;
}
