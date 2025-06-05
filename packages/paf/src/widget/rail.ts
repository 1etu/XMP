import type { Scalar } from "../anim/scalar.js";
import type { Scheduler } from "../anim/sched.js";
import type { Spec } from "../anim/spec.js";

export abstract class Rail {
  readonly #track: Scalar;
  readonly #spec: Spec;

  protected constructor(sched: Scheduler, spec: Spec) {
    this.#track = sched.add(0);
    this.#spec = spec;
  }

  get offset(): number {
    return this.#track.value;
  }

  get settled(): boolean {
    return this.#track.done;
  }

  moveTo(index: number): void {
    this.#track.retarget(index, this.#spec);
  }

  snapTo(index: number): void {
    this.#track.snap(index);
  }
}
