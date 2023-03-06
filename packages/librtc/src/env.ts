import type { Rtc } from "./rtc.js";
import { hourOf, monthOf } from "./rtc.js";

const N_MONTH = 12;

export interface Sched {
  readonly night2dayBegin: number;
  readonly night2dayEnd: number;
  readonly day2nightBegin: number;
  readonly day2nightEnd: number;
}

export interface EnvState {
  readonly month: number;
  readonly hour: number;
  readonly daylight: number;
}

function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) {
    return x < a ? 0 : 1;
  }

  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);

  return t * t * (3 - 2 * t);
}

export function daylightAt(hour: number, s: Sched): number {
  if (hour <= s.night2dayBegin) {
    return 0;
  }
  if (hour < s.night2dayEnd) {
    return smoothstep(s.night2dayBegin, s.night2dayEnd, hour);
  }
  if (hour <= s.day2nightBegin) {
    return 1;
  }
  if (hour < s.day2nightEnd) {
    return 1 - smoothstep(s.day2nightBegin, s.day2nightEnd, hour);
  }

  return 0;
}
