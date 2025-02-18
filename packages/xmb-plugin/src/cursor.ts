import type { Category, Entry } from "@vsh/explore-plugin";

import { cursorOf } from "./state.js";
import type { State } from "./state.js";

export function listAt(
  cats: readonly Category[],
  state: State,
  depth: number,
): readonly Entry[] {
  const cat = cats[state.category];
  if (cat === undefined) {
    return [];
  }

  let list: readonly Entry[] = cat.entries;

  for (let i = 0; i < depth; i += 1) {
    const next = list[state.levels[i] ?? 0];
    if (next === undefined) {
      return [];
    }
    list = next.entries;
  }

  return list;
}
