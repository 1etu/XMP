import { seed } from "./entry.js";
import type { Category, Entry } from "./entry.js";
import { TreeError } from "./error.js";
import { strings } from "./strings.js";
import type { StringsFile } from "./strings.js";

export interface RawEntry {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly info: string;
  readonly action: string;
  readonly childPos: number;
  readonly items: readonly RawEntry[];
}

export interface RawCategory {
  readonly id: string;
  readonly icon: number;
  readonly title: string;
  readonly items: readonly RawEntry[];
}

export interface TreeFile {
  readonly categories: readonly RawCategory[];
}

export function build(tree: TreeFile, file: StringsFile): Category[] {
  if (tree.categories.length === 0) {
    throw new TreeError("tree has no categories");
  }

  const str = strings(file);

  const entry = (raw: RawEntry): Entry => {
    const entries = raw.items.map(entry);

    return {
      id: raw.id,
      icon: raw.icon,
      title: str.of(raw.title),
      info: str.of(raw.info),
      action: raw.action,
      childPos: seed(raw.childPos, entries.length),
      entries,
    };
  };

  return tree.categories.map((c) => ({
    id: c.id,
    icon: c.icon,
    title: str.of(c.title),
    entries: c.items.map(entry),
  }));
}
