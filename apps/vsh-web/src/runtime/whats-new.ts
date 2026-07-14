import { whatsNewItems } from "@vsh/content";
import type { ContentAction, WhatsNewItem } from "@vsh/content";
import type { Command } from "@vsh/libpad";
import { AccelMode, Scalar } from "@vsh/paf";
import { design, measured, verified } from "@vsh/resource";

export const WHATS_NEW = {
  columns: verified(3),
  focusMs: verified(200),
  scale: verified(0.67),
  captionWidth: verified(502),
  captionHeight: verified(74),
  cardHeight: measured(421),
  columnPitch: measured(430),
  rowPitch: measured(370),
  x: measured(695),
  y: measured(507),
  groupWidth: verified(1260),
  groupHeight: verified(343),
  loadingTurn: verified(-0.125664),
  previewMotionMs: measured(6000),
  loadingMs: measured(1200),
  loadTimeoutMs: design(12000),
  titleDelayMs: measured(1000),
  titleSpeed: measured(45),
} as const;

const MOVE = { durationMs: WHATS_NEW.focusMs, accelMode: AccelMode.Decelerate };
const HISTORY_KEY = "vsh.whats-new.visited";
export type CardState = "loading" | "ready" | "failed";