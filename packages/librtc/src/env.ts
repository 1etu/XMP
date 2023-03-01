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
