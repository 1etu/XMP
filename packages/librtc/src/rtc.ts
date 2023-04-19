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

export class FixedRtc implements Rtc {
  #ms: number;

  constructor(at: string | number | Date) {
    this.#ms = at instanceof Date ? at.getTime() : new Date(at).getTime();

    if (!Number.isFinite(this.#ms)) {
      throw new RangeError(`FixedRtc cannot read ${String(at)}`);
    }
  }

  now(): number {
    return this.#ms;
  }

  set(at: string | number | Date): void {
    this.#ms = at instanceof Date ? at.getTime() : new Date(at).getTime();
  }

  advance(ms: number): void {
    this.#ms += ms;
  }
}

export function hourOf(rtc: Rtc): number {
  const d = new Date(rtc.now());

  return (
    d.getHours() +
    d.getMinutes() / 60 +
    d.getSeconds() / 3600 +
    d.getMilliseconds() / MS_PER_HOUR
  );
}

export function monthOf(rtc: Rtc): number {
  return new Date(rtc.now()).getMonth() + 1;
}

export function monthPositionOf(rtc: Rtc): number {
  const date = new Date(rtc.now());
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getMonth() + 1 + (date.getDate() - 1) / days;
}

export function dayOf(rtc: Rtc): number {
  return new Date(rtc.now()).getDate();
}

export function minuteOf(rtc: Rtc): number {
  return new Date(rtc.now()).getMinutes();
}
