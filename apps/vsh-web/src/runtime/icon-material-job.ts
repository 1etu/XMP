import type { IconMaterial, IconTextures } from "@vsh/qgl";

export interface IconDraw {
  readonly id: string;
  readonly icon: number;
  readonly material: IconMaterial;
  readonly crop?: readonly [number, number, number];
}
