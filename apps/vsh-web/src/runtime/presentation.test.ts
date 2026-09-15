import { describe, expect, it, vi } from "vitest";
import { Presentation } from "./presentation.js";
import { DEFAULT_PREFERENCES } from "@vsh/content";

function setup() {
  const callbacks = {
    change: vi.fn(),
    route: vi.fn(),
    preferences: vi.fn(),
    link: vi.fn(),
    sound: vi.fn(),
  };
  return { model: new Presentation(callbacks), ...callbacks };
}

describe("portfolio presentation", () => {
  it("returns from What's New video and project details without losing the grid", () => {
    const { model, route } = setup();
    model.open({ kind: "whats-new" });
    model.open({ kind: "video", id: "meltgl" });
    expect(model.snapshot().pages.map((page) => page.kind)).toEqual([
      "whats-new",
      "video",
    ]);
    model.back();
    expect(model.top?.kind).toBe("whats-new");
    model.open({ kind: "information", id: "turkeydpi" });
    expect(route).not.toHaveBeenCalled();
    model.back();
    expect(model.top?.kind).toBe("whats-new");
    model.back();
    expect(model.top).toBeUndefined();
  });
  it("returns from media and options to the same information screen", () => {
    const { model, route } = setup();
    model.open({ kind: "information", id: "nos4" });
    model.command("options");
    model.command("down");
    model.command("decide");
    expect(model.top?.kind).toBe("gallery");
    model.command("right");
    expect(model.top).toMatchObject({ id: "nos4", index: 1 });
    model.command("cancel");
    expect(model.top).toEqual({ kind: "information", id: "nos4" });
    model.command("cancel");
    expect(model.top).toBeUndefined();
    expect(route).toHaveBeenLastCalledWith(undefined);
  });

  it("does not change the base selection through an open panel", () => {
    const { model } = setup();
    expect(model.command("right")).toBe(false);
    model.open({ kind: "information", id: "meltgl" });
    for (let i = 0; i < 30; i += 1) expect(model.command("right")).toBe(true);
    expect(model.top).toEqual({ kind: "information", id: "meltgl" });
  });

  it("cancels a choice without saving it and commits only the selected value", () => {
    const { model, preferences } = setup();
    model.open({ kind: "choice", setting: "background" });
    model.command("down");
    model.command("cancel");
    expect(preferences).not.toHaveBeenCalled();
    expect(model.snapshot().preferences.background).toBe("original");
    model.open({ kind: "choice", setting: "motion" });
    model.command("down");
    model.command("decide");
    expect(preferences).toHaveBeenCalledWith({
      ...DEFAULT_PREFERENCES,
      motion: "reduced",
    });
  });

  it("returns from brightness to Background and preserves all other settings", () => {
    const { model, preferences } = setup();
    model.open({ kind: "choice", setting: "background" });
    model.select(0);
    model.confirm();
    expect(model.top).toMatchObject({
      kind: "choice",
      setting: "brightness",
      selected: 5,
    });
    model.select(7);
    model.confirm();
    expect(model.top).toMatchObject({
      kind: "choice",
      setting: "background",
      selected: 0,
    });
    expect(preferences).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, brightness: 2 });
    model.command("left");
    expect(model.top).toBeUndefined();
  });

  it("requires an existing image before selecting Wallpaper", () => {
    const { model, preferences } = setup();
    model.open({ kind: "choice", setting: "background" });
    model.select(3);
    model.confirm();
    expect(model.top?.kind).toBe("message");
    expect(preferences).not.toHaveBeenCalled();
    model.setWallpaper("/portfolio/nos4/intro.png");
    expect(model.snapshot().preferences).toMatchObject({
      background: "wallpaper",
      wallpaper: "/portfolio/nos4/intro.png",
    });
    model.setWallpaper("https://invalid.example/image.png");
    expect(preferences).toHaveBeenCalledTimes(1);
  });

  it("clamps options during rapid input", () => {
    const { model } = setup();
    model.options("meltgl");
    for (let i = 0; i < 100; i += 1) model.command("down");
    expect(model.top).toMatchObject({ selected: 5 });
    for (let i = 0; i < 100; i += 1) model.command("up");
    expect(model.top).toMatchObject({ selected: 0 });
  });

  it("returns to information after a failed media load", () => {
    const { model } = setup();
    model.open({ kind: "video", id: "meltgl" });
    model.fail("The video could not load.");
    expect(model.top?.kind).toBe("message");
    model.confirm();
    expect(model.top).toEqual({ kind: "information", id: "meltgl" });
  });

  it("keeps long text separate from metadata and returns to the same item", () => {
    const { model, route } = setup();
    model.open({ kind: "document", id: "cohesi" });
    const scrollBy = vi.fn();
    model.scroll = { scrollBy } as unknown as HTMLElement;
    model.command("down");
    expect(scrollBy).toHaveBeenCalledWith({ top: 96 });
    expect(model.snapshot().pages).toEqual([
      { kind: "information", id: "cohesi" },
      { kind: "document", id: "cohesi" },
    ]);
    model.command("cancel");
    expect(model.top).toEqual({ kind: "information", id: "cohesi" });
    expect(route).toHaveBeenLastCalledWith("cohesi");
  });

  it("restores a route without adding a history entry", () => {
    const { model, route } = setup();
    model.restore("cohesi");
    expect(model.top).toEqual({ kind: "information", id: "cohesi" });
    model.restore(undefined);
    expect(model.top).toBeUndefined();
    expect(route).not.toHaveBeenCalled();
  });

  it("retains the outgoing page until the shell completes its exit fade", () => {
    const { model } = setup();
    model.open({ kind: "information", id: "profile" });
    model.back();
    expect(model.top).toBeUndefined();
    expect(model.snapshot().departing).toEqual([
      { kind: "information", id: "profile" },
    ]);
    model.finishExit();
    expect(model.snapshot().departing).toEqual([]);
  });

  it("handles missing routes and rejects unavailable media", () => {
    const { model } = setup();
    model.restore("missing");
    expect(model.top?.kind).toBe("message");
    model.back();
    model.open({ kind: "video", id: "cohesi" });
    expect(model.top).toBeUndefined();
  });

  it("opens external destinations only on explicit activation", () => {
    const { model, link } = setup();
    model.options("meltgl");
    model.select(4);
    expect(link).not.toHaveBeenCalled();
    model.confirm();
    expect(link).toHaveBeenCalledWith("https://github.com/1etu/MeltGL");
  });
});
