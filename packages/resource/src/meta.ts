import { isClass } from "./class.js";
import type { Class } from "./class.js";

export interface Meta {
  readonly classification: Class;
  readonly source: string;
  readonly sourceHash?: string;
}
