import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "@vsh/paf";
import type { IconTextures, Preset } from "@vsh/qgl";
import { IconMaterials } from "./icon-material.js";
import type { IconWorkerInput, IconWorkerOutput } from "./icon-material-job.js";

class MaterialWorker extends EventTarget {
  static instances: MaterialWorker[] = [];
  readonly messages: IconWorkerInput[] = [];
  terminated = false;

  constructor() {
    super();
    MaterialWorker.instances.push(this);
  }

  postMessage(message: IconWorkerInput): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  complete(id: number, ids = ["first"], base = [] as string[]): void {
    const data: IconWorkerOutput = {
      type: "ready",
      id,
      icons: ids.map((name) => ({ id: name, blob: new Blob([name]) })),
      base: base.map((name) => ({ id: name, blob: new Blob([name]) })),
    };
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

class MaterialImage {
  static pending: (() => void)[] = [];
  src = "";

  decode(): Promise<void> {
    return new Promise((resolve) => {
      MaterialImage.pending.push(resolve);
    });
  }

  static finish(): void {
    for (const resolve of MaterialImage.pending.splice(0)) resolve();
  }
}

const textures: IconTextures = {
  normals: {},
  diffuse: undefined,
  environment: undefined,
};
const palette = { width: 1, height: 1, rgb: [[255, 255, 255] as const] };
const snapshot: Snapshot = {
  categories: [],
  items: [],
  labels: [],
  categoryLabels: [],
  categoryLabel: undefined,
};
const preset = { id: "night" } as Preset;

const revokeUrl = vi.fn<(url: string) => void>();

describe("asynchronous icon material publication", () => {
  beforeEach(() => {
    MaterialWorker.instances = [];
    MaterialImage.pending = [];
    vi.stubGlobal("Worker", MaterialWorker);
    vi.stubGlobal("Image", MaterialImage);
    let nextUrl = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => `blob:icon-${String(nextUrl++)}`,
    );
    revokeUrl.mockReset();
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(): {
    renderer: IconMaterials;
    worker: MaterialWorker;
    publish: ReturnType<typeof vi.fn>;
    reportError: ReturnType<typeof vi.fn>;
  } {
    const publish = vi.fn();
    const reportError = vi.fn();
    const renderer = new IconMaterials(textures, palette, publish, reportError);
    const worker = MaterialWorker.instances[0];
    if (worker === undefined) throw new Error("The material worker did not start");
    return { renderer, worker, publish, reportError };
  }

  it("publishes the batch only after every image decodes", async () => {
    const { renderer, worker, publish } = setup();
    renderer.request("first", snapshot, preset, 0, 0);
    worker.complete(1, ["first", "second"]);
    await vi.waitFor(() => {
      expect(MaterialImage.pending).toHaveLength(2);
    });
    MaterialImage.pending.shift()?.();
    await Promise.resolve();
    expect(publish).not.toHaveBeenCalled();
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalledWith({
        first: "blob:icon-0",
        second: "blob:icon-1",
      });
    });
    renderer.dispose();
  });

  it("coalesces pending navigation and suppresses the stale result", () => {
    const { renderer, worker, publish } = setup();
    renderer.request("first", snapshot, preset, 0, 0);
    renderer.request("second", snapshot, preset, 0, 0);
    renderer.request("third", snapshot, preset, 0, 0);
    expect(worker.messages.filter((message) => message.type === "shade")).toHaveLength(
      1,
    );
    worker.complete(1);
    const jobs = worker.messages.filter((message) => message.type === "shade");
    expect(jobs.map((job) => job.id)).toEqual([1, 3]);
    expect(MaterialImage.pending).toHaveLength(0);
    expect(publish).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it("revokes decoded results invalidated during image decoding", async () => {
    const { renderer, worker, publish } = setup();
    renderer.request("first", snapshot, preset, 0, 0);
    worker.complete(1);
    await vi.waitFor(() => {
      expect(MaterialImage.pending).toHaveLength(1);
    });
    renderer.invalidate();
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(revokeUrl).toHaveBeenCalledWith("blob:icon-0");
    });
    expect(publish).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it("reuses a decoded batch immediately and bounds the cache", async () => {
    const { renderer, worker, publish } = setup();
    for (let index = 0; index < 9; index += 1) {
      renderer.request(String(index), snapshot, preset, 0, 0);
      worker.complete(index + 1);
      await vi.waitFor(() => {
        expect(MaterialImage.pending).toHaveLength(1);
      });
      MaterialImage.finish();
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(index + 1);
      });
    }
    expect(revokeUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:icon-0");
    const messageCount = worker.messages.length;
    renderer.request("1", snapshot, preset, 0, 0);
    expect(publish).toHaveBeenCalledTimes(10);
    expect(worker.messages).toHaveLength(messageCount);
    expect(MaterialImage.pending).toHaveLength(0);
    renderer.dispose();
    expect(worker.terminated).toBe(true);
    expect(revokeUrl).toHaveBeenCalledTimes(9);
  });

  it("does not publish a decode that completes after disposal", async () => {
    const { renderer, worker, publish } = setup();
    renderer.request("first", snapshot, preset, 0, 0);
    worker.complete(1);
    await vi.waitFor(() => {
      expect(MaterialImage.pending).toHaveLength(1);
    });
    renderer.dispose();
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(revokeUrl).toHaveBeenCalledWith("blob:icon-0");
    });
    expect(worker.terminated).toBe(true);
    expect(publish).not.toHaveBeenCalled();
  });

  it("closes a background capture that finishes after navigation changes", async () => {
    let complete: ((bitmap: ImageBitmap) => void) | undefined;
    const close = vi.fn();
    const bitmap: ImageBitmap = { width: 1280, height: 720, close };
    vi.stubGlobal(
      "createImageBitmap",
      () =>
        new Promise<ImageBitmap>((resolve) => {
          complete = resolve;
        }),
    );
    const { renderer, worker } = setup();
    const canvas = {
      width: 1280,
      height: 720,
      clientWidth: 1280,
      clientHeight: 720,
    } as HTMLCanvasElement;
    renderer.request("first", snapshot, preset, 0, 0, canvas);
    renderer.invalidate();
    complete?.(bitmap);
    await vi.waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1);
    });
    expect(worker.messages).toHaveLength(1);
    renderer.dispose();
  });

  it("preserves the existing icons when the worker fails", () => {
    const { renderer, worker, publish, reportError } = setup();
    expect(renderer.available).toBe(true);
    renderer.request("first", snapshot, preset, 0, 0);
    worker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "error", id: 1, message: "Canvas unavailable" },
      }),
    );
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
    expect(renderer.available).toBe(false);
    renderer.request("second", snapshot, preset, 0, 0);
    expect(worker.messages).toHaveLength(2);
    renderer.dispose();
  });

  it("keeps an evicted image alive while the shell still displays it", async () => {
    const { renderer, worker, publish } = setup();
    renderer.retain(["blob:icon-0"]);
    for (let index = 0; index < 9; index += 1) {
      renderer.request(String(index), snapshot, preset, 0, 0);
      worker.complete(index + 1);
      await vi.waitFor(() => {
        expect(MaterialImage.pending).toHaveLength(1);
      });
      MaterialImage.finish();
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(index + 1);
      });
    }
    expect(revokeUrl).not.toHaveBeenCalled();
    renderer.retain([]);
    expect(revokeUrl).toHaveBeenCalledWith("blob:icon-0");
    renderer.dispose();
    expect(revokeUrl).toHaveBeenCalledTimes(9);
  });

  it("reuses the decoded theme base across different navigation states", async () => {
    const { renderer, worker, publish } = setup();
    renderer.request("first", snapshot, preset, 0, 0);
    worker.complete(1, ["first"], ["1"]);
    expect(MaterialImage.pending).toHaveLength(1);
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(MaterialImage.pending).toHaveLength(1);
    });
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalledWith({
        "1": "blob:icon-0",
        first: "blob:icon-1",
      });
    });
    renderer.request("second", snapshot, preset, 0, 0);
    const job = worker.messages.at(-1);
    expect(job?.type).toBe("shade");
    if (job?.type === "shade") expect(job.base).toBeUndefined();
    worker.complete(2, ["second"]);
    MaterialImage.finish();
    await vi.waitFor(() => {
      expect(publish).toHaveBeenLastCalledWith({
        "1": "blob:icon-0",
        second: "blob:icon-2",
      });
    });
    renderer.dispose();
    expect(revokeUrl).toHaveBeenCalledTimes(3);
  });
});
