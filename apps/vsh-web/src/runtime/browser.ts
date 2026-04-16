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
