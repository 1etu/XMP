import { ITEM_MOVE } from "../anim/spec.js";
import type { Scheduler } from "../anim/sched.js";

import { Rail } from "./rail.js";

export class PhXmList extends Rail {
  constructor(sched: Scheduler) {
    super(sched, ITEM_MOVE);
  }
}
