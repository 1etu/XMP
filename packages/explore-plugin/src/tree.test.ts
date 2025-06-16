import { describe, expect, it } from "vitest";

import { TreeError, build, hasChildren } from "./index.js";

const STRINGS = { text: { msg_a: "Settings", msg_b: "Adjusts settings." } };

function raw(id: string, over: Record<string, unknown> = {}): unknown {
  return {
    id,
    icon: 0,
    title: "msg_a",
    info: "msg_b",
    action: "none",
    childPos: 0,
    items: [],
    ...over,
  };
}

describe("string resolution", () => {
  it("resolves titles and info through the string table", () => {
    const cats = build(
      { categories: [{ id: "c", icon: 2, title: "msg_a", items: [raw("i")] }] } as never,
      STRINGS,
    );

    expect(cats[0]?.title).toBe("Settings");
    expect(cats[0]?.entries[0]?.title).toBe("Settings");
    expect(cats[0]?.entries[0]?.info).toBe("Adjusts settings.");
  });

  it("falls back to the key when a string is missing", () => {
    const cats = build(
      { categories: [{ id: "c", icon: 0, title: "msg_gone", items: [] }] },
      STRINGS,
    );

    expect(cats[0]?.title).toBe("msg_gone");
  });

  it("keeps an empty key empty rather than echoing it", () => {
    const cats = build(
      { categories: [{ id: "c", icon: 0, title: "", items: [raw("i", { info: "" })] }] } as never,
      STRINGS,
    );

    expect(cats[0]?.title).toBe("");
    expect(cats[0]?.entries[0]?.info).toBe("");
  });
});

describe("child seeding", () => {
  it("clamps ch_pos into the child list", () => {
    const cats = build(
      {
        categories: [
          {
            id: "c",
            icon: 0,
            title: "msg_a",
            items: [raw("p", { childPos: 9, items: [raw("k0"), raw("k1")] })],
          },
        ],
      } as never,
      STRINGS,
    );

    expect(cats[0]?.entries[0]?.childPos).toBe(1);
  });

  it("seeds zero when there are no children", () => {
    const cats = build(
      { categories: [{ id: "c", icon: 0, title: "msg_a", items: [raw("p", { childPos: 4 })] }] } as never,
      STRINGS,
    );

    const entry = cats[0]?.entries[0];
    expect(entry?.childPos).toBe(0);
    expect(entry !== undefined && hasChildren(entry)).toBe(false);
  });

  it("nests to arbitrary depth", () => {
    const cats = build(
      {
        categories: [
          {
            id: "c",
            icon: 0,
            title: "msg_a",
            items: [raw("a", { items: [raw("b", { items: [raw("c")] })] })],
          },
        ],
      } as never,
      STRINGS,
    );

    expect(cats[0]?.entries[0]?.entries[0]?.entries[0]?.id).toBe("c");
  });
});

describe("guards", () => {
  it("rejects a tree with no categories", () => {
    expect(() => build({ categories: [] }, STRINGS)).toThrow(TreeError);
  });
});
