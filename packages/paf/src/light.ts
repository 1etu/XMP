import { verified } from "@vsh/resource";

const HALF_CYCLE_MS = verified(600);
const GLOW_BASE = verified(0.3);
const GLOW_RANGE = verified(0.38);
const HELD = 0.5;

export function focusLightAt(elapsedMs: number, reduced = false): number {
  const phase = (Math.max(0, elapsedMs) / HALF_CYCLE_MS) % 2;
  const progress = reduced ? HELD : 1 - Math.abs(1 - phase);

  return GLOW_BASE + GLOW_RANGE * progress;
}
