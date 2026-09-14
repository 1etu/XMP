import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, portfolioCategories } from "@vsh/content";
import { AccelMode } from "@vsh/paf";
import metrics from "../../../../resources/xmb/layout.json";
import { XmbShell } from "./shell.js";

describe("material and scene transition coordination", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("history", {
      state: null,
      replaceState: vi.fn(),
      pushState: vi.fn(),
    });
    vi.stubGlobal("location", { pathname: "/", search: "" });
    vi.stubGlobal("addEventListener", vi.fn());
    vi.stubGlobal("removeEventListener", vi.fn());
    vi.stubGlobal("navigator", {});
  });
  afterEach(() => vi.unstubAllGlobals());
  function createShell() {
    return new XmbShell({
      cats: portfolioCategories(),
      metrics,
      icons: { 1: "first" },
      target: new EventTarget(),
      onEffect: vi.fn(),
      preferences: DEFAULT_PREFERENCES,
      onPreferences: vi.fn(),
    });
  }
  const spec = { durationMs: 200, accelMode: AccelMode.Linear };

  it("starts the scene only when its decoded icon batch begins and uses the same fade value", () => {
    const shell = createShell();
    const scene = vi.fn();
    shell.setIcons({ 1: "second" }, spec);
    shell.tick(70);
    shell.setIcons({ 1: "orange" }, spec, scene);
    expect(scene).not.toHaveBeenCalled();
    shell.tick(130);
    expect(scene).toHaveBeenLastCalledWith(0);
    shell.tick(80);
    expect(scene).toHaveBeenLastCalledWith(shell.iconMaterial("user", 1).blend);
    expect(scene).toHaveBeenLastCalledWith(0.4);
    shell.tick(120);
    expect(scene).toHaveBeenLastCalledWith(1);
    shell.dispose();
  });

  it("cancels a queued theme when a newer preference invalidates it", () => {
    const shell = createShell();
    const outdated = vi.fn();
    const current = vi.fn();
    shell.setIcons({ 1: "second" }, spec);
    shell.setIcons({ 1: "orange" }, spec, outdated);
    shell.invalidateMaterials();
    shell.setIcons({ 1: "purple" }, spec, current);
    shell.tick(200);
    expect(outdated).not.toHaveBeenCalled();
    expect(current).toHaveBeenLastCalledWith(0);
    shell.tick(1, true);
    expect(current).toHaveBeenLastCalledWith(1);
    expect(shell.iconMaterial("user", 1).current).toBe("purple");
    shell.dispose();
  });
});
