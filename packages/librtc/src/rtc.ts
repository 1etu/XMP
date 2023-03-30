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
