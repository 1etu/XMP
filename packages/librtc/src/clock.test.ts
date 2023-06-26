import { describe, expect, it } from "vitest";

import { ManualClock } from "./clock.js";

describe("ManualClock", () => {
  it("starts at zero elapsed on the first frame", () => {
    const f = new ManualClock().step(0);

    expect([f.no, f.deltaMs, f.elapsedMs]).toEqual([1, 0, 0]);
  });

  it("accumulates elapsed across frames", () => {
    const c = new ManualClock();
    c.step(0);
    c.step(16);
    const f = c.step(16);

    expect([f.no, f.deltaMs, f.elapsedMs]).toEqual([3, 16, 32]);
  });

  it("clamps a long stall so physics cannot jump", () => {
    const c = new ManualClock();
    c.step(0);

    expect(c.step(5000).deltaMs).toBe(100);
  });

  it("never reports a negative delta", () => {
    const c = new ManualClock();
    c.advance(100);

    expect(c.advance(50).deltaMs).toBe(0);
  });

  it("replays identically after reset", () => {
    const c = new ManualClock();
    const a = [c.step(16), c.step(16), c.step(16)];
    c.reset();
    const b = [c.step(16), c.step(16), c.step(16)];

    expect(b).toEqual(a);
  });
});
