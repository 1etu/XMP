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

async function probe(): Promise<GPUDevice | undefined> {
  const gpu = navigator.gpu as GPU | undefined;

  if (gpu === undefined) {
    return undefined;
  }

  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });

    return adapter === null ? undefined : await adapter.requestDevice();
  } catch {
    return undefined;
  }
}

export async function createBackend(
  canvas: HTMLCanvasElement,
  prefer?: BackendId,
): Promise<QglBackend> {
  if (prefer !== "webgl") {
    const dev = await probe();

    if (dev !== undefined) {
      const gpu = new WebgpuBackend(dev);

      try {
        await gpu.initialize(canvas);

        return gpu;
      } catch {
        dev.destroy();
      }
    }
  }

  const gl = new WebglBackend();
  await gl.initialize(canvas);

  return gl;
}
