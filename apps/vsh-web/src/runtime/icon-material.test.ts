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
