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
