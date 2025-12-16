import { describe, expect, it } from "vitest";

import { Pad, REPEAT } from "./repeat.js";

describe("press and release", () => {
  it("emits once on press", () => {
    const pad = new Pad();
    expect(pad.press("down")).toEqual(["down"]);
  });

  it("ignores a repeated press of a held command", () => {
    const pad = new Pad();
    pad.press("down");
    expect(pad.press("down")).toEqual([]);
  });

  it("emits again after release", () => {
    const pad = new Pad();
    pad.press("down");
    pad.release("down");
    expect(pad.press("down")).toEqual(["down"]);
  });

  it("drops every hold on releaseAll", () => {
    const pad = new Pad();
    pad.press("down");
    pad.press("left");
    pad.releaseAll();
    expect(pad.held).toEqual([]);
  });
});

describe("repeat policy", () => {
  it("stays silent before the hold threshold", () => {
    const pad = new Pad();
    pad.press("down");
    expect(pad.tick(REPEAT.holdMs - 1)).toEqual([]);
  });

  it("repeats once the threshold passes", () => {
    const pad = new Pad();
    pad.press("down");
    expect(pad.tick(REPEAT.holdMs)).toEqual(["down"]);
    expect(pad.tick(REPEAT.rateMs)).toEqual(["down"]);
  });

  it("speeds up after an extended hold", () => {
    const pad = new Pad();
    pad.press("down");
    pad.tick(REPEAT.fastAfterMs);

    const slow = new Pad();
    slow.press("down");
    slow.tick(REPEAT.holdMs);

    const fast = pad.tick(REPEAT.rateMs).length;
    const normal = slow.tick(REPEAT.rateMs).length;
    expect(fast).toBeGreaterThan(normal);
  });

  it("never repeats decide, cancel or options", () => {
    const pad = new Pad();
    pad.press("decide");
    pad.press("cancel");
    pad.press("options");
    expect(pad.tick(REPEAT.fastAfterMs * 2)).toEqual([]);
  });

  it("emits a whole number of repeats for a long tick", () => {
    const pad = new Pad();
    pad.press("up");

    const out = pad.tick(REPEAT.holdMs + REPEAT.rateMs * 3);
    expect(out).toEqual(["up", "up", "up", "up"]);
  });

  it("is deterministic for identical time", () => {
    const run = (): readonly string[] => {
      const pad = new Pad();
      const out: string[] = [];
      out.push(...pad.press("right"));
      for (let i = 0; i < 20; i += 1) {
        out.push(...pad.tick(50));
      }
      return out;
    };

    expect(run()).toEqual(run());
  });
});
