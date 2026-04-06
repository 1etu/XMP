import { boardChannels, boardItems } from "@vsh/content";
import type { BoardChannel, BoardItem } from "@vsh/content";
import { verified } from "@vsh/qgl";

export const BOARD_EXPAND_MS = verified((8 * 1000) / 60);
export const BOARD_SCROLL_SPEED = verified(120);
export const BOARD_TITLE_DELAY_MS = verified(1000);
export const BOARD_ARTICLE_DELAY_MS = verified(3000);
export const BOARD_ARTICLE_SPEED = verified(60);
export const BOARD_ROW_HEIGHT = verified(64);
export const BOARD_DISPLAY_KEY = "vsh.information-board.display";
const TICKER_GAP = verified(11);
const VISIBLE_ROWS = verified(8);
const TITLE_WIDTH = verified(326);

export type BoardCommand =
  "up" | "down" | "left" | "right" | "decide" | "cancel" | "options";
export type BoardEffect =
  { readonly kind: "close" } | { readonly kind: "link"; readonly href: string };
export type BoardMode = "ticker" | "list" | "article" | "channels";

export interface BoardSnapshot {
  readonly enabled: boolean;
  readonly mode: BoardMode;
  readonly selected: number;
  readonly channel: BoardChannel;
  readonly channelSelected: number;
  readonly ticker: number;
  readonly items: readonly BoardItem[];
}

export interface BoardFrame {
  expansion: number;
  tickerX: number;
  titleX: number;
  listY: number;
  articleY: number;
}

export interface BoardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Board {
  readonly #items: readonly BoardItem[];
  readonly #storage: BoardStorage | undefined;
  readonly #widths = new Map<string, number>();
  readonly #listeners = new Set<() => void>();
  readonly #frame: BoardFrame = {
    expansion: 0,
    tickerX: 0,
    titleX: 0,
    listY: 0,
    articleY: 0,
  };
  #snapshot: BoardSnapshot;
  #tickerDistance = 0;
  #tickerPass = 0;
  #titleTime = 0;
  #articleHeight = 0;
  #articleViewport = 394;
  #articleTime = 0;
  #articleManual = false;

  constructor(
    items: readonly BoardItem[] = boardItems,
    enabled?: boolean,
    storage?: BoardStorage,
  ) {
    this.#items = items;
    let selectedStorage = storage;
    let display = enabled ?? false;
    try {
      const browser = globalThis as { readonly localStorage?: BoardStorage };
      selectedStorage ??= browser.localStorage;
      if (enabled === undefined)
        display = selectedStorage?.getItem(BOARD_DISPLAY_KEY) === "true";
    } catch {
      selectedStorage = undefined;
    }
    this.#storage = selectedStorage;
    this.#snapshot = {
      enabled: display,
      mode: "ticker",
      selected: 0,
      channel: "all",
      channelSelected: 0,
      ticker: 0,
      items,
    };
  }

  get snapshot(): BoardSnapshot {
    return this.#snapshot;
  }
  get frame(): Readonly<BoardFrame> {
    return this.#frame;
  }
  get current(): BoardItem | undefined {
    return this.#snapshot.items[this.#snapshot.selected];
  }
  get headline(): BoardItem | undefined {
    return this.#snapshot.items[this.#snapshot.ticker];
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  open(): void {
    this.#set({ enabled: true, mode: "list" });
    this.#saveDisplay(true);
    this.#titleTime = 0;
  }

  close(): void {
    this.#set({ mode: "ticker" });
  }

  setDisplay(enabled: boolean): void {
    this.#set({ enabled });
    this.#saveDisplay(enabled);
  }

  measureTitle(id: string, width: number): void {
    if (Number.isFinite(width) && width >= 0) this.#widths.set(id, width);
  }

  measureArticle(height: number, viewport = 394): void {
    if (!Number.isFinite(height) || !Number.isFinite(viewport)) return;
    this.#articleHeight = Math.max(0, height);
    this.#articleViewport = Math.max(0, viewport);
    this.#frame.articleY = Math.min(
      Math.max(0, height - viewport),
      this.#frame.articleY,
    );
  }

  scrollArticle(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.#articleManual = true;
    this.#frame.articleY = Math.min(
      Math.max(0, this.#articleHeight - this.#articleViewport),
      Math.max(0, this.#frame.articleY + delta),
    );
  }

  select(index: number): void {
    if (!Number.isFinite(index)) return;
    const count =
      this.#snapshot.mode === "channels"
        ? boardChannels.length
        : this.#snapshot.items.length;
    const selected = Math.min(Math.max(0, count - 1), Math.max(0, Math.trunc(index)));
    if (
      selected ===
      (this.#snapshot.mode === "channels"
        ? this.#snapshot.channelSelected
        : this.#snapshot.selected)
    )
      return;
    if (this.#snapshot.mode === "channels") this.#set({ channelSelected: selected });
    else {
      this.#set({ selected });
      this.#titleTime = 0;
      this.#frame.titleX = 0;
      const top = -this.#frame.listY / BOARD_ROW_HEIGHT;
      if (selected < top) this.#frame.listY = -selected * BOARD_ROW_HEIGHT;
      if (selected >= top + VISIBLE_ROWS)
        this.#frame.listY = -(selected - VISIBLE_ROWS + 1) * BOARD_ROW_HEIGHT;
    }
  }

  command(command: BoardCommand): BoardEffect | undefined {
    const mode = this.#snapshot.mode;
    if (command === "cancel" || command === "left") {
      if (mode === "article" || mode === "channels") {
        this.#set({ mode: "list" });
        this.#titleTime = 0;
      } else {
        this.close();
        return { kind: "close" };
      }
    } else if (command === "options") {
      this.#set({
        mode: mode === "channels" ? "list" : "channels",
        channelSelected: boardChannels.findIndex(
          (channel) => channel.id === this.#snapshot.channel,
        ),
      });
    } else if (command === "up" || command === "down") {
      const direction = command === "up" ? -1 : 1;
      if (mode === "article") this.scrollArticle(direction * BOARD_ROW_HEIGHT);
      else
        this.select(
          (mode === "channels"
            ? this.#snapshot.channelSelected
            : this.#snapshot.selected) + direction,
        );
    } else {
      if (mode === "ticker") this.open();
      else if (mode === "channels") {
        const channel = boardChannels[this.#snapshot.channelSelected]?.id ?? "all";
        const items =
          channel === "all"
            ? this.#items
            : this.#items.filter((item) => item.channel === channel);
        this.#set({ channel, items, selected: 0, ticker: 0, mode: "list" });
        this.#tickerDistance = 0;
        this.#tickerPass = 0;
        this.#titleTime = 0;
        this.#frame.listY = 0;
        this.#frame.tickerX = 0;
      } else if (mode === "list" && this.current !== undefined) {
        this.#set({ mode: "article" });
        this.#frame.articleY = 0;
        this.#articleTime = 0;
        this.#articleManual = false;
      } else if (mode === "article" && this.current?.href !== undefined)
        return { kind: "link", href: this.current.href };
    }
    return undefined;
  }

  advance(deltaMs: number, reduced = false): boolean {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    let changed = false;
    const target = this.#snapshot.mode === "ticker" ? 0 : 1;
    const expansion = reduced
      ? target
      : Math.min(
          1,
          Math.max(
            0,
            this.#frame.expansion +
              (target === 1 ? deltaMs : -deltaMs) / BOARD_EXPAND_MS,
          ),
        );
    if (expansion !== this.#frame.expansion) {
      this.#frame.expansion = expansion;
      changed = true;
    }
    if (reduced || !this.#snapshot.enabled || this.#snapshot.items.length === 0)
      return changed;
    if (this.#snapshot.mode === "ticker") {
      let distance = (deltaMs * BOARD_SCROLL_SPEED) / 1000;
      const cycle = this.#snapshot.items.reduce(
        (sum, item) => sum + 2 * (this.#width(item) + TICKER_GAP),
        0,
      );
      distance %= cycle;
      this.#tickerDistance += distance;
      while (this.#tickerDistance >= this.#width(this.headline) + TICKER_GAP) {
        this.#tickerDistance -= this.#width(this.headline) + TICKER_GAP;
        this.#tickerPass += 1;
        if (this.#tickerPass === 2) {
          this.#tickerPass = 0;
          this.#set({
            ticker: (this.#snapshot.ticker + 1) % this.#snapshot.items.length,
          });
        }
      }
      this.#frame.tickerX = this.#tickerDistance === 0 ? 0 : -this.#tickerDistance;
      return distance > 0 || changed;
    }
    if (this.#snapshot.mode === "list" && this.#width(this.current) > TITLE_WIDTH) {
      this.#titleTime += deltaMs;
      const duration =
        BOARD_TITLE_DELAY_MS +
        ((this.#width(this.current) + 5) / BOARD_SCROLL_SPEED) * 1000;
      this.#titleTime %= duration;
      this.#frame.titleX = Math.min(
        0,
        ((BOARD_TITLE_DELAY_MS - this.#titleTime) * BOARD_SCROLL_SPEED) / 1000,
      );
      return true;
    }
    if (
      this.#snapshot.mode === "article" &&
      !this.#articleManual &&
      this.#articleHeight > this.#articleViewport
    ) {
      const duration =
        BOARD_ARTICLE_DELAY_MS + (this.#articleHeight / BOARD_ARTICLE_SPEED) * 1000;
      this.#articleTime = (this.#articleTime + deltaMs) % duration;
      this.#frame.articleY = Math.max(
        0,
        ((this.#articleTime - BOARD_ARTICLE_DELAY_MS) * BOARD_ARTICLE_SPEED) / 1000,
      );
      return true;
    }
    return changed;
  }

  #width(item: BoardItem | undefined): number {
    return item === undefined ? 0 : (this.#widths.get(item.id) ?? TITLE_WIDTH);
  }
  #saveDisplay(enabled: boolean): void {
    try {
      this.#storage?.setItem(BOARD_DISPLAY_KEY, String(enabled));
    } catch {
      return;
    }
  }
  #set(value: Partial<BoardSnapshot>): void {
    this.#snapshot = { ...this.#snapshot, ...value };
    for (const listener of this.#listeners) listener();
  }
}
