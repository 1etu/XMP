import { lerp } from "@vsh/qgl";
import type { Preset } from "@vsh/qgl";

export class Chain {
  #from: Preset;
  #to: Preset;
  #cur: Preset;
  #t = 1;
  #durMs = 1;

  constructor(start: Preset) {
    this.#from = start;
    this.#to = start;
    this.#cur = start;
  }

  get current(): Preset {
    return this.#cur;
  }

  get settled(): boolean {
    return this.#t >= 1;
  }

  get target(): Preset {
    return this.#to;
  }

  retarget(next: Preset, durMs: number): void {
    if (next === this.#to && this.#durMs === durMs) {
      return;
    }

    this.#from = this.#cur;
    this.#to = next;
    this.#durMs = Math.max(durMs, 1);
    this.#t = 0;
  }

  step(deltaMs: number): Preset {
    if (this.#t < 1) {
      this.#t = Math.min(this.#t + deltaMs / this.#durMs, 1);
      this.#cur = lerp(this.#from, this.#to, ease(this.#t));
    }

    return this.#cur;
  }
}

export function ease(t: number): number {
  const k = Math.min(Math.max(t, 0), 1);

  return k * k * (3 - 2 * k);
}
