import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { environmentAt } from "./environment.js";
import { PRESET_IDS } from "./preset.js";
import type { Catalog } from "./preset.js";
import { alloc, blend } from "./palette.js";
import type { MonthPalette } from "./palette.js";

const cat = Object.fromEntries(
  PRESET_IDS.map((id) => [
    id,
    JSON.parse(
      readFileSync(
        new URL(`../../../resources/qgl/presets/${id}.json`, import.meta.url),
        "utf8",
      ),
    ) as unknown,
  ]),
) as Catalog;

describe("environmentAt", () => {
  it("holds the dawn, noon, dusk, and midnight presets", () => {
    expect(environmentAt(cat, 6)).toEqual(
      expect.objectContaining({ bg: cat.yoake.bg }),
    );
    expect(environmentAt(cat, 12)).toEqual(expect.objectContaining({ bg: cat.day.bg }));
    expect(environmentAt(cat, 18)).toEqual(
      expect.objectContaining({ bg: cat.higure.bg }),
    );
    expect(environmentAt(cat, 0)).toBe(cat.night);
    expect(environmentAt(cat, 24)).toBe(cat.night);
  });

  it("blends exposure halfway from day to dusk at 15:00", () => {
    const actual = environmentAt(cat, 15).hdr.val["exposure"];
    const day = cat.day.hdr.val["exposure"] ?? 0;
    const dusk = cat.higure.hdr.val["exposure"] ?? 0;
    expect(actual).toBeCloseTo((day + dusk) / 2);
  });

  it("does not step at the edge of a time window", () => {
    const before = environmentAt(cat, 16.9999).hdr.val["exposure"] ?? 0;
    const after = environmentAt(cat, 17).hdr.val["exposure"] ?? 0;
    expect(Math.abs(before - after)).toBeLessThan(0.0001);
  });
});

describe("month palette blending", () => {
  it("combines both the date and daylight weights", () => {
    const a: MonthPalette = { month: 12, day: [[200, 100, 80]], night: [[40, 20, 0]] };
    const b: MonthPalette = { month: 1, day: [[120, 140, 200]], night: [[0, 40, 80]] };
    const result = blend(a, 0.5, alloc(), b, 0.25);
    expect([...result.slice(0, 4)]).toEqual([105, 67, 65, 255]);
  });
});
