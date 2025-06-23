import { describe, expect, it } from "vitest";

import {
  AccelMode,
  CATEGORY_MOVE,
  ITEM_MOVE,
  PhXmShell,
  Scalar,
  Scheduler,
  ease,
} from "./index.js";
import { spread } from "./layout/curve.js";
import { place } from "./layout/place.js";
import type { Metrics } from "./layout/metrics.js";
import type { View } from "./layout/slot.js";

const SAMPLES = [0, 40, 80, 120, 160];

const METRICS: Metrics = {
  logical: { wid: 1920, hgt: 1080 },
  frac: {
    focusX: 0.3094,
    categoryPitchX: 0.125,
    categoryIconY: 0.2573,
    categoryLabelY: 0.3257,
    focusItemY: 0.4638,
    itemPitchY: 0.071,
    focusGapY: 0.145,
    focusGapAboveY: 0.363,
    focusIconSize: 0.1065,
    itemLabelX: 0.386,
    infoPanelY: 0.1437,
  },
  design: {
    categoryIconSize: 0.075,
    otherIconScale: 0.62,
    focusLabelScale: 1,
    otherLabelScale: 0.86,
    focusAlpha: 1,
    otherAlpha: 0.55,
    railAlpha: 0.75,
  },
};

function item(id: string) {
  return { id, icon: 0, title: id, info: "" };
}

const VIEW: View = {
  categories: [item("user"), item("sysconf"), item("photo"), item("music")],
  categoryOffset: 0,
  items: [item("a"), item("b"), item("c"), item("d"), item("e")],
  itemOffset: 0,
  depth: 0,
};

describe("acceleration modes", () => {
  it("keeps the documented and recovered mode values", () => {
    expect(AccelMode.Linear).toBe(0x0);
    expect(AccelMode.Decelerate).toBe(0x1);
    expect(AccelMode.Accelerate).toBe(0x4);
    expect(AccelMode.Approach).toBe(0x5);
  });

  it("starts fast and ends slow when decelerating", () => {
    expect(ease(0.25, AccelMode.Decelerate)).toBeGreaterThan(0.25);
    expect(ease(0.75, AccelMode.Decelerate)).toBeGreaterThan(0.75);
  });

  it("starts slow and ends fast when accelerating", () => {
    expect(ease(0.25, AccelMode.Accelerate)).toBeLessThan(0.25);
    expect(ease(0.75, AccelMode.Accelerate)).toBeLessThan(0.75);
  });

  it("pins both ends for every mode", () => {
    for (const m of [AccelMode.Linear, AccelMode.Decelerate, AccelMode.Accelerate]) {
      expect(ease(0, m)).toBe(0);
      expect(ease(1, m)).toBe(1);
    }
  });
});

describe("scalar track", () => {
  it("advances only when time is advanced", () => {
    const s = new Scalar(0);
    s.retarget(1, ITEM_MOVE);
    expect(s.value).toBe(0);
    expect(s.done).toBe(false);

    s.tick(ITEM_MOVE.durationMs);
    expect(s.value).toBeCloseTo(0.9497457743, 6);
    expect(s.done).toBe(false);

    s.tick(650);
    expect(s.value).toBe(1);
    expect(s.done).toBe(true);
  });

  it("is monotonic across the sampled curve", () => {
    const s = new Scalar(0);
    s.retarget(1, CATEGORY_MOVE);

    const seen: number[] = [];
    let last = 0;

    for (const t of SAMPLES) {
      s.tick(t - last);
      last = t;
      seen.push(Number(s.value.toFixed(4)));
    }

    expect(seen).toEqual([0, 0.4461, 0.6961, 0.833, 0.9079]);
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] ?? 0);
    }
  });

  it("retargets from the current value without snapping back", () => {
    const s = new Scalar(0);
    s.retarget(1, CATEGORY_MOVE);
    s.tick(90);

    const mid = s.value;
    s.retarget(2, CATEGORY_MOVE);
    expect(s.value).toBeCloseTo(mid, 6);
  });

  it("matches the native 60 Hz recurrence and its final frame", () => {
    const s = new Scalar(0);
    s.retarget(1, CATEGORY_MOVE);
    s.tick(1000 / 60);
    expect(s.value).toBeCloseTo(0.2205885649, 7);
    s.tick(1000 / 60);
    expect(s.value).toBeCloseTo(0.3925180435, 7);
    s.tick((47 * 1000) / 60);
    expect(s.done).toBe(false);
    expect(s.value).toBeLessThan(1);
    s.tick(1000 / 60);
    expect(s.done).toBe(true);
    expect(s.value).toBe(1);
  });

  it("does not change the curve with the display refresh rate", () => {
    const values = [30, 60, 120, 144].map((hz) => {
      const s = new Scalar(0);
      s.retarget(1, CATEGORY_MOVE);
      for (let i = 0; i < hz / 2; i += 1) s.tick(1000 / hz);
      return s.value;
    });
    for (const value of values) expect(value).toBeCloseTo(values[0] ?? 0, 7);
  });

  it("snaps a native track without leaving a motion tail", () => {
    const s = new Scalar(0);
    s.retarget(2, ITEM_MOVE);
    s.tick(50);
    s.snap(3);
    expect(s.value).toBe(3);
    expect(s.done).toBe(true);
    s.tick(100);
    expect(s.value).toBe(3);
  });

  it("preserves the endpoint for a zero duration", () => {
    const s = new Scalar(0);
    s.retarget(2, { ...ITEM_MOVE, durationMs: 0 });
    expect(s.value).toBe(2);
    expect(s.done).toBe(true);
  });
});

describe("shell motion", () => {
  it("animates the item column within a category", () => {
    const shell = new PhXmShell();
    shell.sync(0, 1);

    const curve = SAMPLES.map((t, i) => {
      shell.tick(t - (SAMPLES[i - 1] ?? 0));
      return Number(shell.list.offset.toFixed(4));
    });

    expect(curve[0]).toBe(0);
    expect(curve.at(-1)).toBeCloseTo(0.9079, 4);
    expect(curve[1]).toBeGreaterThan(0);
    expect(curve[1]).toBeLessThan(1);
  });

  it("snaps the column but animates the rail when the category changes", () => {
    const shell = new PhXmShell();
    shell.sync(1, 0);

    expect(shell.list.offset).toBe(0);
    expect(shell.bar.offset).toBe(0);

    shell.tick(CATEGORY_MOVE.durationMs);
    expect(shell.bar.offset).toBeCloseTo(0.9497457743, 6);
  });

  it("settles", () => {
    const shell = new PhXmShell();
    shell.sync(0, 3);
    expect(shell.sched.settled).toBe(false);
    shell.tick(1000);
    expect(shell.sched.settled).toBe(true);
  });
});

describe("spread", () => {
  it("uses the wider gap above the focus", () => {
    expect(spread(-1, 157, 77, 392)).toBe(-392);
    expect(spread(1, 157, 77, 392)).toBe(157);
    expect(spread(-2, 157, 77, 392)).toBe(-469);
  });

  it("is continuous through the focus", () => {
    expect(spread(0, 157, 77)).toBe(0);
    expect(spread(1, 157, 77)).toBe(157);
    expect(spread(-1, 157, 77)).toBe(-157);
    expect(spread(0.5, 157, 77)).toBeCloseTo(78.5, 6);
  });

  it("uses the uniform pitch beyond the neighbours", () => {
    expect(spread(2, 157, 77)).toBe(234);
    expect(spread(3, 157, 77)).toBe(311);
    expect(spread(-3, 157, 77)).toBe(-311);
  });

  it("is odd about zero", () => {
    for (const d of [0.25, 1, 2.5, 4]) {
      expect(spread(-d, 157, 77)).toBeCloseTo(-spread(d, 157, 77), 9);
    }
  });
});

describe("placement", () => {
  it("puts the focused category and item on the same axis", () => {
    const snap = place(METRICS, VIEW);
    const focusX = METRICS.frac.focusX * METRICS.logical.wid;

    expect(snap.categories[0]?.x).toBeCloseTo(focusX, 6);
    expect(snap.items[0]?.x).toBeCloseTo(focusX, 6);
    expect(snap.categories[0]?.focused).toBe(true);
    expect(snap.items[0]?.focused).toBe(true);
  });

  it("spaces the rail by the measured pitch", () => {
    const snap = place(METRICS, VIEW);
    const pitch = METRICS.frac.categoryPitchX * METRICS.logical.wid;

    expect((snap.categories[2]?.x ?? 0) - (snap.categories[1]?.x ?? 0)).toBeCloseTo(
      pitch,
      6,
    );
  });

  it("moves and fades both category labels during a category change", () => {
    const snap = place(METRICS, { ...VIEW, categoryOffset: 0.25 });
    const [outgoing, incoming] = snap.categoryLabels;
    const focusX = METRICS.frac.focusX * METRICS.logical.wid;
    const pitch = METRICS.frac.categoryPitchX * METRICS.logical.wid;
    expect(outgoing?.text).toBe("user");
    expect(outgoing?.alpha).toBe(0.75);
    expect(outgoing?.x).toBeCloseTo(focusX - 0.25 * pitch, 6);
    expect(incoming?.text).toBe("sysconf");
    expect(incoming?.alpha).toBe(0.25);
    expect(incoming?.x).toBeCloseTo(focusX + 0.75 * pitch, 6);
  });

  it("keeps an outgoing column under its category while it fades", () => {
    const base = place(METRICS, VIEW);
    const outgoing = place(METRICS, {
      ...VIEW,
      categoryOffset: 0.75,
      categoryIndex: 0,
      itemAlpha: 0.25,
    });
    const pitch = METRICS.frac.categoryPitchX * METRICS.logical.wid;
    expect(outgoing.items[0]?.x).toBeCloseTo((base.items[0]?.x ?? 0) - pitch * 0.75, 6);
    expect(outgoing.items[0]?.alpha).toBe(0.25);
    expect(outgoing.labels[0]?.alpha).toBe(0.25);
    expect(outgoing.labels[0]?.y).toBe(base.labels[0]?.y);
  });

  it("fades and shrinks away from the focus", () => {
    const snap = place(METRICS, VIEW);

    expect(snap.items[0]?.alpha).toBe(1);
    expect(snap.items[1]?.alpha).toBeLessThan(1);
    expect(snap.items[1]?.size).toBeLessThan(snap.items[0]?.size ?? 0);
  });

  it("shows info only on the focused item", () => {
    const withInfo: View = {
      ...VIEW,
      items: [
        { id: "a", icon: 0, title: "A", info: "detail" },
        { id: "b", icon: 0, title: "B", info: "detail" },
      ],
    };
    const snap = place(METRICS, withInfo);

    expect(snap.labels[0]?.info).toBe("detail");
    expect(snap.labels[1]?.info).toBe("");
  });

  it("keeps the parent category bright and recedes its siblings when nested", () => {
    const snap = place(METRICS, { ...VIEW, depth: 1 });
    const root = place(METRICS, VIEW);
    expect(snap.categories[0]?.alpha).toBe(1);
    expect(snap.categories[0]?.x).toBeLessThan(root.categories[0]?.x ?? 0);
    expect(snap.categories[1]?.alpha).toBeCloseTo(0.075);
    expect(snap.categories[1]?.x).toBe(root.categories[1]?.x);
    expect(snap.categoryLabel?.alpha).toBe(0);
  });

  it("drops items that leave the frame", () => {
    const many = Array.from({ length: 60 }, (_, i) => item(`i${String(i)}`));
    const snap = place(METRICS, { ...VIEW, items: many, itemOffset: 0 });

    expect(snap.items.length).toBeLessThan(many.length);
    expect(snap.items.every((s) => s.y > -400 && s.y < 1480)).toBe(true);
  });

  it("tracks a fractional offset mid-animation", () => {
    const a = place(METRICS, { ...VIEW, itemOffset: 0 });
    const b = place(METRICS, { ...VIEW, itemOffset: 0.5 });
    const c = place(METRICS, { ...VIEW, itemOffset: 1 });

    const y = (s: typeof a, id: string) => s.items.find((i) => i.id === id)?.y ?? 0;
    expect(y(b, "b")).toBeGreaterThan(y(c, "b"));
    expect(y(b, "b")).toBeLessThan(y(a, "b"));
  });
});

describe("scheduler", () => {
  it("drops removed tracks", () => {
    const sched = new Scheduler();
    const s = sched.add(0);
    s.retarget(1, ITEM_MOVE);

    expect(sched.settled).toBe(false);
    sched.remove(s);
    expect(sched.settled).toBe(true);
  });
});
