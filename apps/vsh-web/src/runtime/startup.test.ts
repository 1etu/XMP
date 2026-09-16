import { describe, expect, it } from "vitest";
import { STARTUP_END, startupAt } from "./startup.js";

describe("startup presentation", () => {
  it("reveals the clock before the rail and settles without reversing", () => {
    expect(startupAt(8350, false).clock).toBe(1);
    expect(startupAt(8350, false).menu).toBe(0);
    let previous = startupAt(8380, false);
    for (let time = 8381; time <= 9500; time += 1) {
      const next = startupAt(time, false);
      expect(next.menu).toBeGreaterThanOrEqual(previous.menu - 1e-12);
      expect(next.menuScale).toBeLessThanOrEqual(previous.menuScale + 1e-12);
      expect(next.menuBlur).toBeLessThanOrEqual(previous.menuBlur + 1e-12);
      expect(next.menu).toBeLessThanOrEqual(1);
      expect(next.menuScale).toBeGreaterThanOrEqual(1);
      expect(next.menuBlur).toBeGreaterThanOrEqual(0);
      previous = next;
    }
    expect(previous).toMatchObject({ menu: 1, menuScale: 1, menuBlur: 0 });
  });

  it("removes the logo before the menu and keeps the theme handoff continuous", () => {
    expect(startupAt(6500, false)).toMatchObject({ logo: 0, footer: 0, blur: 0 });
    expect(startupAt(9000, false).appearance).toBe(0);
    for (let time = 1; time <= STARTUP_END + 1; time += 1) {
      const a = startupAt(time - 1, false);
      const b = startupAt(time, false);
      expect(Math.abs(b.waveGain - a.waveGain)).toBeLessThan(0.002);
      expect(Math.abs(b.appearance - a.appearance)).toBeLessThan(0.002);
      expect(b.waveGain).toBeGreaterThanOrEqual(0.5);
      expect(b.waveGain).toBeLessThanOrEqual(1.6);
    }
    expect(startupAt(STARTUP_END, false)).toMatchObject({
      waveGain: 1.6,
      appearance: 1,
      done: true,
    });
  });

  it("starts at the settled frame with reduced motion", () => {
    expect(startupAt(0, true)).toEqual(startupAt(STARTUP_END, false));
  });
});
