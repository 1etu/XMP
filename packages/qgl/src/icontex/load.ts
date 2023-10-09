import { texture } from "./image.js";
import type { IconMaterial, IconTextures } from "./kind.js";
import { iconMaterialOf } from "./material.js";
import { shadeIcon } from "./shade.js";

export async function loadIconTextures(
  ids: readonly number[],
  base: string,
  signal: AbortSignal,
): Promise<IconTextures> {
  const [diffuse, environment, entries] = await Promise.all([
    texture(`${base}dif.png`, signal),
    texture(`${base}env.png`, signal),
    Promise.all(
      ids.map(
        async (id) =>
          [
            id,
            await texture(`${base}${String(id).padStart(2, "0")}.png`, signal),
          ] as const,
      ),
    ),
  ]);
  const normals: Record<number, ImageData> = {};
  for (const [id, normal] of entries) if (normal !== undefined) normals[id] = normal;
  return { normals, diffuse, environment };
}

export function shadeLoadedIcons(
  textures: IconTextures,
  material: IconMaterial | ((id: number) => IconMaterial) = iconMaterialOf(),
): Readonly<Record<number, string>> {
  const entries = Object.entries(textures.normals).map(([key, normal]) => {
    const id = Number(key);
    const canvas = document.createElement("canvas");
    canvas.width = normal.width;
    canvas.height = normal.height;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return [id, ""] as const;
    const image = ctx.createImageData(normal.width, normal.height);
    image.data.set(normal.data);
    shadeIcon(
      image,
      textures.diffuse,
      textures.environment,
      typeof material === "function" ? material(id) : material,
    );
    ctx.putImageData(image, 0, 0);
    return [id, canvas.toDataURL("image/png")] as const;
  });
  return Object.fromEntries(entries);
}
