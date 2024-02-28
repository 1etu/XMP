import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  PRESET_IDS,
  bgOf,
  hasSched,
  hdrOf,
  lerp,
  lineOf,
  mix,
  partOf,
  schedOf,
} from "./preset.js";
import type { Group, Preset } from "./preset.js";

const DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../resources/qgl/presets",
);

function load(id: string): Preset {
  return JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8")) as Preset;
}
