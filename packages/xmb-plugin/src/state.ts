export const ROOT_DEPTH = 1;

export interface State {
  readonly category: number;
  readonly levels: readonly number[];
}

export function initial(): State {
  return { category: 0, levels: [0] };
}

export function depthOf(state: State): number {
  return state.levels.length - ROOT_DEPTH;
}

export function cursorOf(state: State): number {
  return state.levels[state.levels.length - 1] ?? 0;
}

export function isRoot(state: State): boolean {
  return state.levels.length <= ROOT_DEPTH;
}

export function withCursor(state: State, index: number): State {
  const levels = [...state.levels];
  levels[levels.length - 1] = index;

  return { category: state.category, levels };
}

export function withCategory(category: number): State {
  return { category, levels: [0] };
}

export function pushed(state: State, index: number): State {
  return { category: state.category, levels: [...state.levels, index] };
}

export function popped(state: State): State {
  return { category: state.category, levels: state.levels.slice(0, -1) };
}

export function same(a: State, b: State): boolean {
  return (
    a.category === b.category &&
    a.levels.length === b.levels.length &&
    a.levels.every((v, i) => v === b.levels[i])
  );
}

export function clamp(v: number, n: number): number {
  if (n === 0) {
    return 0;
  }

  return v < 0 ? 0 : v > n - 1 ? n - 1 : v;
}
