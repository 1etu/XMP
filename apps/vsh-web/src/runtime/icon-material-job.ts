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
