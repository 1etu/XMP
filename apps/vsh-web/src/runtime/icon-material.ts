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

export class IconMaterials {
  readonly #textures: IconTextures;
  readonly #palette: IconAmbientPalette;
  readonly #publish: (icons: Icons) => void;
  readonly #reportError: (error: Error) => void;
  readonly #cache = new Map<string, DecodedBatch>();
  readonly #bases = new Map<string, DecodedBatch>();
  #retained = new Set<string>();
  readonly #held = new Map<string, HTMLImageElement>();
  #worker: Worker | undefined;
  #pending: PendingJob | undefined;
  #running: PendingJob | undefined;
  #generation = 0;
  #requestedKey: string | undefined;
  #disposed = false;

  constructor(
    textures: IconTextures,
    palette: IconAmbientPalette,
    publish: (icons: Icons) => void,
    reportError: (error: Error) => void,
  ) {
    this.#textures = textures;
    this.#palette = palette;
    this.#publish = publish;
    this.#reportError = reportError;
    try {
      this.#worker = workerFor(textures);
      this.#worker.addEventListener(
        "message",
        (event: MessageEvent<IconWorkerOutput>) => {
          void this.#receive(event.data);
        },
      );
      this.#worker.addEventListener("error", (event) => {
        this.#fail(new Error(`Icon worker failed: ${event.message}`));
      });
    } catch (error) {
      this.#fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  get available(): boolean {
    return !this.#disposed && this.#worker !== undefined;
  }

  request(
    key: string,
    snapshot: Snapshot,
    preset: Preset,
    dayFraction: number,
    monthPosition: number,
    canvas?: HTMLCanvasElement,
  ): void {
    const base = shellBase(this.#palette, preset, dayFraction, monthPosition, canvas);
    key = `${key}:${base.key}:${String(canvas?.width ?? VIEW_WIDTH)}x${String(canvas?.height ?? VIEW_HEIGHT)}`;
    if (this.#disposed || this.#worker === undefined || key === this.#requestedKey)
      return;
    this.invalidate();
    this.#requestedKey = key;
    const cached = this.#cache.get(key);
    const cachedBase = this.#bases.get(base.key);
    if (cached !== undefined && cachedBase !== undefined) {
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      this.#bases.delete(base.key);
      this.#bases.set(base.key, cachedBase);
      this.#publish({ ...cachedBase.icons, ...cached.icons });
      return;
    }
    const id = this.#generation;
    const draws = shellDraws(
      this.#textures,
      this.#palette,
      snapshot,
      preset,
      dayFraction,
      monthPosition,
      canvas,
    );
    void this.#capture(key, id, draws, base, canvas);
  }

  async #capture(
    key: string,
    id: number,
    draws: readonly IconDraw[],
    base: IconBase,
    canvas?: HTMLCanvasElement,
  ): Promise<void> {
    let backdrop: ImageBitmap | undefined;
    try {
      if (canvas !== undefined) backdrop = await createImageBitmap(canvas);
      if (this.#disposed || id !== this.#generation) {
        backdrop?.close();
        return;
      }
      this.#pending = {
        key,
        baseKey: base.key,
        job: {
          type: "shade",
          id,
          draws,
          ...(this.#bases.has(base.key) ? {} : { base }),
          ...(backdrop === undefined ? {} : { backdrop }),
        },
      };
      this.#flush();
    } catch (error) {
      backdrop?.close();
      if (!this.#disposed && id === this.#generation)
        this.#reportError(
          new Error("Icon background capture failed", { cause: error }),
        );
    }
  }

  #flush(): void {
    if (
      this.#running !== undefined ||
      this.#pending === undefined ||
      this.#worker === undefined
    )
      return;
    this.#running = this.#pending;
    this.#pending = undefined;
    const job = this.#running.job;
    try {
      this.#worker.postMessage(job, job.backdrop === undefined ? [] : [job.backdrop]);
    } catch (error) {
      job.backdrop?.close();
      this.#running = undefined;
      this.#fail(new Error("Icon worker submission failed", { cause: error }));
    }
  }

  async #receive(response: IconWorkerOutput): Promise<void> {
    const running = this.#running;
    if (running === undefined || running.job.id !== response.id) return;
    try {
      if (response.type === "error") {
        this.#fail(new Error(`Icon worker failed: ${response.message}`));
        return;
      }
      if (!this.#current(response.id)) return;
      let base = this.#bases.get(running.baseKey);
      if (base === undefined) {
        if (response.base === undefined)
          throw new Error("The icon worker did not return the theme base images");
        base = await decodeBatch({ ...response, icons: response.base });
        if (!this.#current(response.id)) {
          this.#release(base);
          return;
        }
        this.#bases.set(running.baseKey, base);
        while (this.#bases.size > CACHE_BASES) {
          const oldest = this.#bases.entries().next().value;
          if (oldest === undefined) break;
          this.#bases.delete(oldest[0]);
          this.#release(oldest[1]);
        }
      }
      const batch = await decodeBatch(response);
      if (!this.#current(response.id)) {
        this.#release(batch);
        return;
      }
      this.#cache.set(running.key, batch);
      this.#publish({ ...base.icons, ...batch.icons });
      while (this.#cache.size > CACHE_BATCHES) {
        const oldest = this.#cache.entries().next().value;
        if (oldest === undefined) break;
        this.#cache.delete(oldest[0]);
        this.#release(oldest[1]);
      }
    } catch (error) {
      if (!this.#disposed)
        this.#reportError(new Error("Icon image decode failed", { cause: error }));
    } finally {
      this.#running = undefined;
      this.#flush();
    }
  }

  invalidate(): void {
    this.#generation += 1;
    this.#requestedKey = undefined;
    this.#pending?.job.backdrop?.close();
    this.#pending = undefined;
  }

  retain(urls: Iterable<string>): void {
    this.#retained = new Set(urls);
    for (const [url] of this.#held) {
      if (this.#retained.has(url)) continue;
      this.#held.delete(url);
      URL.revokeObjectURL(url);
    }
  }

  #release(batch: DecodedBatch): void {
    for (let index = 0; index < batch.urls.length; index += 1) {
      const url = batch.urls[index];
      const image = batch.images[index];
      if (url === undefined) continue;
      if (this.#retained.has(url) && image !== undefined) this.#held.set(url, image);
      else URL.revokeObjectURL(url);
    }
  }

  #current(id: number): boolean {
    return !this.#disposed && id === this.#generation;
  }

  #fail(error: Error): void {
    if (this.#disposed) return;
    this.invalidate();
    this.#worker?.terminate();
    this.#worker = undefined;
    this.#reportError(error);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.invalidate();
    this.#worker?.terminate();
    this.#worker = undefined;
    for (const batch of this.#cache.values()) release(batch);
    this.#cache.clear();
    for (const batch of this.#bases.values()) release(batch);
    this.#bases.clear();
    for (const url of this.#held.keys()) URL.revokeObjectURL(url);
    this.#held.clear();
    this.#retained.clear();
  }
}
