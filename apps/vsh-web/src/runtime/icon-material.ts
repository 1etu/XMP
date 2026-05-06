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
