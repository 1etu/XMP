const MAX_DELTA_MS = 100;

export interface Frame {
  readonly no: number;
  readonly deltaMs: number;
  readonly elapsedMs: number;
}
