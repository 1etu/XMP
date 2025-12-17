import { FixedRtc } from "@vsh/librtc";
import { describe, expect, it, vi } from "vitest";

import { SystemClock } from "./clock.js";

describe("system clock", () => {
  it("starts at the rtc reading", () => {
    const clock = new SystemClock(new FixedRtc("2026-09-16T11:38:00"));

    expect(clock.snapshot()).toEqual({ date: "9/16", time: "11:38 AM" });
    clock.dispose();
  });

  it("keeps the same snapshot object within a minute", () => {
    const rtc = new FixedRtc("2026-09-16T11:38:00");
    const clock = new SystemClock(rtc);
    const first = clock.snapshot();

    rtc.advance(30_000);
    expect(clock.poll()).toBe(false);
    expect(clock.snapshot()).toBe(first);

    clock.dispose();
  });

  it("notifies watchers when the minute rolls over", () => {
    const rtc = new FixedRtc("2026-09-16T11:38:00");
    const clock = new SystemClock(rtc);
    const seen = vi.fn();
    const stop = clock.subscribe(seen);

    rtc.advance(61_000);
    expect(clock.poll()).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(clock.snapshot().time).toBe("11:39 AM");

    stop();
    clock.dispose();
  });

  it("stops polling once the last watcher leaves", () => {
    vi.useFakeTimers();
    const rtc = new FixedRtc("2026-09-16T11:38:00");
    const clock = new SystemClock(rtc, 10);
    const seen = vi.fn();

    const stop = clock.subscribe(seen);
    rtc.advance(61_000);
    vi.advanceTimersByTime(30);
    expect(seen).toHaveBeenCalled();

    stop();
    const before = seen.mock.calls.length;
    rtc.advance(61_000);
    vi.advanceTimersByTime(50);
    expect(seen.mock.calls.length).toBe(before);

    clock.dispose();
    vi.useRealTimers();
  });
});
