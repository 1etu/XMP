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

export function metaOf(path: string, body: unknown): Meta {
  if (typeof body !== "object" || body === null) {
    throw new MetaError(path, "resource is not an object");
  }

  const rec = body as Record<string, unknown>;
  const cls = rec["classification"];
  const src = rec["source"];

  if (typeof cls !== "string" || !isClass(cls)) {
    throw new MetaError(path, `classification ${String(cls)} is not recognised`);
  }
  if (typeof src !== "string" || src.length === 0) {
    throw new MetaError(path, "source is missing");
  }

  const hash = rec["sourceHash"];

  return typeof hash === "string"
    ? { classification: cls, source: src, sourceHash: hash }
    : { classification: cls, source: src };
}
