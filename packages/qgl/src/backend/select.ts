import type { QglBackend } from "../frame.js";
import { WebglBackend } from "./webgl/index.js";
import { WebgpuBackend } from "./webgpu/index.js";

export type BackendId = "webgpu" | "webgl";

export function backendIdOf(raw: string | null): BackendId | undefined {
  if (raw === "webgpu" || raw === "gpu") {
    return "webgpu";
  }
  if (raw === "webgl" || raw === "gl" || raw === "webgl2") {
    return "webgl";
  }

  return undefined;
}
