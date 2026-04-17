import { AccelMode, Scalar } from "@vsh/paf";
import { design } from "@vsh/qgl";
import type { Command } from "@vsh/libpad";

export const BROWSER_HOME = "xmb://home";
const MAX_WINDOWS = design(6);
const MAX_HISTORY = design(64);
const PANEL_MOVE = { durationMs: design(300), accelMode: AccelMode.Decelerate };
const STORAGE_KEY = "xmp.browser";

export type BrowserPanel =
  | "menu"
  | "view"
  | "tools"
  | "file"
  | "bookmarks"
  | "history"
  | "windows"
  | "address"
  | "search"
  | "information";
export interface BrowserEntry {
  readonly href: string;
  readonly title: string;
}
export interface BrowserWindow {
  readonly id: number;
  readonly entries: readonly BrowserEntry[];
  readonly position: number;
  readonly revision: number;
  readonly loading: boolean;
  readonly failed: boolean;
}
export interface BrowserState {
  readonly windows: readonly BrowserWindow[];
  readonly active: number;
  readonly panel: BrowserPanel | undefined;
  readonly departing: BrowserPanel | undefined;
  readonly selected: number;
  readonly panelAlpha: number;
  readonly maximum: boolean;
  readonly zoom: number;
  readonly home: string;
  readonly bookmarks: readonly BrowserEntry[];
  readonly history: readonly BrowserEntry[];
}
export interface BrowserOption {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly child?: boolean;
  readonly disabled?: boolean;
  readonly hint?: string;
}

export function browserUrl(value: string): string | undefined {
  if (value === BROWSER_HOME) return value;
  const text = value.trim();
  if (text === "") return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export class WebBrowser {
  readonly #watchers = new Set<() => void>();
  readonly #fade = new Scalar(0);
  #serial = 0;
  #state: BrowserState = {
    windows: [],
    active: 0,
    panel: undefined,
    departing: undefined,
    selected: 0,
    panelAlpha: 0,
    maximum: false,
    zoom: 1,
    home: BROWSER_HOME,
    bookmarks: [],
    history: [],
  };
  readonly #external: (href: string) => void;
  readonly #exit: () => void;

  constructor(external: (href: string) => void, exit: () => void) {
    this.#external = external;
    this.#exit = exit;
    try {
      const saved: unknown = JSON.parse(
        globalThis.localStorage.getItem(STORAGE_KEY) ?? "null",
      );
      if (typeof saved === "object" && saved !== null) {
        const data = saved as Record<string, unknown>;
        const entries = (value: unknown): BrowserEntry[] =>
          Array.isArray(value)
            ? value
                .flatMap((item: unknown) => {
                  if (typeof item !== "object" || item === null) return [];
                  const entry = item as Record<string, unknown>;
                  const href =
                    typeof entry["href"] === "string"
                      ? browserUrl(entry["href"])
                      : undefined;
                  return href !== undefined && typeof entry["title"] === "string"
                    ? [{ href, title: entry["title"] }]
                    : [];
                })
                .slice(0, MAX_HISTORY)
            : [];
        this.#state = {
          ...this.#state,
          bookmarks: entries(data["bookmarks"]),
          history: entries(data["history"]),
          home:
            typeof data["home"] === "string"
              ? (browserUrl(data["home"]) ?? BROWSER_HOME)
              : BROWSER_HOME,
        };
      }
    } catch {
      return;
    }
  }

  readonly subscribe = (watcher: () => void): (() => void) => {
    this.#watchers.add(watcher);
    return () => this.#watchers.delete(watcher);
  };
  readonly snapshot = (): BrowserState => this.#state;
  get window(): BrowserWindow | undefined {
    return this.#state.windows[this.#state.active];
  }
  get entry(): BrowserEntry {
    const win = this.window;
    return (
      win?.entries[win.position] ?? { href: BROWSER_HOME, title: "Internet Browser" }
    );
  }
  get blocked(): boolean {
    return /^https?:\/\/(?:www\.)?github\.com(?:\/|$)/i.test(this.entry.href);
  }

  #set(patch: Partial<BrowserState>): void {
    this.#state = { ...this.#state, ...patch };
    for (const watcher of this.#watchers) watcher();
  }
  #save(): void {
    try {
      globalThis.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          bookmarks: this.#state.bookmarks,
          history: this.#state.history,
          home: this.#state.home,
        }),
      );
    } catch {
      return;
    }
  }
  #window(patch: Partial<BrowserWindow>): void {
    this.#set({
      windows: this.#state.windows.map((win, index) =>
        index === this.#state.active ? { ...win, ...patch } : win,
      ),
    });
  }

  open(href = this.#state.home, title?: string, newWindow = false): boolean {
    const url = browserUrl(href);
    if (url === undefined) return false;
    const entry = {
      href: url,
      title: title ?? (url === BROWSER_HOME ? "Internet Browser" : url),
    };
    if (newWindow || this.window === undefined) {
      if (this.#state.windows.length >= MAX_WINDOWS) return false;
      const windows = [
        ...this.#state.windows,
        {
          id: ++this.#serial,
          entries: [entry],
          position: 0,
          revision: 0,
          loading: url !== BROWSER_HOME,
          failed: false,
        },
      ];
      this.#set({ windows, active: windows.length - 1 });
    } else {
      const win = this.window;
      const entries = [...win.entries.slice(0, win.position + 1), entry].slice(
        -MAX_HISTORY,
      );
      this.#window({
        entries,
        position: entries.length - 1,
        revision: win.revision + 1,
        loading: url !== BROWSER_HOME,
        failed: false,
      });
    }
    this.#set({
      history: [
        entry,
        ...this.#state.history.filter((item) => item.href !== url),
      ].slice(0, MAX_HISTORY),
    });
    this.#save();
    this.panel(undefined);
    return true;
  }

  loaded(id: number, revision: number, failed = false): void {
    if (!this.#state.windows.some((win) => win.id === id && win.revision === revision))
      return;
    this.#set({
      windows: this.#state.windows.map((win) =>
        win.id === id && win.revision === revision
          ? { ...win, loading: false, failed }
          : win,
      ),
    });
  }
  select(index: number): void {
    this.#set({ selected: Math.max(0, Math.min(this.options().length - 1, index)) });
  }
  panel(panel: BrowserPanel | undefined): void {
    if (panel === this.#state.panel) return;
    this.#set({
      panel,
      departing: panel === undefined ? this.#state.panel : undefined,
      selected: 0,
    });
    this.#fade.retarget(panel === undefined ? 0 : 1, PANEL_MOVE);
  }
  advance(deltaMs: number, reduced = false): void {
    this.#fade.tick(reduced ? PANEL_MOVE.durationMs : deltaMs);
    if (
      this.#fade.value === this.#state.panelAlpha &&
      this.#state.departing === undefined
    )
      return;
    this.#set({
      panelAlpha: this.#fade.value,
      ...(this.#fade.done ? { departing: undefined } : {}),
    });
  }
  history(direction: number): void {
    const win = this.window;
    if (win === undefined) return;
    const position = Math.max(
      0,
      Math.min(win.entries.length - 1, win.position + direction),
    );
    if (position !== win.position)
      this.#window({
        position,
        revision: win.revision + 1,
        loading: win.entries[position]?.href !== BROWSER_HOME,
        failed: false,
      });
    this.panel(undefined);
  }
  bookmark(): void {
    const entry = this.entry;
    this.#set({
      bookmarks: [
        entry,
        ...this.#state.bookmarks.filter((item) => item.href !== entry.href),
      ].slice(0, MAX_HISTORY),
    });
    this.#save();
  }

  options(): readonly BrowserOption[] {
    const s = this.#state,
      win = this.window;
    switch (s.panel ?? s.departing) {
      case "view":
        return [
          { id: "maximum", label: s.maximum ? "Standard Size" : "Maximum Size" },
          { id: "zoom", label: s.zoom === 1 ? "Zoom" : "Clear Zoom" },
        ];
      case "tools":
        return [
          { id: "set-home", label: "Set as Home Page" },
          { id: "clear-history", label: "Delete History" },
          { id: "clear-bookmarks", label: "Delete Bookmarks" },
        ];
      case "file":
        return [
          { id: "address", label: "Address Entry" },
          {
            id: "new-window",
            label: "Open in New Window",
            disabled: s.windows.length >= MAX_WINDOWS,
          },
          { id: "close-window", label: "Close Window" },
          {
            id: "external",
            label: "Open in New Tab",
            disabled: this.entry.href === BROWSER_HOME,
          },
          { id: "add-bookmark", label: "Add to Bookmarks" },
          { id: "information", label: "Page Information" },
        ];
      case "bookmarks":
        return [
          { id: "add-bookmark", label: "Add to Bookmarks" },
          ...s.bookmarks.map((entry, index) => ({
            id: `bookmark:${String(index)}`,
            label: entry.title,
          })),
        ];
      case "history":
        return s.history.map((entry, index) => ({
          id: `history:${String(index)}`,
          label: entry.title,
        }));
      case "windows":
        return [
          ...s.windows.map((win, index) => ({
            id: `window:${String(index)}`,
            label: win.entries[win.position]?.title ?? "Internet Browser",
          })),
          {
            id: "new-window",
            label: "New Window",
            disabled: s.windows.length >= MAX_WINDOWS,
          },
        ];
      default:
        return [
          { id: "view", label: "View", icon: "view", child: true },
          { id: "tools", label: "Tools", icon: "tool", child: true },
          { id: "windows", label: "Window List", icon: "tab", hint: "L3" },
          { id: "search", label: "Search", icon: "search" },
          { id: "file", label: "File", icon: "file", child: true },
          {
            id: "back",
            label: "Back",
            icon: "back",
            disabled: (win?.position ?? 0) === 0,
            hint: "L1",
          },
          {
            id: "forward",
            label: "Forward",
            icon: "forward",
            disabled: win === undefined || win.position >= win.entries.length - 1,
            hint: "R1",
          },
          { id: "refresh", label: "Refresh", icon: "reload" },
          { id: "home", label: "Home", icon: "home" },
          { id: "bookmarks", label: "Bookmarks", icon: "bookmark", child: true },
          { id: "history", label: "History", icon: "history" },
          { id: "exit", label: "Exit", icon: "quit", hint: "○" },
        ];
    }
  }

  action(id: string): void {
    if (this.options().find((item) => item.id === id)?.disabled) return;
    const panels: readonly string[] = [
      "view",
      "tools",
      "file",
      "bookmarks",
      "history",
      "windows",
      "address",
      "search",
      "information",
    ];
    if (panels.includes(id)) {
      this.panel(id as BrowserPanel);
      return;
    }
    const win = this.window;
    if (id === "exit") this.#exit();
    else if (id === "back") this.history(-1);
    else if (id === "forward") this.history(1);
    else if (id === "home") this.open(this.#state.home);
    else if (id === "refresh" && win !== undefined) {
      this.#window({
        revision: win.revision + 1,
        loading: this.entry.href !== BROWSER_HOME,
        failed: false,
      });
      this.panel(undefined);
    } else if (id === "external" && this.entry.href !== BROWSER_HOME)
      this.#external(this.entry.href);
    else if (id === "maximum") {
      this.#set({ maximum: !this.#state.maximum });
      this.panel(undefined);
    } else if (id === "zoom") {
      this.#set({ zoom: this.#state.zoom === 1 ? 1.25 : 1 });
      this.panel(undefined);
    } else if (id === "set-home") {
      this.#set({ home: this.entry.href });
      this.#save();
      this.panel(undefined);
    } else if (id === "clear-history") {
      this.#set({ history: [] });
      this.#save();
      this.panel(undefined);
    } else if (id === "clear-bookmarks") {
      this.#set({ bookmarks: [] });
      this.#save();
      this.panel(undefined);
    } else if (id === "add-bookmark") {
      this.bookmark();
      this.panel("bookmarks");
    } else if (id === "new-window") this.open(BROWSER_HOME, undefined, true);
    else if (id === "close-window") {
      const windows = this.#state.windows.filter(
        (_, index) => index !== this.#state.active,
      );
      this.#set({
        windows,
        active: Math.max(0, Math.min(windows.length - 1, this.#state.active)),
      });
      this.panel(undefined);
      if (windows.length === 0) this.#exit();
    } else if (id.startsWith("window:")) {
      const active = Number(id.split(":")[1]);
      if (!Number.isInteger(active) || this.#state.windows[active] === undefined)
        return;
      this.#set({ active });
      this.panel(undefined);
    } else {
      const [source, index] = id.split(":");
      if (source !== "bookmark" && source !== "history") return;
      const entry = (
        source === "bookmark" ? this.#state.bookmarks : this.#state.history
      )[Number(index)];
      if (entry !== undefined) this.open(entry.href, entry.title);
    }
  }

  command(command: Command): void {
    const panel = this.#state.panel;
    if (command === "options") this.panel(panel === undefined ? "menu" : undefined);
    else if (command === "cancel") {
      if (panel === undefined) this.#exit();
      else this.panel(panel === "menu" ? undefined : "menu");
    } else if (command === "l1") this.history(-1);
    else if (command === "r1") this.history(1);
    else if (panel !== undefined) {
      if (command === "up" || command === "down")
        this.select(this.#state.selected + (command === "down" ? 1 : -1));
      else if (command === "left") this.panel(panel === "menu" ? undefined : "menu");
      else {
        const option = this.options()[this.#state.selected];
        if (option !== undefined) this.action(option.id);
      }
    }
  }
}
