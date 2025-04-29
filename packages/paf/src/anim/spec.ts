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

export const STILL: Spec = {
  durationMs: 0,
  accelMode: AccelMode.Linear,
};

export const CATEGORY_MOVE: Spec = {
  durationMs: verified(200),
  accelMode: AccelMode.Approach,
};

export const ITEM_MOVE: Spec = {
  durationMs: verified(200),
  accelMode: AccelMode.Approach,
};

export const LEVEL_PUSH: Spec = {
  durationMs: design(220),
  accelMode: AccelMode.Decelerate,
};

export const FADE: Spec = {
  durationMs: design(200),
  accelMode: AccelMode.Linear,
};
