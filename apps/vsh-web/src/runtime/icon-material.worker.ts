import { design, shadeIcon, verified } from "@vsh/qgl";
import type { IconTextures } from "@vsh/qgl";
import type {
  IconShadeJob,
  IconDraw,
  IconWorkerInput,
  IconWorkerOutput,
} from "./icon-material-job.js";

const CROP_SIZE = verified(128);
const CACHE_BASES = design(4);
let textures: IconTextures | undefined;
const bases = new Map<
  string,
  readonly { readonly id: string; readonly blob: Blob }[]
>();

async function shade(job: IconShadeJob): Promise<void> {
  try {
    if (textures === undefined) throw new Error("Icon textures are not loaded");
    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("Icon output canvas is not available");
    const crop = new OffscreenCanvas(CROP_SIZE, CROP_SIZE);
    const backgroundContext = crop.getContext("2d", { willReadFrequently: true });
    if (backgroundContext === null)
      throw new Error("Icon background canvas is not available");
    let backdrop: OffscreenCanvas | undefined;
    if (job.backdrop !== undefined) {
      backdrop = new OffscreenCanvas(job.backdrop.width, job.backdrop.height);
      const backdropContext = backdrop.getContext("2d", {
        willReadFrequently: true,
      });
      if (backdropContext === null)
        throw new Error("Icon background copy is not available");
      backdropContext.drawImage(job.backdrop, 0, 0);
      const pixels = backdropContext.getImageData(
        0,
        0,
        backdrop.width,
        backdrop.height,
      );
      backdropContext.putImageData(pixels, 0, 0);
    }
    const loaded = textures;
    const render = async (draw: IconDraw): Promise<Blob | undefined> => {
      const normal = loaded.normals[draw.icon];
      if (normal === undefined) return undefined;
      canvas.width = normal.width;
      canvas.height = normal.height;
      const image = context.createImageData(normal.width, normal.height);
      image.data.set(normal.data);
      let material = draw.material;
      if (backdrop !== undefined && draw.crop !== undefined) {
        backgroundContext.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
        backgroundContext.drawImage(
          backdrop,
          draw.crop[0],
          draw.crop[1],
          draw.crop[2],
          draw.crop[2],
          0,
          0,
          CROP_SIZE,
          CROP_SIZE,
        );
        material = {
          ...material,
          background: backgroundContext.getImageData(0, 0, CROP_SIZE, CROP_SIZE),
        };
      }
      shadeIcon(image, loaded.diffuse, loaded.environment, material);
      context.putImageData(image, 0, 0);
      return canvas.convertToBlob({ type: "image/png" });
    };
    let base = job.base === undefined ? undefined : bases.get(job.base.key);
    if (job.base !== undefined && base === undefined) {
      const images: { id: string; blob: Blob }[] = [];
      for (const id of Object.keys(loaded.normals)) {
        const blob = await render({
          id,
          icon: Number(id),
          material: job.base.material,
          crop: job.base.crop,
        });
        if (blob !== undefined) images.push({ id, blob });
      }
      base = images;
      bases.set(job.base.key, base);
      while (bases.size > CACHE_BASES) {
        const key = bases.keys().next().value;
        if (key === undefined) break;
        bases.delete(key);
      }
    }
    const icons: { id: string; blob: Blob }[] = [];
    for (const draw of job.draws) {
      const blob = await render(draw);
      if (blob !== undefined) icons.push({ id: draw.id, blob });
    }
    const response: IconWorkerOutput = {
      type: "ready",
      id: job.id,
      icons,
      ...(base === undefined ? {} : { base }),
    };
    globalThis.postMessage(response);
  } catch (error) {
    const response: IconWorkerOutput = {
      type: "error",
      id: job.id,
      message: error instanceof Error ? error.message : String(error),
    };
    globalThis.postMessage(response);
  } finally {
    job.backdrop?.close();
  }
}

globalThis.addEventListener("message", (event: MessageEvent<IconWorkerInput>) => {
  if (event.data.type === "load") {
    textures = event.data.textures;
    bases.clear();
  } else void shade(event.data);
});
