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

export class WhatsNew {
  readonly #source: readonly WhatsNewItem[];
  readonly #loadImage: ImageLoader;
  readonly #storage: Storage | undefined;
  readonly #listeners = new Set<() => void>();
  readonly #frameListeners = new Set<() => void>();
  readonly #row = new Scalar(0);
  #scale: Scalar[] = [];
  #opacity: Scalar[] = [];
  #snapshot: WhatsNewSnapshot;
  #abort: AbortController | undefined;
  #generation = 0;
  #elapsed = 0;
  #titleElapsed = 0;
  #titleWidth = 0;
  #open = false;

  constructor(
    source = whatsNewItems,
    loadImage: ImageLoader = loadCardImage,
    storage?: Storage,
  ) {
    this.#source = source;
    this.#loadImage = loadImage;
    let saved = storage;
    let seen: string[] = [];
    try {
      saved ??= (globalThis as { readonly localStorage?: Storage }).localStorage;
      const value: unknown = JSON.parse(saved?.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(value))
        seen = value.filter(
          (id): id is string =>
            typeof id === "string" && source.some((item) => item.id === id),
        );
    } catch {
      saved = undefined;
    }
    this.#storage = saved;
    this.#snapshot = {
      items: source,
      selected: 0,
      states: source.map(() => "loading"),
      seen,
      recentStart: source.length,
    };
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  readonly snapshot = (): WhatsNewSnapshot => this.#snapshot;
  readonly onFrame = (listener: () => void): (() => void) => {
    this.#frameListeners.add(listener);
    return () => {
      this.#frameListeners.delete(listener);
    };
  };

  #emit(): void {
    for (const listener of this.#listeners) listener();
  }

  open(): void {
    if (this.#open) return;
    this.#open = true;
    this.#abort = new AbortController();
    this.#generation += 1;
    const recent = this.#snapshot.seen
      .flatMap((id) => this.#source.filter((item) => item.id === id))
      .slice(0, 3);
    const items = [...this.#source, ...recent];
    const selected = Math.min(this.#snapshot.selected, Math.max(0, items.length - 1));
    this.#snapshot = {
      ...this.#snapshot,
      items,
      selected,
      recentStart: this.#source.length,
      states: items.map(() => "loading"),
    };
    this.#row.snap(Math.floor(selected / WHATS_NEW.columns));
    this.#scale = items.map(
      (_, index) => new Scalar(index === selected ? 1 : WHATS_NEW.scale),
    );
    this.#opacity = items.map(() => new Scalar(0));
    this.#elapsed = 0;
    this.#titleElapsed = 0;
    this.#emit();
    for (let index = 0; index < items.length; index += 1) this.#load(index);
  }

  close(): void {
    this.#open = false;
    this.#generation += 1;
    this.#abort?.abort();
    this.#abort = undefined;
  }

  #load(index: number): void {
    const item = this.#snapshot.items[index];
    const signal = this.#abort?.signal;
    if (item === undefined || signal === undefined) return;
    const generation = this.#generation;
    void this.#loadImage(item.image, signal).then(
      () => {
        this.#loaded(index, generation, "ready");
      },
      () => {
        this.#loaded(index, generation, "failed");
      },
    );
  }

  #loaded(index: number, generation: number, state: CardState): void {
    if (!this.#open || generation !== this.#generation) return;
    const states = [...this.#snapshot.states];
    states[index] = state;
    this.#snapshot = { ...this.#snapshot, states };
    this.#opacity[index]?.retarget(1, MOVE);
    this.#emit();
  }

  select(index: number): boolean {
    if (
      !this.#open ||
      index === this.#snapshot.selected ||
      index < 0 ||
      index >= this.#snapshot.items.length
    )
      return false;
    this.#scale[this.#snapshot.selected]?.retarget(WHATS_NEW.scale, MOVE);
    this.#scale[index]?.retarget(1, MOVE);
    this.#row.retarget(Math.floor(index / WHATS_NEW.columns), MOVE);
    this.#snapshot = { ...this.#snapshot, selected: index };
    this.#titleElapsed = 0;
    this.#titleWidth = 0;
    this.#emit();
    return true;
  }

  command(command: Command): ContentAction | "close" | undefined {
    const index = this.#snapshot.selected;
    if (command === "cancel" || (command === "left" && index % WHATS_NEW.columns === 0))
      return "close";
    if (command === "decide") return this.activate();
    if (command === "options") {
      const item = this.#snapshot.items[index];
      return item === undefined ? undefined : { kind: "information", id: item.id };
    }
    const next =
      command === "up"
        ? index - WHATS_NEW.columns
        : command === "down"
          ? index + WHATS_NEW.columns
          : command === "left"
            ? index - 1
            : command === "right" && index % WHATS_NEW.columns < WHATS_NEW.columns - 1
              ? index + 1
              : index;
    this.select(next);
    return undefined;
  }

  activate(): ContentAction | undefined {
    const { selected, states, items } = this.#snapshot;
    const item = items[selected];
    if (item === undefined) return undefined;
    if (states[selected] === "failed") {
      const next = [...states];
      next[selected] = "loading";
      this.#snapshot = { ...this.#snapshot, states: next };
      this.#opacity[selected]?.snap(0);
      this.#emit();
      this.#load(selected);
      return undefined;
    }
    if (states[selected] !== "ready") return undefined;
    const seen = [item.id, ...this.#snapshot.seen.filter((id) => id !== item.id)];
    this.#snapshot = { ...this.#snapshot, seen };
    this.#emit();
    try {
      this.#storage?.setItem(HISTORY_KEY, JSON.stringify(seen));
    } catch {
      return item.action;
    }
    return item.action;
  }

  measureTitle(width: number): void {
    this.#titleWidth = width;
  }

  advance(deltaMs: number, reduced = false): boolean {
    if (!this.#open) return false;
    this.#elapsed += reduced ? 0 : deltaMs;
    this.#titleElapsed += reduced ? 0 : deltaMs;
    this.#row.tick(reduced ? WHATS_NEW.focusMs : deltaMs);
    for (const track of this.#scale) track.tick(reduced ? WHATS_NEW.focusMs : deltaMs);
    for (const track of this.#opacity)
      track.tick(reduced ? WHATS_NEW.focusMs : deltaMs);
    for (const listener of this.#frameListeners) listener();
    return true;
  }

  get frame(): { row: number; rotation: number; titleX: number; previewTurn: number } {
    const overflow = Math.max(0, this.#titleWidth - (WHATS_NEW.captionWidth - 48));
    const travel = (overflow / WHATS_NEW.titleSpeed) * 1000;
    const phase = this.#titleElapsed % (travel + WHATS_NEW.titleDelayMs * 2);
    return {
      row: this.#row.value,
      rotation: (this.#elapsed / WHATS_NEW.loadingMs) * 360,
      previewTurn:
        ((WHATS_NEW.loadingTurn * 180) / Math.PI) *
        (1 - Math.sin(this.#elapsed / WHATS_NEW.previewMotionMs)),
      titleX: -Math.min(
        overflow,
        (Math.max(0, phase - WHATS_NEW.titleDelayMs) / 1000) * WHATS_NEW.titleSpeed,
      ),
    };
  }

  cardFrame(index: number): { scale: number; opacity: number } {
    return {
      scale: this.#scale[index]?.value ?? WHATS_NEW.scale,
      opacity: this.#opacity[index]?.value ?? 0,
    };
  }
}
