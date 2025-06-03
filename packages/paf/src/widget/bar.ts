import { CATEGORY_MOVE } from "../anim/spec.js";
import type { Scheduler } from "../anim/sched.js";

import { Rail } from "./rail.js";

export class PhXmBar extends Rail {
  constructor(sched: Scheduler) {
    super(sched, CATEGORY_MOVE);
  }
}
