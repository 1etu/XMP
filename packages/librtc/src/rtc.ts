const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

export interface Rtc {
  now(): number;
}

export class SysRtc implements Rtc {
  now(): number {
    return Date.now();
  }
}
