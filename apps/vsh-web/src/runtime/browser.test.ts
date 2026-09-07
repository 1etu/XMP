import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BROWSER_HOME, browserUrl, WebBrowser } from "./browser.js";
import type { BrowserWindow } from "./browser.js";

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
