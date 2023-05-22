import { isClass } from "./class.js";
import type { Class } from "./class.js";

export interface Meta {
  readonly classification: Class;
  readonly source: string;
  readonly sourceHash?: string;
}

export class MetaError extends Error {
  readonly path: string;
  readonly detail: string;

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "ResourceMetaError";
    this.path = path;
    this.detail = detail;
  }
}
