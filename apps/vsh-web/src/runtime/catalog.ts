import { portfolioCategories, portfolioIcons } from "@vsh/content";
import type { Category, Entry } from "@vsh/explore-plugin";
import type { Metrics } from "@vsh/paf";
import { LUT_W, PRESET_IDS, loadIconTextures } from "@vsh/qgl";
import { prepareIconImages } from "./icon-material.js";
import type {
  Catalog,
  Group,
  IconAmbientPalette,
  IconTextures,
  Lattice,
  PaletteFile,
  Preset,
  PresetId,
} from "@vsh/qgl";

interface Appearance {
  readonly background: readonly (readonly [number, number, number])[];
  readonly waveTint: readonly (readonly [number, number, number])[];
  readonly waveTransfer: readonly [number, number, number];
}

interface StartupAppearance {
  readonly frames: readonly {
    readonly timeMs: number;
    readonly background: readonly (readonly [number, number, number])[];
  }[];
}

const FRES_LUT = "textures/TGA/freslut1.tga";

export interface LutFile {
  readonly luts: Readonly<
    Record<
      string,
      {
        readonly width: number;
        readonly r: readonly number[];
        readonly g: readonly number[];
        readonly b: readonly number[];
      }
    >
  >;
}

export interface Resources {
  readonly cat: Catalog;
  readonly pal: PaletteFile;
  readonly lut: Uint8Array<ArrayBuffer>;
  readonly shell: readonly Category[];
  readonly metrics: Metrics;
  readonly lattice: Lattice;
  readonly appearance: Appearance;
  readonly startup: StartupAppearance;
  readonly icons: Readonly<Record<number, string>>;
  readonly iconTextures: IconTextures | undefined;
  readonly iconPalette: IconAmbientPalette | undefined;
}

export class ResourceError extends Error {
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "ResourceError";
    this.path = path;
  }
}

async function json<T>(path: string, signal: AbortSignal): Promise<T> {
  const url = `${import.meta.env.BASE_URL}${path}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new ResourceError(path, `http ${String(res.status)}`);
  }

  return (await res.json()) as T;
}

async function decodeImage(path: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const image = new Image();
  const cancel = (): void => {
    image.src = "";
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    image.src = path;
    await image.decode();
    signal.throwIfAborted();
  } catch (error) {
    signal.throwIfAborted();
    throw new ResourceError(
      path,
      error instanceof Error ? error.message : "image decode failed",
    );
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}
