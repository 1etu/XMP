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
