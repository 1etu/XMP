import { describe, expect, it } from "vitest";
import { AboutRoll } from "./about.js";

describe("About credits roll", () => {
  it("enters from below and advances at the native linear rate", () => {
    const roll = new AboutRoll({ contentHeight: 2000 });
    expect(roll.frame).toMatchObject({ offset: 0, top: 1080, done: false });
    expect(roll.advance(9000)).toMatchObject({ offset: 1080, top: 0, done: false });
    const partitioned = new AboutRoll({ contentHeight: 2000 });
    for (let frame = 0; frame < 540; frame += 1) partitioned.advance(1000 / 60);
    expect(partitioned.frame.offset).toBeCloseTo(roll.frame.offset, 8);
  });

  it("pauses without a time jump when resumed", () => {
    const roll = new AboutRoll({ contentHeight: 2000 });
    roll.advance(2000);
    roll.togglePause();
    expect(roll.advance(10000)).toMatchObject({ offset: 240, paused: true });
    roll.togglePause();
    expect(roll.advance(1000)).toMatchObject({ offset: 360, paused: false });
  });

  it("uses four times the rate for directional input and clamps both ends", () => {
    const roll = new AboutRoll({ contentHeight: 920 });
    roll.direction(1);
    expect(roll.advance(1000).offset).toBe(480);
    roll.direction(-1);
    expect(roll.advance(2000)).toMatchObject({ offset: 0, done: false });
    roll.direction(0);
    expect(roll.advance(1000).offset).toBe(120);
    expect(roll.advance(60000)).toMatchObject({ offset: 2000, top: -920, done: true });
    expect(roll.advance(1000).offset).toBe(2000);
  });

  it("keeps reduced motion still and makes the first block visible", () => {
    const roll = new AboutRoll({ contentHeight: 2000, reducedMotion: true });
    expect(roll.advance(60000)).toMatchObject({ offset: 1080, top: 0, done: false });
    roll.seek(1500);
    expect(roll.advance(1000).offset).toBe(1500);
    roll.direction(1);
    expect(roll.advance(1000).offset).toBe(1980);
    roll.direction(0);
    expect(roll.advance(1000).offset).toBe(1980);
  });

  it("ignores invalid time samples without corrupting its position", () => {
    const roll = new AboutRoll({ contentHeight: 2000 });
    roll.advance(1000);
    for (const time of [-1000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(roll.advance(time).offset).toBe(120);
    }
    expect(roll.seek(Number.NaN).offset).toBe(120);
  });
});
