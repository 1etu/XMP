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
