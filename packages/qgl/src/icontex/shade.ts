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

function sampleBackground(
  images: BackgroundSamples,
  u: number,
  v: number,
  channel: number,
): number {
  const a = sample(images[0], u, v, channel);
  if (images[2] === 0) return a;
  return a + (sample(images[1], u, v, channel) - a) * images[2];
}

function fragment(
  normal: IconTexture,
  diffuse: IconTexture | undefined,
  environment: IconTexture | undefined,
  material: IconMaterial,
  background: BackgroundSamples | undefined,
  u: number,
  v: number,
  screenU: number,
  screenV: number,
  out: Float64Array,
): void {
  const alpha = sample(normal, u, v, 3);
  out[3] = alpha;
  if (alpha === 0) {
    out[0] = out[1] = out[2] = 0;
    return;
  }
  const nx = sample(normal, u, v, 0) * 2 - 1;
  const ny = sample(normal, u, v, 1) * 2 - 1;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const ex = material.eye[0] - (u - 0.5) * material.eye[3];
  const ey = material.eye[1] - (v - 0.5) * material.eye[3];
  const ez = material.eye[2];
  const el = Math.hypot(ex, ey, ez);
  const vx = ex / el;
  const vy = ey / el;
  const vz = ez / el;
  const qx = (u - 0.5) * 2;
  const qy = (v - 0.5) * 2;
  const dx = qx * 2 ** (-2 * Math.abs(qx) * LOG2_E) + nx * nz;
  const dy = qy * 2 ** (-2 * Math.abs(qy) * LOG2_E) + ny * nz;
  const weight =
    REFRACTION_FLOOR + (1 - REFRACTION_FLOOR) * nz ** (material.refraction[3] * 10);
  for (let k = 0; k < 3; k += 1) {
    const displacement = material.refraction[k] ?? 0;
    const refracted =
      background === undefined
        ? 0
        : sampleBackground(
            background,
            screenU + dx * displacement,
            screenV + dy * displacement,
            k,
          );
    out[k] = 1 + (refracted - 1) * weight;
  }
  const red = out[0] ?? 0;
  const green = out[1] ?? 0;
  const blue = out[2] ?? 0;
  const y =
    verified(0.299072265625) * red +
    verified(0.5869140625) * green +
    verified(0.114013671875) * blue;
  const cb =
    verified(-0.1689453125) * red + verified(-0.3310546875) * green + 0.5 * blue;
  const cr =
    0.5 * red + verified(-0.4189453125) * green + verified(-0.08099365234375) * blue;
  let remapped = y;
  for (const curve of material.luminance)
    remapped += (y - curve[0]) * (y - curve[1]) * curve[2];
  out[0] = remapped + verified(1.40234375) * cr;
  out[1] = remapped - verified(0.343994140625) * cb - verified(0.7138671875) * cr;
  out[2] = remapped + verified(1.7724609375) * cb;
  let lambert = 0;
  let specular = 0;
  for (let k = 0; k < 2; k += 1) {
    const light = material.lights[k];
    if (light === undefined) continue;
    const nl = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
    lambert += nl;
    if (nl === 0) continue;
    const hx = vx + light[0];
    const hy = vy + light[1];
    const hz = vz + light[2];
    const nh = Math.max(0, (nx * hx + ny * hy + nz * hz) / Math.hypot(hx, hy, hz));
    specular +=
      nh ** (material.specularPowers[k] ?? 0) * (material.specularGains[k] ?? 0);
  }
  const facing = 2 * (nx * vx + ny * vy + nz * vz);
  const rx = vx - nx * facing;
  const ry = vy - ny * facing;
  const rz = vz - nz * facing;
  const [c, s] = material.environmentRotation;
  const eu = 0.5 + 0.5 * (-rx * c + ry * s);
  const ev = 0.5 + 0.5 * (-rx * s - ry * c);
  const reflectedGain = Math.max(0, Math.min(1, -rz)) * material.environmentGain;
  for (let k = 0; k < 3; k += 1) {
    const albedo = diffuse === undefined ? 1 : sample(diffuse, u, v, k);
    const reflected = environment === undefined ? 0 : sample(environment, eu, ev, k);
    const body =
      (out[k] ?? 0) *
      ((material.ambient[k] ?? 0) + albedo * lambert * material.diffuseGain);
    const changing = material.changingColor[k] ?? 0;
    const linear =
      body +
      (changing - body) * material.changingColor[3] +
      specular +
      reflected * reflectedGain;
    out[k] = material.displayGain * (1 - 2 ** (-linear * material.exposure * LOG2_E));
  }
}
