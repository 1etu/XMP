import { hasChildren } from "@vsh/explore-plugin";
import type { Category } from "@vsh/explore-plugin";

import { focused, list } from "./cursor.js";
import {
  clamp,
  cursorOf,
  isRoot,
  popped,
  pushed,
  withCategory,
  withCursor,
} from "./state.js";
import type { State } from "./state.js";

export const DIRS = ["up", "down", "left", "right"] as const;
