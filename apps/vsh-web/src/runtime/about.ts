import { verified } from "@vsh/qgl";

export const ABOUT_EXIT_MS = verified(200);
export const ABOUT_SCROLL_SPEED = verified(120);
const FAST_SCROLL = verified(4);
const LOGICAL_HEIGHT = verified(1080);

export interface AboutRollOptions {
  readonly contentHeight: number;
  readonly viewportHeight?: number;
  readonly reducedMotion?: boolean;
}

export interface AboutFrame {
  readonly offset: number;
  readonly top: number;
  readonly paused: boolean;
  readonly done: boolean;
}
