import { describe, expect, it } from "vitest";

import { focusLightAt } from "./light.js";

describe("focused title glow", () => {
  it("matches the native linear half-cycle and style 0x41 endpoints", () => {
    const samples = [0, 150, 300, 450, 600, 750, 900, 1050, 1200];
    const native = [0.3, 0.395, 0.49, 0.585, 0.68, 0.585, 0.49, 0.395, 0.3];
    samples.forEach((time, index) => {
      expect(focusLightAt(time)).toBeCloseTo(native[index] ?? 0, 7);
    });
  });

  it("keeps the phase after repeated cycles", () => {
    for (const elapsed of [0, 37, 450, 600, 950, 1199]) {
      expect(focusLightAt(elapsed + 1200 * 100)).toBeCloseTo(focusLightAt(elapsed), 7);
    }
  });

  it("holds the native midpoint for reduced motion", () => {
    for (const elapsed of [0, 300, 600, 900, 1200]) {
      expect(focusLightAt(elapsed, true)).toBe(0.49);
    }
  });

  it("starts from the low glow for a new selection", () => {
    expect(focusLightAt(-10)).toBe(0.3);
    expect(focusLightAt(0)).toBe(0.3);
    expect(focusLightAt(1000 / 60)).toBeCloseTo(0.31055556, 7);
  });
});
