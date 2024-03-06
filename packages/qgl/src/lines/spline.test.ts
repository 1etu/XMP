import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { lineOf } from "../preset.js";
import type { Lattice } from "./spline.js";
import type { Line, Preset } from "../preset.js";
import { STEX_H, STEX_W, Spline, evalSpline } from "./spline.js";

const BASE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../resources/qgl/presets/base.json",
);

const LATTICE = JSON.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../resources/qgl/wave-lattice.json",
    ),
    "utf8",
  ),
) as Lattice;

function line(): Line {
  return lineOf(JSON.parse(readFileSync(BASE, "utf8")) as Preset);
}

describe("evalSpline", () => {
  const b = new Float32Array(4);

  it("holds a constant field", () => {
    const cp = new Float32Array(8).fill(3);

    expect(evalSpline(cp, 0, b)).toBeCloseTo(3, 6);
    expect(evalSpline(cp, 0.5, b)).toBeCloseTo(3, 6);
    expect(evalSpline(cp, 1, b)).toBeCloseTo(3, 6);
  });

  it("stays inside the range of its control points", () => {
    const cp = new Float32Array([0, 1, -1, 2, -2, 1, 0, 0]);

    for (let u = 0; u <= 1; u += 0.01) {
      const v = evalSpline(cp, u, b);
      expect(v).toBeLessThanOrEqual(2);
      expect(v).toBeGreaterThanOrEqual(-2);
    }
  });

  it("is continuous across segment boundaries", () => {
    const cp = new Float32Array([0, 4, -3, 2, 5, -1, 3, 0]);
    let prev = evalSpline(cp, 0, b);

    for (let u = 0.002; u <= 1; u += 0.002) {
      const v = evalSpline(cp, u, b);
      expect(Math.abs(v - prev)).toBeLessThan(0.2);
      prev = v;
    }
  });

  it("returns zero when there are too few control points", () => {
    expect(evalSpline(new Float32Array(2), 0.5, b)).toBe(0);
  });
});

describe("Spline", () => {
  it("outputs analytic normals in cubic-span units", () => {
    const spline = new Spline(LATTICE);
    const positions = spline.write(line(), 0);
    const normals = spline.normals;
    expect(normals.length).toBe(positions.length);
    expect(normals.every(Number.isFinite)).toBe(true);
    for (const cell of [32, 48, 64, 80, 96]) {
      const offset = (cell * STEX_W + cell) * 4;
      const du = [0, 1, 2].map(
        (k) =>
          ((positions[offset + 4 + k] ?? 0) - (positions[offset - 4 + k] ?? 0)) * 4,
      );
      const dv = [0, 1, 2].map(
        (k) =>
          ((positions[offset + STEX_W * 4 + k] ?? 0) -
            (positions[offset - STEX_W * 4 + k] ?? 0)) *
          4,
      );
      const expected = [
        (dv[1] ?? 0) * (du[2] ?? 0) - (dv[2] ?? 0) * (du[1] ?? 0),
        (dv[2] ?? 0) * (du[0] ?? 0) - (dv[0] ?? 0) * (du[2] ?? 0),
        (dv[0] ?? 0) * (du[1] ?? 0) - (dv[1] ?? 0) * (du[0] ?? 0),
      ];
      const error = Math.hypot(
        ...expected.map((value, k) => value - (normals[offset + k] ?? 0)),
      );
      expect(error / Math.hypot(...expected)).toBeLessThan(0.03);
      expect(normals[offset + 3]).toBe(0);
    }
    spline.write(line(), 1000 / 60);
    expect(spline.normals).toBe(normals);
  });

  it("rejects a damaged control lattice before rendering", () => {
    expect(() => new Spline({ ...LATTICE, width: 18 })).toThrow();
    expect(() => new Spline({ ...LATTICE, points: [NaN] })).toThrow();
  });

  it("runs the same physics at thirty and sixty render frames per second", () => {
    const a = new Spline({ ...LATTICE, phaseMs: 0 });
    const b = new Spline({ ...LATTICE, phaseMs: 0 });
    const l = line();
    for (let i = 0; i <= 60; i += 1) a.write(l, (i * 1000) / 60);
    for (let i = 0; i <= 30; i += 1) b.write(l, (i * 1000) / 30);
    expect(a.dat).toEqual(b.dat);
  });

  it("changes field of view without changing depth or simulation state", () => {
    const s = new Spline(LATTICE);
    const l = line();
    const narrow = Array.from(s.write(l, 0, 60));
    const wide = s.write(l, 0, 90);
    const ratio = Math.tan(Math.PI / 6);
    for (let i = 0; i < wide.length; i += 4) {
      expect(wide[i]).toBeCloseTo((narrow[i] ?? 0) * ratio, 4);
      expect(wide[i + 1]).toBeCloseTo((narrow[i + 1] ?? 0) * ratio, 4);
      expect(wide[i + 2]).toBe(narrow[i + 2]);
      expect(wide[i + 3]).toBe(narrow[i + 3]);
    }
  });

  it("keeps a finite surface and positive projection depth after a long session", () => {
    const data = new Spline(LATTICE).write(line(), 86_400_000);
    expect(data.every(Number.isFinite)).toBe(true);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBeGreaterThan(0);
  });

  it("fills the whole displacement field", () => {
    const s = new Spline(LATTICE);
    const dat = s.write(line(), 0);

    expect(dat).toHaveLength(STEX_W * STEX_H * 4);
    expect(dat.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("writes in place rather than allocating per frame", () => {
    const s = new Spline(LATTICE);

    expect(s.write(line(), 0)).toBe(s.write(line(), 16));
    expect(s.write(line(), 32)).toBe(s.dat);
  });

  it("produces the same field for the same time", () => {
    const l = line();

    expect(Array.from(new Spline(LATTICE).write(l, 1234))).toEqual(
      Array.from(new Spline(LATTICE).write(l, 1234)),
    );
  });

  it("moves over time", () => {
    const l = line();
    const a = Array.from(new Spline(LATTICE).write(l, 0));
    const b = Array.from(new Spline(LATTICE).write(l, 800));

    expect(b).not.toEqual(a);
  });

  it("holds still when the time step is zero", () => {
    const frozen: Line = { ...line(), timestep: 0 };
    const a = Array.from(new Spline(LATTICE).write(frozen, 0));
    const b = Array.from(new Spline(LATTICE).write(frozen, 5000));

    expect(b).toEqual(a);
  });
});
