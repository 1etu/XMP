export type BootState =
  "cold" | "initializing" | "loading-shell" | "starting" | "ready" | "failed";

export interface BootSnapshot {
  readonly state: BootState;
  readonly stage: string;
  readonly done: number;
  readonly total: number;
  readonly detail: string;
}
