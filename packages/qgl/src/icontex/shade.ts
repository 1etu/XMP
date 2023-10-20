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

function backgroundSamples(material: IconMaterial): BackgroundSamples | undefined {
  if (material.background === undefined) return undefined;
  let lower = material.background;
  let upper = lower;
  const maxLevel = Math.floor(Math.log2(Math.max(lower.width, lower.height)));
  const lod = Math.max(0, Math.min(maxLevel, material.backgroundLod));
  for (let level = 1; level <= Math.ceil(lod); level += 1) {
    const width = Math.max(1, Math.floor(upper.width / 2));
    const height = Math.max(1, Math.floor(upper.height / 2));
    const data = new Float32Array(width * height * 4);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1)
        for (let channel = 0; channel < 4; channel += 1)
          data[(y * width + x) * 4 + channel] = sample(
            upper,
            (x + 0.5) / width,
            (y + 0.5) / height,
            channel,
          );
    lower = upper;
    upper = { data, width, height };
  }
  if (lod === Math.floor(lod)) lower = upper;
  return [lower, upper, lod - Math.floor(lod)];
}
