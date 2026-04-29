import type { IconMaterial, IconTextures } from "@vsh/qgl";

export interface IconDraw {
  readonly id: string;
  readonly icon: number;
  readonly material: IconMaterial;
  readonly crop?: readonly [number, number, number];
}

export interface IconBase {
  readonly key: string;
  readonly material: IconMaterial;
  readonly crop: readonly [number, number, number];
}

export interface IconShadeJob {
  readonly type: "shade";
  readonly id: number;
  readonly draws: readonly IconDraw[];
  readonly backdrop?: ImageBitmap;
  readonly base?: IconBase;
}

export type IconWorkerInput =
  { readonly type: "load"; readonly textures: IconTextures } | IconShadeJob;
