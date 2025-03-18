export const ROOT_DEPTH = 1;

export interface State {
  readonly category: number;
  readonly levels: readonly number[];
}

export function initial(): State {
  return { category: 0, levels: [0] };
}
