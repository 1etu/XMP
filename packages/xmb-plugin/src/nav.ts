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

export type Dir = (typeof DIRS)[number];

export const EFFECTS = [
  "none",
  "cursor",
  "category",
  "decide",
  "cancel",
  "reject",
] as const;

export type Effect = (typeof EFFECTS)[number];

export interface Step {
  readonly state: State;
  readonly effect: Effect;
}

function reject(state: State): Step {
  return { state, effect: "reject" };
}
