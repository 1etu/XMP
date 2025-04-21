import { design, verified } from "@vsh/resource";

import { AccelMode } from "./accel.js";

export interface Spec {
  readonly durationMs: number;
  readonly accelMode: AccelMode;
}
