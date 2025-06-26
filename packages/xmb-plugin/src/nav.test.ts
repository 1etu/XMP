import { build } from "@vsh/explore-plugin";
import type { Category } from "@vsh/explore-plugin";
import { describe, expect, it } from "vitest";

import { cancel, decide, focused, initial, list, move } from "./index.js";
import type { Dir, State } from "./index.js";

function raw(id: string, items: unknown[] = []): unknown {
  return { id, icon: 0, title: id, info: "", action: "none", childPos: 0, items };
}

const TREE = {
  categories: [
    { id: "user", icon: 1, title: "Users", items: [raw("poweroff"), raw("newuser")] },
    {
      id: "sysconf",
      icon: 2,
      title: "Settings",
      items: [
        raw("update"),
        {
          ...(raw("device") as object),
          childPos: 1,
          items: [raw("d0"), raw("d1"), raw("d2")],
        },
        raw("theme"),
      ],
    },
    { id: "network", icon: 7, title: "Network", items: [raw("browser")] },
  ],
} as never;

const CATS: Category[] = build(TREE, { text: {} });

function walk(state: State, dirs: readonly Dir[]): State {
  return dirs.reduce((s, d) => move(CATS, s, d).state, state);
}

describe("category axis", () => {
  it("moves right and left", () => {
    const right = move(CATS, initial(), "right");
    expect(right.state.category).toBe(1);
    expect(right.effect).toBe("category");
    expect(move(CATS, right.state, "left").state.category).toBe(0);
  });

  it("clamps at both ends without wrapping", () => {
    expect(move(CATS, initial(), "left").state.category).toBe(0);
    expect(move(CATS, initial(), "left").effect).toBe("reject");

    const last = walk(initial(), ["right", "right", "right", "right"]);
    expect(last.category).toBe(CATS.length - 1);
  });

  it("resets the item column when the category changes", () => {
    const moved = walk(initial(), ["down", "right"]);
    expect(moved.levels).toEqual([0]);
  });
});

describe("item axis", () => {
  it("moves down and up", () => {
    const down = move(CATS, initial(), "down");
    expect(down.effect).toBe("cursor");
    expect(down.state.levels).toEqual([1]);
    expect(move(CATS, down.state, "up").state.levels).toEqual([0]);
  });

  it("clamps at both ends", () => {
    expect(move(CATS, initial(), "up").effect).toBe("reject");
    const bottom = walk(initial(), ["down", "down", "down"]);
    expect(bottom.levels).toEqual([1]);
  });

  it("never leaves bounds under rapid input", () => {
    const dirs: Dir[] = [
      "down",
      "down",
      "right",
      "down",
      "down",
      "left",
      "up",
      "right",
      "down",
    ];
    let state = initial();

    for (const d of dirs) {
      state = move(CATS, state, d).state;
      expect(state.category).toBeGreaterThanOrEqual(0);
      expect(state.category).toBeLessThan(CATS.length);

      const at = state.levels[state.levels.length - 1] ?? 0;
      const n = list(CATS, state).length;
      expect(at).toBeGreaterThanOrEqual(0);
      expect(n === 0 || at < n).toBe(true);
    }
  });
});

describe("nested sub-lists", () => {
  const atDevice: State = { category: 1, levels: [1] };

  it("decide pushes a level seeded from ch_pos", () => {
    const step = decide(CATS, atDevice);
    expect(step.effect).toBe("decide");
    expect(step.state.levels).toEqual([1, 1]);
    expect(focused(CATS, step.state)?.id).toBe("d1");
  });

  it("right changes category even when a root folder is focused", () => {
    expect(move(CATS, atDevice, "right").state).toEqual({ category: 2, levels: [0] });
  });

  it("cancel pops to the exact prior state", () => {
    const pushed = decide(CATS, atDevice).state;
    const popped = cancel(pushed);
    expect(popped.effect).toBe("cancel");
    expect(popped.state).toEqual(atDevice);
  });

  it("left pops instead of changing category once nested", () => {
    const pushed = decide(CATS, atDevice).state;
    const back = move(CATS, pushed, "left");
    expect(back.state.category).toBe(1);
    expect(back.state.levels).toEqual([1]);
  });

  it("cancel at the root is rejected", () => {
    expect(cancel(initial()).effect).toBe("reject");
  });

  it("decide on a leaf does not push", () => {
    const step = decide(CATS, initial());
    expect(step.effect).toBe("decide");
    expect(step.state).toEqual(initial());
  });
});

describe("empty categories", () => {
  const empty = {
    categories: [{ id: "photo", icon: 3, title: "Photo", items: [] }],
  } as never;
  const cats = build(empty, { text: {} });

  it("survives an empty item list", () => {
    expect(list(cats, initial())).toEqual([]);
    expect(focused(cats, initial())).toBeUndefined();
    expect(move(cats, initial(), "down").effect).toBe("reject");
    expect(decide(cats, initial()).effect).toBe("reject");
  });
});
