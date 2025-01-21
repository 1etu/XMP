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

export function isActionable(entry: Entry): boolean {
  return entry.action !== ACT_NONE || hasChildren(entry);
}

export function seed(childPos: number, n: number): number {
  if (n === 0) {
    return 0;
  }

  return Math.min(Math.max(childPos, 0), n - 1);
}
