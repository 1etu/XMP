import { FixedRtc } from "@vsh/librtc";
import { describe, expect, it } from "vitest";

import { indicate, sameMinute } from "./index.js";

describe("indicator", () => {
  it("formats the date and time the way the shell shows them", () => {
    const rtc = new FixedRtc("2026-09-16T11:38:00");

    expect(indicate(rtc)).toEqual({ date: "9/16", time: "11:38 AM" });
  });

  it("pads the minute but not the hour or date", () => {
    const rtc = new FixedRtc("2026-01-05T09:07:00");

    expect(indicate(rtc)).toEqual({ date: "1/5", time: "9:07 AM" });
  });

  it("does not round the hour up near the end of a minute", () => {
    const rtc = new FixedRtc("2026-09-16T11:59:59");

    expect(indicate(rtc).time).toBe("11:59 AM");
  });

  it("distinguishes midnight, noon, and afternoon", () => {
    expect(indicate(new FixedRtc("2026-09-01T00:48:00")).time).toBe("12:48 AM");
    expect(indicate(new FixedRtc("2026-09-01T12:00:00")).time).toBe("12:00 PM");
    expect(indicate(new FixedRtc("2026-09-01T16:28:00")).time).toBe("4:28 PM");
  });

  it("holds steady within a minute", () => {
    const rtc = new FixedRtc("2026-09-16T11:38:00");
    const first = indicate(rtc);

    rtc.advance(30_000);
    expect(sameMinute(first, indicate(rtc))).toBe(true);

    rtc.advance(31_000);
    expect(sameMinute(first, indicate(rtc))).toBe(false);
  });
});
