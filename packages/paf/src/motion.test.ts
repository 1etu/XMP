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

const METRICS: Metrics = {
  logical: { wid: 1920, hgt: 1080 },
  frac: {
    focusX: 0.3094,
    categoryPitchX: 0.125,
    categoryIconY: 0.2573,
    categoryLabelY: 0.3257,
    focusItemY: 0.4638,
    itemPitchY: 0.071,
    focusGapY: 0.145,
    focusGapAboveY: 0.363,
    focusIconSize: 0.1065,
    itemLabelX: 0.386,
    infoPanelY: 0.1437,
  },
  design: {
    categoryIconSize: 0.075,
    otherIconScale: 0.62,
    focusLabelScale: 1,
    otherLabelScale: 0.86,
    focusAlpha: 1,
    otherAlpha: 0.55,
    railAlpha: 0.75,
  },
};

function item(id: string) {
  return { id, icon: 0, title: id, info: "" };
}
