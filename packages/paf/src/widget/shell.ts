import { Scheduler } from "../anim/sched.js";

import { PhXmBar } from "./bar.js";
import { PhXmList } from "./list.js";

export class PhXmShell {
  readonly sched = new Scheduler();
  readonly bar = new PhXmBar(this.sched);
  readonly list = new PhXmList(this.sched);

  #category = 0;

  get category(): number {
    return this.#category;
  }

  get settled(): boolean {
    return this.sched.settled;
  }

  sync(category: number, index: number): void {
    if (category !== this.#category) {
      this.#category = category;
      this.bar.moveTo(category);
      this.list.snapTo(index);
      return;
    }

    this.list.moveTo(index);
  }

  tick(deltaMs: number): void {
    this.sched.tick(deltaMs);
  }
}
