import type { QglBackend } from "../frame.js";
import { WebglBackend } from "./webgl/index.js";
import { WebgpuBackend } from "./webgpu/index.js";

export type BackendId = "webgpu" | "webgl";
