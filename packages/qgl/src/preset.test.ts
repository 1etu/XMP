import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  PRESET_IDS,
  bgOf,
  hasSched,
  hdrOf,
  lerp,
  lineOf,
  mix,
  partOf,
  schedOf,
} from "./preset.js";
import type { Group, Preset } from "./preset.js";

const DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../resources/qgl/presets",
);

function load(id: string): Preset {
  return JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8")) as Preset;
}

function group(val: Record<string, number>, ints: string[] = []): Group {
  return { val, ints };
}

function preset(id: string, val: Record<string, number>, ints: string[]): Preset {
  return {
    id,
    corners: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    bg: group(val, ints),
    hdr: group(val, ints),
    line: group(val, ints),
    part: group(val, ints),
  };
}

describe("mix", () => {
  it("walks from a to b", () => {
    expect(mix(10, 20, 0)).toBe(10);
    expect(mix(10, 20, 0.5)).toBe(15);
    expect(mix(10, 20, 1)).toBe(20);
  });
});

describe("lerp", () => {
  const a = preset("a", { f: 0, n: 1 }, ["n"]);
  const b = preset("b", { f: 10, n: 4 }, ["n"]);

  it("returns the endpoints by identity", () => {
    expect(lerp(a, b, 0)).toBe(a);
    expect(lerp(a, b, 1)).toBe(b);
  });

  it("clamps out of range values to the endpoints", () => {
    expect(lerp(a, b, -2)).toBe(a);
    expect(lerp(a, b, 9)).toBe(b);
  });

  it("interpolates floats", () => {
    expect(lerp(a, b, 0.25).line.val["f"]).toBeCloseTo(2.5, 6);
  });

  it("steps integers rather than interpolating them", () => {
    expect(lerp(a, b, 0.49).line.val["n"]).toBe(1);
    expect(lerp(a, b, 0.5).line.val["n"]).toBe(4);
  });

  it("interpolates corners channel by channel", () => {
    const dark = { ...a, corners: [[0, 0, 0]] as Preset["corners"] };
    const lit = { ...b, corners: [[1, 2, 4]] as Preset["corners"] };

    expect(lerp(dark, lit, 0.5).corners[0]).toEqual([0.5, 1, 2]);
  });

  it("keeps a key that only one side declares", () => {
    const only = preset("only", { f: 0, n: 1, extra: 7 }, ["n"]);

    expect(lerp(only, b, 0.5).line.val["extra"]).toBe(7);
  });

  it("blends icon lighting with the environment and steps its shader mode", () => {
    const night = { ...a, icons: group({ expose: 0.8, fullSS: 0 }, ["fullSS"]) };
    const day = { ...b, icons: group({ expose: 1.2, fullSS: 1 }, ["fullSS"]) };

    expect(lerp(night, day, 0.25).icons?.val["expose"]).toBeCloseTo(0.9);
    expect(lerp(night, day, 0.25).icons?.val["fullSS"]).toBe(0);
    expect(lerp(night, day, 0.75).icons?.val["fullSS"]).toBe(1);
    expect(lerp(a, b, 0.5).icons).toBeUndefined();
  });
});

describe("emitted catalog", () => {
  const groups = ["bg", "hdr", "line", "part"] as const;
  const views = { hdr: hdrOf, line: lineOf, part: partOf, bg: bgOf };
  const optional = new Set(["dither", "gamma"]);

  it.each(PRESET_IDS)("%s carries every required field its view reads", (id) => {
    const p = load(id);

    for (const g of groups) {
      if (g === "bg" && id === "base") {
        continue;
      }
      const view: Record<string, number> = { ...views[g](p) };
      for (const key of Object.keys(view)) {
        if (optional.has(key)) {
          continue;
        }
        expect(p[g].val[key], `${id}.${g}.${key}`).toBeDefined();
      }
    }
  });

  it("defaults the optional tone controls to identity", () => {
    const hdr = hdrOf(load("base"));

    expect(hdr.dither).toBe(0);
    expect(hdr.gamma).toBe(1);
  });

  it("reads the dither the welcome presets declare", () => {
    expect(hdrOf(load("welcome_1")).dither).toBeGreaterThan(0);
  });

  it.each(PRESET_IDS)("%s has four corners", (id) => {
    expect(load(id).corners).toHaveLength(4);
  });

  it("carries the day and night schedule on the live presets", () => {
    for (const id of ["day", "night", "yoake", "higure"]) {
      expect(hasSched(load(id)), id).toBe(true);
    }
  });

  it("leaves the base preset without a schedule", () => {
    expect(hasSched(load("base"))).toBe(false);
  });

  it("reads a schedule whose windows are ordered", () => {
    const s = schedOf(load("day"));

    expect(s.night2dayBegin).toBeLessThan(s.night2dayEnd);
    expect(s.night2dayEnd).toBeLessThan(s.day2nightBegin);
    expect(s.day2nightBegin).toBeLessThan(s.day2nightEnd);
  });

  it("keeps the cold boot background darker than the base background", () => {
    const sum = (p: Preset): number =>
      p.corners.reduce((n, c) => n + c[0] + c[1] + c[2], 0);

    expect(sum(load("coldboot1"))).toBeLessThan(sum(load("base")));
  });
});
