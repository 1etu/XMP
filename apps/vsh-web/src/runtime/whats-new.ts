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
export type ImageLoader = (src: string, signal: AbortSignal) => Promise<void>;
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface WhatsNewSnapshot {
  readonly items: readonly WhatsNewItem[];
  readonly selected: number;
  readonly states: readonly CardState[];
  readonly seen: readonly string[];
  readonly recentStart: number;
}

export function loadCardImage(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: unknown): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error === undefined) resolve();
      else
        reject(
          error instanceof Error
            ? error
            : new Error("The image could not load.", { cause: error }),
        );
    };
    const abort = (): void => {
      image.src = "";
      finish(new DOMException("Image load cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      image.src = "";
      finish(new Error("The image did not load."));
    }, WHATS_NEW.loadTimeoutMs);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    image.src = src;
    void image.decode().then(() => {
      finish();
    }, finish);
  });
}
