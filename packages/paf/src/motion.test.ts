import { describe, expect, it } from "vitest";

import {
  AccelMode,
  CATEGORY_MOVE,
  ITEM_MOVE,
  PhXmShell,
  Scalar,
  Scheduler,
  ease,
} from "./index.js";
import { spread } from "./layout/curve.js";
import { place } from "./layout/place.js";
import type { Metrics } from "./layout/metrics.js";
import type { View } from "./layout/slot.js";

const SAMPLES = [0, 40, 80, 120, 160];
