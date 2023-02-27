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
