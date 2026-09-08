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

function setup() {
  const external = vi.fn();
  const exit = vi.fn();
  return { browser: new WebBrowser(external, exit), external, exit };
}

function active(browser: WebBrowser): BrowserWindow {
  const win = browser.window;
  if (win === undefined) throw new Error("The browser has no active window");
  return win;
}

describe("browserUrl", () => {
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///C:/Windows/System32/config/SAM",
    "blob:https://example.com/id",
    "about:blank",
    "mailto:someone@example.com",
    "ftp://example.com/",
    "xmb://other",
    "https://name:secret@example.com/",
    "https://name@example.com/",
    "http://:secret@example.com/",
    "https://example.com:bad-port/",
    "",
    "   ",
  ])("rejects an unsafe or invalid address: %s", (value) => {
    expect(browserUrl(value)).toBeUndefined();
  });

  it("normalizes web addresses and retains the internal home page", () => {
    expect(browserUrl(" Example.COM/a?q=one#two ")).toBe(
      "https://example.com/a?q=one#two",
    );
    expect(browserUrl("https://example.com:443")).toBe("https://example.com/");
    expect(browserUrl("http://example.com/path")).toBe("http://example.com/path");
    expect(browserUrl(BROWSER_HOME)).toBe(BROWSER_HOME);
  });
});

describe("WebBrowser navigation", () => {
  it("rejects unsafe navigation without changing the page or saved history", () => {
    const { browser, external } = setup();
    browser.open("https://example.com/a", "A");
    const before = browser.snapshot();
    const saved = storage.get("xmp.browser");
    expect(browser.open("javascript:alert(1)")).toBe(false);
    expect(browser.snapshot()).toBe(before);
    expect(storage.get("xmp.browser")).toBe(saved);
    expect(external).not.toHaveBeenCalled();
  });

  it("drops only the forward branch when a new page follows Back", () => {
    const { browser } = setup();
    for (const name of ["a", "b", "c"]) browser.open(`https://example.com/${name}`);
    browser.history(-1);
    expect(browser.entry.href).toBe("https://example.com/b");
    browser.open("https://example.com/d");
    expect(active(browser).entries.map((entry) => entry.href)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/d",
    ]);
    browser.history(1);
    expect(browser.entry.href).toBe("https://example.com/d");
    browser.history(-1);
    browser.history(-1);
    const revision = active(browser).revision;
    browser.history(-1);
    expect(browser.entry.href).toBe("https://example.com/a");
    expect(active(browser).revision).toBe(revision);
    expect(browser.snapshot().history.some((entry) => entry.href.endsWith("/c"))).toBe(
      true,
    );
  });

  it("returns to the internal home page without waiting for an iframe load", () => {
    const { browser } = setup();
    browser.open();
    browser.open("https://example.com/");
    browser.history(-1);
    expect(browser.entry.href).toBe(BROWSER_HOME);
    expect(active(browser)).toMatchObject({ loading: false, failed: false });
    browser.history(1);
    expect(active(browser).loading).toBe(true);
  });

  it("ignores stale load completions after navigation and refresh", () => {
    const { browser } = setup();
    browser.open("https://example.com/a");
    const first = active(browser);
    browser.open("https://example.com/b");
    const second = active(browser);
    browser.loaded(first.id, first.revision, true);
    expect(active(browser)).toMatchObject({ loading: true, failed: false });
    browser.loaded(second.id, second.revision, true);
    expect(active(browser)).toMatchObject({ loading: false, failed: true });
    browser.action("refresh");
    const refreshed = active(browser);
    expect(refreshed).toMatchObject({ loading: true, failed: false });
    browser.loaded(second.id, second.revision);
    expect(active(browser).loading).toBe(true);
    browser.loaded(refreshed.id, refreshed.revision);
    expect(active(browser).loading).toBe(false);
  });

  it("completes the matching inactive window without changing active focus", () => {
    const { browser } = setup();
    browser.open("https://example.com/a");
    const first = active(browser);
    browser.open("https://example.com/b", "B", true);
    const second = active(browser);
    browser.loaded(first.id, first.revision, true);
    expect(browser.snapshot().windows[0]).toMatchObject({
      loading: false,
      failed: true,
    });
    expect(active(browser)).toEqual(second);
  });

  it("bounds per-window history and moves duplicate visits to the front", () => {
    const { browser } = setup();
    for (let index = 0; index < 70; index += 1)
      browser.open(`https://example.com/${String(index)}`);
    expect(active(browser).entries).toHaveLength(64);
    expect(active(browser).entries[0]?.href).toBe("https://example.com/6");
    expect(active(browser).position).toBe(63);
    browser.open("https://example.com/20", "Revisited");
    expect(browser.snapshot().history).toHaveLength(64);
    expect(browser.snapshot().history[0]).toEqual({
      href: "https://example.com/20",
      title: "Revisited",
    });
    expect(
      browser.snapshot().history.filter((entry) => entry.href.endsWith("/20")),
    ).toHaveLength(1);
  });
});

describe("WebBrowser windows", () => {
  it("keeps independent window histories and stops at the window limit", () => {
    const { browser } = setup();
    browser.open("https://example.com/a", "A");
    browser.open("https://example.com/b", "B");
    browser.open("https://example.com/c", "C", true);
    browser.action("window:0");
    expect(browser.entry.title).toBe("B");
    browser.history(-1);
    expect(browser.entry.title).toBe("A");
    browser.action("window:1");
    expect(browser.entry.title).toBe("C");
    for (let index = 0; index < 4; index += 1)
      expect(browser.open(BROWSER_HOME, undefined, true)).toBe(true);
    const before = browser.snapshot();
    expect(browser.open("https://example.com/overflow", "Overflow", true)).toBe(false);
    expect(browser.snapshot()).toBe(before);
    browser.panel("windows");
    expect(browser.options().find((item) => item.id === "new-window")?.disabled).toBe(
      true,
    );
  });

  it("closes one window at a time and ignores its late completion", () => {
    const { browser, exit } = setup();
    browser.open("https://example.com/a");
    browser.open("https://example.com/b", "B", true);
    const closed = active(browser);
    browser.action("close-window");
    expect(browser.snapshot().windows).toHaveLength(1);
    expect(browser.entry.href).toBe("https://example.com/a");
    const before = browser.snapshot();
    browser.loaded(closed.id, closed.revision, true);
    expect(browser.snapshot()).toBe(before);
    expect(exit).not.toHaveBeenCalled();
    browser.action("close-window");
    expect(browser.snapshot().windows).toHaveLength(0);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it.each(["window:-1", "window:999", "window:NaN", "window:1.5", "garbage:0"])(
    "ignores an invalid window or history action: %s",
    (action) => {
      const { browser } = setup();
      browser.open("https://example.com/a");
      browser.open("https://example.com/b");
      const before = browser.snapshot();
      browser.action(action);
      expect(browser.snapshot()).toBe(before);
    },
  );
});

describe("WebBrowser menus", () => {
  it("returns from a submenu to the menu before exiting the browser", () => {
    const { browser, exit } = setup();
    browser.open();
    browser.command("options");
    browser.command("decide");
    expect(browser.snapshot().panel).toBe("view");
    browser.command("cancel");
    expect(browser.snapshot().panel).toBe("menu");
    browser.command("cancel");
    expect(browser.snapshot().panel).toBeUndefined();
    expect(exit).not.toHaveBeenCalled();
    browser.command("cancel");
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("retains a departing submenu until its fade completes", () => {
    const { browser } = setup();
    browser.panel("view");
    browser.advance(300);
    expect(browser.snapshot().panelAlpha).toBe(1);
    browser.panel(undefined);
    expect(browser.snapshot().departing).toBe("view");
    expect(browser.options().map((option) => option.id)).toEqual(["maximum", "zoom"]);
    browser.advance(150);
    expect(browser.snapshot().panelAlpha).toBeGreaterThan(0);
    expect(browser.snapshot().panelAlpha).toBeLessThan(1);
    browser.advance(150);
    expect(browser.snapshot()).toMatchObject({
      panelAlpha: 0,
      departing: undefined,
    });
  });

  it("finishes reduced-motion panels without a real-time wait", () => {
    const { browser } = setup();
    browser.panel("menu");
    browser.advance(0, true);
    expect(browser.snapshot().panelAlpha).toBe(1);
    browser.panel(undefined);
    browser.advance(0, true);
    expect(browser.snapshot()).toMatchObject({ panelAlpha: 0, departing: undefined });
  });

  it("keeps menu selection in bounds and ignores disabled navigation", () => {
    const { browser } = setup();
    browser.open();
    browser.panel("menu");
    browser.select(-10);
    expect(browser.snapshot().selected).toBe(0);
    browser.select(999);
    expect(browser.snapshot().selected).toBe(browser.options().length - 1);
    const before = active(browser);
    browser.action("back");
    expect(active(browser)).toBe(before);
    browser.panel("history");
    browser.action("clear-history");
    browser.panel("history");
    browser.command("down");
    browser.command("decide");
    expect(browser.snapshot().selected).toBe(0);
    expect(active(browser)).toBe(before);
  });

  it("opens only a real web page externally and keeps view choices local", () => {
    const { browser, external } = setup();
    browser.open();
    browser.action("external");
    expect(external).not.toHaveBeenCalled();
    browser.open("https://example.com/page");
    browser.action("maximum");
    browser.action("zoom");
    expect(browser.snapshot()).toMatchObject({ maximum: true, zoom: 1.25 });
    browser.action("zoom");
    expect(browser.snapshot().zoom).toBe(1);
    browser.action("external");
    expect(external).toHaveBeenCalledExactlyOnceWith("https://example.com/page");
  });
});

describe("WebBrowser persistence", () => {
  it("saves deduplicated bookmarks and restores the chosen home page", () => {
    const { browser } = setup();
    browser.open("https://example.com/a", "First title");
    browser.bookmark();
    browser.open("https://example.com/b", "B");
    browser.bookmark();
    browser.open("https://example.com/a", "Updated title");
    browser.bookmark();
    browser.action("set-home");
    const restored = setup().browser;
    expect(restored.snapshot().bookmarks).toEqual([
      { href: "https://example.com/a", title: "Updated title" },
      { href: "https://example.com/b", title: "B" },
    ]);
    restored.open();
    expect(restored.entry.href).toBe("https://example.com/a");
    restored.action("clear-bookmarks");
    restored.action("clear-history");
    expect(setup().browser.snapshot()).toMatchObject({ bookmarks: [], history: [] });
  });

  it("rejects unsafe stored entries and normalizes accepted addresses", () => {
    storage.set(
      "xmp.browser",
      JSON.stringify({
        home: "javascript:alert(1)",
        bookmarks: [
          { href: "javascript:alert(1)", title: "Unsafe" },
          { href: "https://name:secret@example.com/", title: "Credentials" },
          { href: "EXAMPLE.com/path", title: "Accepted" },
          { href: "https://example.com/", title: 42 },
          null,
        ],
        history: [{ href: "http://EXAMPLE.com", title: "History" }],
      }),
    );
    const { browser } = setup();
    expect(browser.snapshot()).toMatchObject({
      home: BROWSER_HOME,
      bookmarks: [{ href: "https://example.com/path", title: "Accepted" }],
      history: [{ href: "http://example.com/", title: "History" }],
    });
  });

  it("preserves browsing when stored data is corrupt or storage throws", () => {
    storage.set("xmp.browser", "{invalid");
    expect(setup().browser.snapshot().bookmarks).toEqual([]);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    });
    const { browser } = setup();
    expect(browser.open("https://example.com/")).toBe(true);
    expect(() => {
      browser.bookmark();
    }).not.toThrow();
    expect(browser.snapshot().bookmarks).toHaveLength(1);
  });

  it("stops notifying an unsubscribed observer", () => {
    const { browser } = setup();
    const watcher = vi.fn();
    const unsubscribe = browser.subscribe(watcher);
    browser.open();
    expect(watcher).toHaveBeenCalled();
    watcher.mockClear();
    unsubscribe();
    browser.panel("menu");
    expect(watcher).not.toHaveBeenCalled();
  });
});
