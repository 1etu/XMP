import { describe, expect, it, vi } from "vitest";
import { WHATS_NEW, WhatsNew } from "./whats-new.js";
import type { WhatsNewItem } from "@vsh/content";

const items: readonly WhatsNewItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: String(index),
  title: `Item ${index}`,
  image: `/image-${index}.png`,
  artwork: false,
  type: "web",
  action: { kind: "browser", href: `https://example.com/${index}` },
}));
function setup() {
  const requests: { resolve: () => void; reject: () => void; signal: AbortSignal }[] =
    [];
  const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  const model = new WhatsNew(
    items,
    (_, signal) =>
      new Promise<void>((resolve, reject) => {
        requests.push({ resolve, reject: () => { reject(new Error("Failed")); }, signal });
      }),
    storage,
  );
  model.open();
  return { model, requests, storage };
}

describe("What's New", () => {
  it("keeps navigation within the grid and returns left from the first column", () => {
    const { model } = setup();
    model.command("up");
    expect(model.snapshot().selected).toBe(0);
    for (let index = 0; index < 8; index += 1) model.command("right");
    expect(model.snapshot().selected).toBe(2);
    model.command("down");
    model.command("down");
    expect(model.snapshot().selected).toBe(5);
    model.command("left");
    model.command("down");
    expect(model.snapshot().selected).toBe(7);
    model.command("left");
    expect(model.command("left")).toBe("close");
    model.close();
  });

  it("waits for the image to decode before activation and removes NEW after opening", async () => {
    const { model, requests, storage } = setup();
    expect(model.activate()).toBeUndefined();
    requests[0]?.resolve();
    await Promise.resolve();
    expect(model.snapshot().states[0]).toBe("ready");
    expect(model.activate()).toEqual(items[0]?.action);
    expect(model.snapshot().seen).toEqual(["0"]);
    expect(storage.setItem).toHaveBeenCalledWith("vsh.whats-new.visited", '["0"]');
    model.close();
  });

  it("retries a failed image without launching its action", async () => {
    const { model, requests } = setup();
    requests[0]?.reject();
    await Promise.resolve();
    expect(model.snapshot().states[0]).toBe("failed");
    expect(model.activate()).toBeUndefined();
    expect(model.snapshot().states[0]).toBe("loading");
    requests.at(-1)?.resolve();
    await Promise.resolve();
    expect(model.activate()).toEqual(items[0]?.action);
    model.close();
  });

  it("ignores old loads after cancel and reopen", async () => {
    const { model, requests } = setup();
    const old = requests[0];
    model.close();
    expect(old?.signal.aborted).toBe(true);
    model.open();
    old?.resolve();
    await Promise.resolve();
    expect(model.snapshot().states[0]).toBe("loading");
    requests[8]?.resolve();
    await Promise.resolve();
    expect(model.snapshot().states[0]).toBe("ready");
    model.close();
  });

  it("keeps focus transitions continuous under repeated input and respects reduced motion", () => {
    const { model } = setup();
    model.select(3);
    model.advance(70);
    const first = model.cardFrame(3).scale;
    expect(first).toBeGreaterThan(WHATS_NEW.scale);
    expect(first).toBeLessThan(1);
    model.select(4);
    expect(model.cardFrame(3).scale).toBe(first);
    model.advance(1, true);
    expect(model.cardFrame(3).scale).toBe(WHATS_NEW.scale);
    expect(model.cardFrame(4).scale).toBe(1);
    expect(model.frame.row).toBe(1);
    model.close();
  });

  it("retains recent items and selection when the grid reopens", async () => {
    const { model, requests } = setup();
    model.select(4);
    requests[4]?.resolve();
    await Promise.resolve();
    model.activate();
    model.close();
    model.open();
    expect(model.snapshot().selected).toBe(4);
    expect(model.snapshot().items.at(-1)?.id).toBe("4");
    expect(model.snapshot().recentStart).toBe(8);
    model.close();
  });
});
