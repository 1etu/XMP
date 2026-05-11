import {
  design,
  iconMaterialOf,
  iconThemeColor,
  shadeLoadedIcons,
  verified,
} from "@vsh/qgl";
import type { IconAmbientPalette, IconTextures, Preset } from "@vsh/qgl";
import type { Snapshot } from "@vsh/paf";
import type {
  IconBase,
  IconDraw,
  IconShadeJob,
  IconWorkerOutput,
} from "./icon-material-job.js";

const VIEW_WIDTH = verified(1920);
const VIEW_HEIGHT = verified(1080);
const CAMERA_HEIGHT = verified(480);
const EYE_OFFSET = verified(400);
const EYE_DEPTH = verified(1200);
const FOCUS_AXIS = verified(0.29453125);
const PORTRAIT_WIDTH = design(720);
const PORTRAIT_AXIS = design(0.24);
const CROP_SIZE = verified(128);
const CACHE_BATCHES = design(8);
const CACHE_BASES = design(4);

type Icons = Readonly<Record<string, string>>;
type ReadyIcons = Extract<IconWorkerOutput, { type: "ready" }>;

interface DecodedBatch {
  readonly icons: Icons;
  readonly images: readonly HTMLImageElement[];
  readonly urls: readonly string[];
}

interface PendingJob {
  readonly key: string;
  readonly baseKey: string;
  readonly job: IconShadeJob;
}

function workerFor(textures: IconTextures): Worker {
  const worker = new Worker(new URL("./icon-material.worker.ts", import.meta.url), {
    type: "module",
    name: "icon-material",
  });
  try {
    worker.postMessage({ type: "load", textures });
  } catch (error) {
    worker.terminate();
    throw error;
  }
  return worker;
}

async function decodedImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function release(batch: DecodedBatch): void {
  for (const url of batch.urls) URL.revokeObjectURL(url);
}

async function decodeBatch(response: ReadyIcons): Promise<DecodedBatch> {
  const urls = response.icons.map((icon) => URL.createObjectURL(icon.blob));
  try {
    const images = await Promise.all(urls.map(decodedImage));
    return {
      icons: Object.fromEntries(
        response.icons.map((icon, index) => [icon.id, urls[index] ?? ""]),
      ),
      images,
      urls,
    };
  } catch (error) {
    for (const url of urls) URL.revokeObjectURL(url);
    throw error;
  }
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Icon PNG encoding returned no URL"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Icon PNG encoding failed"));
    };
    reader.readAsDataURL(blob);
  });
}

async function prepareFallback(
  textures: IconTextures,
  signal: AbortSignal,
): Promise<Readonly<Record<number, string>>> {
  const icons: Record<number, string> = {};
  for (const [key, normal] of Object.entries(textures.normals)) {
    signal.throwIfAborted();
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    const batch = shadeLoadedIcons({ ...textures, normals: { [key]: normal } });
    await Promise.all(Object.values(batch).map(decodedImage));
    Object.assign(icons, batch);
  }
  signal.throwIfAborted();
  return icons;
}

export async function prepareIconImages(
  textures: IconTextures,
  signal: AbortSignal,
): Promise<Readonly<Record<number, string>>> {
  signal.throwIfAborted();
  let worker: Worker | undefined;
  let onAbort: (() => void) | undefined;
  let response: ReadyIcons;
  try {
    worker = workerFor(textures);
    response = await new Promise<ReadyIcons>((resolve, reject) => {
      onAbort = () => {
        reject(new DOMException("Icon preparation was aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      worker?.addEventListener(
        "error",
        (event) => {
          reject(new Error(`Icon worker failed: ${event.message}`));
        },
        { once: true },
      );
      worker?.addEventListener(
        "message",
        (event: MessageEvent<IconWorkerOutput>) => {
          if (event.data.type === "ready") resolve(event.data);
          else reject(new Error(`Icon worker failed: ${event.data.message}`));
        },
        { once: true },
      );
      const draws = Object.keys(textures.normals).map((id) => ({
        id,
        icon: Number(id),
        material: iconMaterialOf(),
      }));
      worker?.postMessage({ type: "shade", id: 0, draws });
    });
  } catch {
    signal.throwIfAborted();
    worker?.terminate();
    return await prepareFallback(textures, signal);
  } finally {
    worker?.terminate();
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
  const entries = await Promise.all(
    response.icons.map(async (icon) => {
      const url = await dataUrl(icon.blob);
      await decodedImage(url);
      return [Number(icon.id), url] as const;
    }),
  );
  signal.throwIfAborted();
  return Object.fromEntries(entries);
}

function shellDraws(
  textures: IconTextures,
  palette: IconAmbientPalette,
  snapshot: Snapshot,
  preset: Preset,
  dayFraction: number,
  monthPosition: number,
  canvas?: HTMLCanvasElement,
): readonly IconDraw[] {
  const color = iconThemeColor(palette, dayFraction, monthPosition);
  const width = Math.max(1, canvas?.clientWidth ?? VIEW_WIDTH);
  const height = Math.max(1, canvas?.clientHeight ?? VIEW_HEIGHT);
  const portrait = width <= height;
  const pixelScale = width / (portrait ? PORTRAIT_WIDTH : VIEW_WIDTH);
  const menuHeight = portrait ? height : VIEW_HEIGHT * pixelScale;
  const axis = width * (portrait ? PORTRAIT_AXIS : FOCUS_AXIS);
  const scale = height / CAMERA_HEIGHT;
  const density = (canvas?.width ?? width) / width;
  return [...snapshot.categories, ...snapshot.items]
    .filter(
      (draw) =>
        draw.alpha > 0 &&
        !draw.id.startsWith("outgoing-") &&
        textures.normals[draw.icon] !== undefined,
    )
    .map((draw) => {
      const x = axis + (draw.x - VIEW_WIDTH * FOCUS_AXIS) * pixelScale;
      const y = (draw.y / VIEW_HEIGHT) * menuHeight;
      const size = draw.size * pixelScale;
      return {
        id: draw.id,
        icon: draw.icon,
        crop: [
          (Math.trunc(x) - CROP_SIZE / 2) * density,
          (Math.trunc(y) - CROP_SIZE / 2) * density,
          CROP_SIZE * density,
        ] as const,
        material: iconMaterialOf(preset.icons?.val, {
          color,
          eye: [
            (width / 2 - x) / scale - EYE_OFFSET,
            (y - height / 2) / scale,
            EYE_DEPTH,
            size / scale,
          ],
          pixelSize: [size, size],
          screen: [
            0.5 - size / (2 * CROP_SIZE),
            0.5 - size / (2 * CROP_SIZE),
            size / CROP_SIZE,
            size / CROP_SIZE,
          ],
        }),
      };
    });
}

function shellBase(
  palette: IconAmbientPalette,
  preset: Preset,
  dayFraction: number,
  monthPosition: number,
  canvas?: HTMLCanvasElement,
): IconBase {
  const color = iconThemeColor(palette, dayFraction, monthPosition);
  const width = Math.max(1, canvas?.clientWidth ?? VIEW_WIDTH);
  const height = Math.max(1, canvas?.clientHeight ?? VIEW_HEIGHT);
  const density = (canvas?.width ?? width) / width;
  return {
    key: JSON.stringify([
      preset.icons?.val,
      color.map((channel) => Math.round(channel * 255)),
      width,
      height,
    ]),
    material: iconMaterialOf(preset.icons?.val, {
      color,
      eye: [-EYE_OFFSET, 0, EYE_DEPTH, (CROP_SIZE * CAMERA_HEIGHT) / height],
      pixelSize: [CROP_SIZE, CROP_SIZE],
    }),
    crop: [
      (width / 2 - CROP_SIZE / 2) * density,
      (height / 2 - CROP_SIZE / 2) * density,
      CROP_SIZE * density,
    ],
  };
}
