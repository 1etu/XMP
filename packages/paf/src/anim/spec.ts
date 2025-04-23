import { design, verified } from "@vsh/resource";

import { AccelMode } from "./accel.js";

export interface Spec {
  readonly durationMs: number;
  readonly accelMode: AccelMode;
}

export interface Track {
  readonly from: number;
  readonly to: number;
  readonly spec: Spec;
}
