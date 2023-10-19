import { verified } from "@vsh/resource";

import { LOG2_E, REFRACTION_FLOOR } from "./const.js";
import { iconMaterialOf } from "./material.js";
import type { BackgroundSamples, IconMaterial, IconTexture } from "./kind.js";

function sample(image: IconTexture, u: number, v: number, channel: number): number {
  const x = Math.max(0, Math.min(image.width - 1, u * image.width - 0.5));
  const y = Math.max(0, Math.min(image.height - 1, v * image.height - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, image.width - 1);
  const y1 = Math.min(y0 + 1, image.height - 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = image.data[(y0 * image.width + x0) * 4 + channel] ?? 0;
  const b = image.data[(y0 * image.width + x1) * 4 + channel] ?? 0;
  const c = image.data[(y1 * image.width + x0) * 4 + channel] ?? 0;
  const d = image.data[(y1 * image.width + x1) * 4 + channel] ?? 0;
  const value = a + (b - a) * tx + (c + (d - c) * tx - a - (b - a) * tx) * ty;
  return image.data instanceof Float32Array ? value : value / 255;
}
