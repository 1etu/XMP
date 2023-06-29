import { describe, expect, it } from "vitest";

import { clampMonth, daylightAt, sample } from "./env.js";
import type { Sched } from "./env.js";
import { FixedRtc, monthPositionOf } from "./rtc.js";

const SCHED: Sched = {
  night2dayBegin: 0,
  night2dayEnd: 5.16611,
  day2nightBegin: 18.498,
  day2nightEnd: 20.3312,
};

describe("daylightAt", () => {
  it("is fully night at the start of the rise", () => {
    expect(daylightAt(SCHED.night2dayBegin, SCHED)).toBe(0);
  });

  it("is fully day at the end of the rise", () => {
    expect(daylightAt(SCHED.night2dayEnd, SCHED)).toBe(1);
  });

  it("holds full day across the plateau", () => {
    expect(daylightAt(12, SCHED)).toBe(1);
    expect(daylightAt(SCHED.day2nightBegin, SCHED)).toBe(1);
  });

  it("is fully night at the end of the fall", () => {
    expect(daylightAt(SCHED.day2nightEnd, SCHED)).toBe(0);
    expect(daylightAt(23.99, SCHED)).toBe(0);
  });

  it("passes through a half value at the midpoint of each edge", () => {
    const rise = (SCHED.night2dayBegin + SCHED.night2dayEnd) / 2;
    const fall = (SCHED.day2nightBegin + SCHED.day2nightEnd) / 2;

    expect(daylightAt(rise, SCHED)).toBeCloseTo(0.5, 6);
    expect(daylightAt(fall, SCHED)).toBeCloseTo(0.5, 6);
  });

  it("rises without stepping", () => {
    let prev = -1;
    for (let h = SCHED.night2dayBegin; h <= SCHED.night2dayEnd; h += 0.05) {
      const v = daylightAt(h, SCHED);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("treats a degenerate window as a hard edge", () => {
    const flat: Sched = {
      night2dayBegin: 6,
      night2dayEnd: 6,
      day2nightBegin: 18,
      day2nightEnd: 18,
    };

    expect(daylightAt(5.9, flat)).toBe(0);
    expect(daylightAt(6.1, flat)).toBe(1);
  });
});

describe("clampMonth", () => {
  it("holds the calendar range", () => {
    expect(clampMonth(0)).toBe(1);
    expect(clampMonth(13)).toBe(12);
    expect(clampMonth(7)).toBe(7);
  });
});

describe("sample", () => {
  it("reads month and daylight from the injected clock", () => {
    const env = sample(new FixedRtc("2026-09-16T12:00:00"), SCHED);

    expect(env.month).toBe(9);
    expect(env.hour).toBeCloseTo(12, 6);
    expect(env.daylight).toBe(1);
  });

  it("reports night for an hour outside the day window", () => {
    expect(sample(new FixedRtc("2026-12-01T23:00:00"), SCHED).daylight).toBe(0);
  });
});

describe("monthPositionOf", () => {
  it("starts each month on its own palette", () => {
    expect(monthPositionOf(new FixedRtc("2026-09-01T12:00:00"))).toBe(9);
    expect(monthPositionOf(new FixedRtc("2027-01-01T00:00:00"))).toBe(1);
  });

  it("uses the actual number of days in February", () => {
    expect(monthPositionOf(new FixedRtc("2024-02-29T12:00:00"))).toBeCloseTo(
      2 + 28 / 29,
    );
    expect(monthPositionOf(new FixedRtc("2026-02-28T12:00:00"))).toBeCloseTo(
      2 + 27 / 28,
    );
  });

  it("blends December toward January", () => {
    const value = monthPositionOf(new FixedRtc("2026-12-31T23:59:00"));
    expect(value).toBeCloseTo(12 + 30 / 31);
    expect((Math.floor(value) % 12) + 1).toBe(1);
  });
});
