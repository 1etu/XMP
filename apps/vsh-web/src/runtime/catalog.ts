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

export async function loadResources(signal: AbortSignal): Promise<Resources> {
  const presets = await Promise.all(
    PRESET_IDS.map(async (id) => {
      const p = await json<Preset>(`qgl/presets/${id}.json`, signal);
      const icons = await json<Group>(`qgl/icons/${id}.json`, signal);
      return [id, { ...p, icons }] as const;
    }),
  );

  const pal = await json<PaletteFile>("qgl/month-palette.json", signal);
  const lutFile = await json<LutFile>("qgl/fres-lut.json", signal);

  const src = lutFile.luts[FRES_LUT];

  if (src === undefined) {
    throw new ResourceError("qgl/fres-lut.json", `missing ${FRES_LUT}`);
  }

  const lut = new Uint8Array(LUT_W * 4);
  for (let i = 0; i < LUT_W; i += 1) {
    const o = i * 4;
    lut[o] = src.r[i] ?? 0;
    lut[o + 1] = src.g[i] ?? 0;
    lut[o + 2] = src.b[i] ?? 0;
    lut[o + 3] = 255;
  }

  const metrics = await json<Metrics>("xmb/layout.json", signal);
  const lattice = await json<Lattice>("qgl/wave-lattice.json", signal);
  const appearance = await json<Appearance>("qgl/reference-appearance.json", signal);
  const startup = await json<StartupAppearance>("qgl/startup-appearance.json", signal);

  const cat = Object.fromEntries(presets) as Record<PresetId, Preset>;
  const shell = portfolioCategories();
  const ids = new Set<number>(shell.map((category) => category.icon));
  const collect = (entries: readonly Entry[]): void => {
    for (const entry of entries) {
      if (entry.icon > 0) ids.add(entry.icon);
      collect(entry.entries);
    }
  };
  for (const category of shell) collect(category.entries);
  const iconTextures = await loadIconTextures(
    [...ids].filter((id) => id <= 70),
    "/xmb/icons/",
    signal,
  );
  const iconPalette = await json<IconAmbientPalette>(
    "qgl/icons/ambient-palette.json",
    signal,
  );
  const icons = await prepareIconImages(iconTextures, signal);
  const portfolioImages = new Set(Object.values(portfolioIcons()));
  await Promise.all(
    [...portfolioImages].map((path) =>
      decodeImage(path, signal).catch(() => {
        signal.throwIfAborted();
      }),
    ),
  );
  if (import.meta.env.DEV) {
    await import("../originals.css");
    await Promise.all(
      [
        '300 32px "SCE-PS3 Rodin LATIN"',
        '400 32px "SCE-PS3 Rodin LATIN"',
        '700 32px "SCE-PS3 Rodin LATIN"',
        '400 32px "SCE-PS3 Seurat LATIN"',
        '400 32px "SCE-PS3 VAGRundschrift LATIN"',
      ].map((font) => document.fonts.load(font)),
    );
    await Promise.all(
      [
        "/original/boot/new_logo.png",
        "/original/icon/folder.png",
        "/original/indicator/plus.png",
        "/original/indicator/friend.png",
        "/original/boot/new_logo_blur.png",
        "/original/boot/new_logo_footer.png",
        "/original/indicator/frame.png",
        "/original/system/optionmenu-bg.png",
        "/original/system/optionmenu-base.png",
        "/original/system/optionmenu-line.png",
        "/original/system/arrow-left.png",
        "/original/system/circle.png",
        "/original/system/cross.png",
        "/original/system/line.png",
        "/original/system/triangle.png",
        "/original/profile/card-bg.png",
        "/original/profile/balloon.png",
        "/original/profile/presence.png",
        "/original/profile/button.png",
        "/original/profile/l1.png",
        "/original/profile/r1.png",
        "/original/icon/information-board.png",
        "/original/whats-new/network.png",
        ...[
          "icon",
          "tex_bg",
          "tex_exbase_pickup",
          "tex_exbase_played",
          "tex_channel_base",
          "tex_channel_focus",
          "tex_channel_bg",
          "tex_text_bg",
          "tex_channel_timeout",
          "tex_new_ws",
          "tex_go_web",
          "tex_go_video",
          "tex_loading_icon",
        ].map((name) => `/original/whats-new/${name}.png`),
        "/original/browser/pointer-arrow.png",
        "/original/browser/pointer-finger.png",
        ...[
          "topbar",
          "topbaricon",
          "view",
          "tool",
          "tab",
          "search",
          "file",
          "back",
          "forward",
          "reload",
          "home",
          "bookmark",
          "history",
          "quit",
        ].map((name) => `/original/browser/tex_${name}.png`),
      ].map((path) =>
        decodeImage(path, signal).catch(() => {
          signal.throwIfAborted();
        }),
      ),
    );
  }

  return {
    cat,
    pal,
    lut,
    shell,
    metrics,
    lattice,
    appearance,
    startup,
    icons: {
      ...icons,
      ...portfolioIcons(),
    },
    iconTextures,
    iconPalette,
  };
}
