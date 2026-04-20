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
