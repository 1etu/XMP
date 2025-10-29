import { design } from "@vsh/resource";

import { isRepeatable } from "./cmd.js";
import type { Command } from "./cmd.js";

export interface Repeat {
  readonly holdMs: number;
  readonly rateMs: number;
  readonly fastAfterMs: number;
  readonly fastRateMs: number;
}
