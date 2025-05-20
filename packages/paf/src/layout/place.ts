import { measured, verified } from "@vsh/resource";

import { OFFSCREEN, clamp01, lerp, nearness, spread } from "./curve.js";
import type { Metrics } from "./metrics.js";
import type { Label, Slot, Snapshot, View } from "./slot.js";

export const SUBMENU_PARENT_SHIFT = measured(0.13671875);

const SUBMENU_GAP = measured(0.1833333333);
const SUBMENU_ICON_SHIFT = measured(0.00625);
const SUBMENU_ICON_SCALE = measured(0.44);
const SUBMENU_LABEL_X = measured(0.3385416667);