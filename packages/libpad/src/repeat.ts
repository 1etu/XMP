import { design } from "@vsh/resource";

import { isRepeatable } from "./cmd.js";
import type { Command } from "./cmd.js";

export interface Repeat {
  readonly holdMs: number;
  readonly rateMs: number;
  readonly fastAfterMs: number;
  readonly fastRateMs: number;
}

export const REPEAT: Repeat = {
  holdMs: design(400),
  rateMs: design(120),
  fastAfterMs: design(1600),
  fastRateMs: design(60),
};
