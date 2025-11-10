import { design } from "@vsh/resource";
import type { Rtc } from "@vsh/librtc";

import { indicate, sameMinute } from "./indicator.js";
import type { Indicator } from "./indicator.js";

const TICK_MS = design(1000);

export class SystemClock {
  readonly #rtc: Rtc;
  readonly #tickMs: number;
  readonly #watchers = new Set<() => void>();

  #now: Indicator;
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(rtc: Rtc, tickMs: number = TICK_MS) {
    this.#rtc = rtc;
    this.#tickMs = tickMs;
    this.#now = indicate(rtc);
  }

  readonly subscribe = (fn: () => void): (() => void) => {
    this.#watchers.add(fn);
    this.#open();

    return () => {
      this.#watchers.delete(fn);
      if (this.#watchers.size === 0) {
        this.#close();
      }
    };
  };

  readonly snapshot = (): Indicator => this.#now;

  poll(): boolean {
    const next = indicate(this.#rtc);
    if (sameMinute(this.#now, next)) {
      return false;
    }

    this.#now = next;
    for (const fn of this.#watchers) {
      fn();
    }

    return true;
  }

  #open(): void {
    if (this.#timer !== undefined) {
      return;
    }

    this.#timer = setInterval(() => {
      this.poll();
    }, this.#tickMs);
  }

  #close(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }

  dispose(): void {
    this.#close();
    this.#watchers.clear();
  }
}
