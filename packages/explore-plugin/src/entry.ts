export interface Entry {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly info: string;
  readonly action: string;
  readonly childPos: number;
  readonly entries: readonly Entry[];
}

export interface Category {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly entries: readonly Entry[];
}

export const ACT_NONE = "none";

export function hasChildren(entry: Entry): boolean {
  return entry.entries.length > 0;
}
