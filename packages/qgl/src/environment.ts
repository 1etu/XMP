import { measured } from "@vsh/resource";
import { lerp } from "./preset.js";
import type { Catalog, Preset, PresetId } from "./preset.js";

const SCHEDULE: readonly (readonly [number, PresetId])[] = [
  [measured(0), "night"],
  [measured(1), "night"],
  [measured(5), "yoake"],
  [measured(7), "yoake"],
  [measured(11), "day"],
  [measured(13), "day"],
  [measured(17), "higure"],
  [measured(19), "higure"],
  [measured(23), "night"],
  [measured(24), "night"],
];
