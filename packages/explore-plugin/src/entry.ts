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

export function walk(entries: readonly Entry[], visit: (entry: Entry, depth: number) => void): void {
  const step = (list: readonly Entry[], depth: number): void => {
    for (const e of list) {
      visit(e, depth);
      step(e.entries, depth + 1);
    }
  };

  step(entries, 0);
}

export function find(entries: readonly Entry[], id: string): Entry | undefined {
  let hit: Entry | undefined;

  walk(entries, (entry) => {
    if (hit === undefined && entry.id === id) {
      hit = entry;
    }
  });

  return hit;
}

export function count(entries: readonly Entry[]): number {
  let n = 0;

  walk(entries, () => {
    n += 1;
  });

  return n;
}
