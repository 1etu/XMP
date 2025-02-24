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

export function list(cats: readonly Category[], state: State): readonly Entry[] {
  return listAt(cats, state, state.levels.length - 1);
}

export function focused(cats: readonly Category[], state: State): Entry | undefined {
  return list(cats, state)[cursorOf(state)];
}

export function parent(cats: readonly Category[], state: State): Entry | undefined {
  const depth = state.levels.length - 1;
  if (depth < 1) {
    return undefined;
  }

  return listAt(cats, state, depth - 1)[state.levels[depth - 1] ?? 0];
}

export function trail(cats: readonly Category[], state: State): readonly Entry[] {
  const out: Entry[] = [];

  for (let depth = 1; depth < state.levels.length; depth += 1) {
    const hit = listAt(cats, state, depth - 1)[state.levels[depth - 1] ?? 0];
    if (hit !== undefined) {
      out.push(hit);
    }
  }

  return out;
}
