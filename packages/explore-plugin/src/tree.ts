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
