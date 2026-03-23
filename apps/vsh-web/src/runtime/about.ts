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

export class AboutRoll {
  readonly #viewportHeight: number;
  readonly #distance: number;
  readonly #reducedMotion: boolean;
  #offset: number;
  #paused = false;
  #direction: -1 | 0 | 1 = 0;

  constructor(options: AboutRollOptions) {
    this.#viewportHeight = options.viewportHeight ?? LOGICAL_HEIGHT;
    this.#distance = this.#viewportHeight + Math.max(0, options.contentHeight);
    this.#reducedMotion = options.reducedMotion ?? false;
    this.#offset = this.#reducedMotion ? this.#viewportHeight : 0;
  }

  get frame(): AboutFrame {
    return {
      offset: this.#offset,
      top: this.#viewportHeight - this.#offset,
      paused: this.#paused,
      done: this.#offset >= this.#distance,
    };
  }

  advance(deltaMs: number): AboutFrame {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return this.frame;
    const rate =
      this.#direction !== 0
        ? this.#direction * FAST_SCROLL
        : this.#paused || this.#reducedMotion
          ? 0
          : 1;
    return this.seek(this.#offset + (deltaMs * ABOUT_SCROLL_SPEED * rate) / 1000);
  }

  togglePause(): AboutFrame {
    this.#paused = !this.#paused;
    return this.frame;
  }

  direction(direction: -1 | 0 | 1): void {
    this.#direction = direction;
  }

  seek(offset: number): AboutFrame {
    if (Number.isFinite(offset))
      this.#offset = Math.min(this.#distance, Math.max(0, offset));
    return this.frame;
  }
}
