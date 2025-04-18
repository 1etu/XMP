import { AccelMode, EPS, ease } from "./accel.js";
import { NATIVE_HZ, gainOf, step } from "./approach.js";
import { STILL } from "./spec.js";
import type { Spec } from "./spec.js";

const MS_PER_S = 1000;

export class Scalar {
  #from: number;
  #to: number;
  #spec: Spec;
  #at: number;
  #progress = 1;
  #frames = 0;
  #gain = 1;

  constructor(value: number) {
    this.#from = value;
    this.#to = value;
    this.#spec = STILL;
    this.#at = 0;
  }

  get value(): number {
    if (this.#spec.durationMs <= EPS) {
      return this.#to;
    }

    if (this.#spec.accelMode === AccelMode.Approach) {
      const fraction = Math.max(0, (this.#at * NATIVE_HZ) / MS_PER_S - this.#frames);
      const next = step(this.#progress, this.#gain);
      const progress = this.#progress + (next - this.#progress) * fraction;

      return this.#from + (this.#to - this.#from) * progress;
    }

    return (
      this.#from +
      (this.#to - this.#from) *
        ease(this.#at / this.#spec.durationMs, this.#spec.accelMode)
    );
  }

  get done(): boolean {
    if (this.#spec.accelMode === AccelMode.Approach) {
      return this.#progress >= 1 || this.#spec.durationMs <= EPS;
    }

    return this.#at >= this.#spec.durationMs;
  }

  retarget(to: number, spec: Spec): void {
    if (Math.abs(to - this.#to) < EPS && !this.done) {
      return;
    }

    this.#from = this.value;
    this.#to = to;
    this.#spec = spec;
    this.#at = 0;
    this.#progress = 0;
    this.#frames = 0;
    this.#gain = gainOf(spec.durationMs);
  }

  snap(value: number): void {
    this.#from = value;
    this.#to = value;
    this.#at = this.#spec.durationMs;
    this.#progress = 1;
    this.#frames = (this.#at * NATIVE_HZ) / MS_PER_S;
  }

  tick(deltaMs: number): void {
    if (this.#spec.accelMode === AccelMode.Approach) {
      if (this.done) {
        return;
      }

      this.#at += Math.max(0, deltaMs);
      const frames = Math.floor((this.#at * NATIVE_HZ) / MS_PER_S + EPS);

      while (this.#frames < frames && this.#progress < 1) {
        this.#progress = step(this.#progress, this.#gain);
        this.#frames += 1;
      }

      return;
    }

    if (this.#at < this.#spec.durationMs) {
      this.#at = Math.min(this.#at + deltaMs, this.#spec.durationMs);
    }
  }
}
