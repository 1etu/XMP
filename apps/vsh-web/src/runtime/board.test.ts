import { describe, expect, it } from "vitest";
import type { BoardItem } from "@vsh/content";
import { Board, BOARD_DISPLAY_KEY, BOARD_EXPAND_MS } from "./board.js";

const items: readonly BoardItem[] = [
  {
    id: "a",
    title: "First",
    date: "2026-09-17",
    image: "",
    paragraphs: ["First article"],
    channel: "graphics",
    href: "https://example.com/a",
  },
  {
    id: "b",
    title: "Second",
    date: "2026-09-17",
    image: "",
    paragraphs: ["Second article"],
    channel: "tools",
  },
];

describe("Information Board", () => {
  it("opens the list and retains an enabled ticker after closing", () => {
    const board = new Board(items);
    expect(board.snapshot).toMatchObject({ enabled: false, mode: "ticker" });
    board.open();
    expect(board.snapshot).toMatchObject({ enabled: true, mode: "list" });
    board.advance(BOARD_EXPAND_MS);
    expect(board.frame.expansion).toBe(1);
    expect(board.command("cancel")).toEqual({ kind: "close" });
    board.advance(BOARD_EXPAND_MS);
    expect(board.snapshot).toMatchObject({ enabled: true, mode: "ticker" });
    expect(board.frame.expansion).toBe(0);
    board.setDisplay(false);
    expect(board.advance(1000)).toBe(false);
  });

  it("moves through list, article, and optional website without losing focus", () => {
    const board = new Board(items);
    board.open();
    board.command("down");
    board.command("down");
    expect(board.current?.id).toBe("b");
    board.command("right");
    expect(board.snapshot.mode).toBe("article");
    expect(board.command("right")).toBeUndefined();
    board.command("left");
    expect(board.current?.id).toBe("b");
    board.command("up");
    board.command("decide");
    expect(board.command("decide")).toEqual({
      kind: "link",
      href: "https://example.com/a",
    });
  });

  it("filters local channels and handles an empty channel", () => {
    const board = new Board(items);
    board.open();
    board.command("options");
    board.select(1);
    board.command("decide");
    expect(board.snapshot.items.map((item) => item.id)).toEqual(["a"]);
    board.command("options");
    board.select(2);
    board.command("right");
    expect(board.snapshot.items).toEqual([]);
    board.command("right");
    expect(board.snapshot.mode).toBe("list");
    board.close();
    expect(board.advance(1000)).toBe(false);
  });

  it("runs two complete leftward headline passes before advancing", () => {
    const board = new Board(items, true);
    board.measureTitle("a", 109);
    board.measureTitle("b", 109);
    board.advance(500);
    expect(board.frame.tickerX).toBe(-60);
    expect(board.headline?.id).toBe("a");
    board.advance(500);
    expect(board.frame.tickerX).toBe(0);
    expect(board.headline?.id).toBe("a");
    board.advance(1000);
    expect(board.headline?.id).toBe("b");
    board.advance(2000);
    expect(board.headline?.id).toBe("a");
  });

  it("keeps ticker timing stable across frame partitions and long time samples", () => {
    const full = new Board(items, true);
    const split = new Board(items, true);
    for (const board of [full, split]) {
      board.measureTitle("a", 210);
      board.measureTitle("b", 390);
    }
    full.advance(10123);
    for (let i = 0; i < 100; i += 1) split.advance(101.23);
    expect(split.snapshot.ticker).toBe(full.snapshot.ticker);
    expect(split.frame.tickerX).toBeCloseTo(full.frame.tickerX, 7);
    expect(() => full.advance(86400000)).not.toThrow();
    const x = full.frame.tickerX;
    for (const delta of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY])
      expect(full.advance(delta)).toBe(false);
    expect(full.frame.tickerX).toBe(x);
  });

  it("delays a long selected title by one second and resets it on selection", () => {
    const board = new Board(items);
    board.measureTitle("a", 500);
    board.open();
    board.advance(1000);
    expect(board.frame.titleX).toBe(0);
    board.advance(500);
    expect(board.frame.titleX).toBe(-60);
    board.command("down");
    expect(board.frame.titleX).toBe(0);
  });

  it("scrolls long articles after three seconds and yields to manual input", () => {
    const board = new Board(items);
    board.open();
    board.command("right");
    board.measureArticle(900);
    board.advance(3000);
    expect(board.frame.articleY).toBe(0);
    board.advance(1000);
    expect(board.frame.articleY).toBe(60);
    board.command("down");
    expect(board.frame.articleY).toBe(124);
    board.advance(10000);
    expect(board.frame.articleY).toBe(124);
    board.scrollArticle(10000);
    expect(board.frame.articleY).toBe(506);
  });

  it("keeps reduced motion still and exposes stable snapshots between state changes", () => {
    const board = new Board(items, true);
    const initial = board.snapshot;
    board.advance(5000, true);
    expect(board.snapshot).toBe(initial);
    expect(board.frame.tickerX).toBe(0);
    board.open();
    board.advance(1, true);
    expect(board.frame.expansion).toBe(1);
    board.command("right");
    board.measureArticle(900);
    board.advance(10000, true);
    expect(board.frame.articleY).toBe(0);
  });

  it("persists display on opening and keeps the saved choice after closing", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => values.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        values.set(key, value);
      },
    };
    const board = new Board(items, undefined, storage);
    expect(board.snapshot.enabled).toBe(false);
    board.open();
    board.close();
    expect(values.get(BOARD_DISPLAY_KEY)).toBe("true");
    const restored = new Board(items, undefined, storage);
    expect(restored.snapshot.enabled).toBe(true);
    restored.setDisplay(false);
    expect(new Board(items, undefined, storage).snapshot.enabled).toBe(false);
  });

  it("remains usable when browser storage is unavailable", () => {
    const unavailable = {
      getItem(): string | null {
        throw new Error("Storage is blocked");
      },
      setItem(): void {
        throw new Error("Storage is blocked");
      },
    };
    const board = new Board(items, undefined, unavailable);
    expect(board.snapshot.enabled).toBe(false);
    expect(() => {
      board.open();
      board.setDisplay(false);
    }).not.toThrow();
    expect(board.snapshot.enabled).toBe(false);
  });
});
