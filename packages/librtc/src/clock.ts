const MAX_DELTA_MS = 100;

export interface Frame {
  readonly no: number;
  readonly deltaMs: number;
  readonly elapsedMs: number;
}

export interface Clock {
  advance(stampMs: number): Frame;
  reset(): void;
}

class Base implements Clock {
  #no = 0;
  #origin: number | undefined;
  #prev = 0;

  advance(stampMs: number): Frame {
    if (this.#origin === undefined) {
      this.#origin = stampMs;
      this.#prev = stampMs;
    }

    const elapsedMs = stampMs - this.#origin;
    const raw = stampMs - this.#prev;
    this.#prev = stampMs;
    this.#no += 1;

    return {
      no: this.#no,
      deltaMs: Math.min(Math.max(raw, 0), MAX_DELTA_MS),
      elapsedMs,
    };
  }

  reset(): void {
    this.#no = 0;
    this.#origin = undefined;
    this.#prev = 0;
  }
}
