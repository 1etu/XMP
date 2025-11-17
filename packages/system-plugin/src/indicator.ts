import { dayOf, hourOf, minuteOf, monthOf } from "@vsh/librtc";
import type { Rtc } from "@vsh/librtc";

const NOON = 12;

export interface Indicator {
  readonly date: string;
  readonly time: string;
}

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

export function indicate(rtc: Rtc): Indicator {
  const hour = Math.floor(hourOf(rtc));

  return {
    date: `${String(monthOf(rtc))}/${String(dayOf(rtc))}`,
    time: `${String(hour % NOON || NOON)}:${pad(minuteOf(rtc))} ${hour < NOON ? "AM" : "PM"}`,
  };
}

export function sameMinute(a: Indicator, b: Indicator): boolean {
  return a.date === b.date && a.time === b.time;
}
