import { measured, verified } from "@vsh/resource";

import { OFFSCREEN, clamp01, lerp, nearness, spread } from "./curve.js";
import type { Metrics } from "./metrics.js";
import type { Label, Slot, Snapshot, View } from "./slot.js";

export const SUBMENU_PARENT_SHIFT = measured(0.13671875);
