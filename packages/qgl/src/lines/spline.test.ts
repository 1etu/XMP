import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { lineOf } from "../preset.js";
import type { Lattice } from "./spline.js";
import type { Line, Preset } from "../preset.js";
import { STEX_H, STEX_W, Spline, evalSpline } from "./spline.js";

const BASE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../resources/qgl/presets/base.json",
);
