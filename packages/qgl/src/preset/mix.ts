import type { Group, Preset, Rgb } from "./kind.js";

const N_CORNER = 4;

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixPar(a: Group, b: Group, t: number): Group {
  const out: Record<string, number> = {};
  const step = new Set([...a.ints, ...b.ints]);

  for (const key of new Set([...Object.keys(a.val), ...Object.keys(b.val)])) {
    const av = a.val[key];
    const bv = b.val[key];

    if (av === undefined) {
      out[key] = bv ?? 0;
    } else if (bv === undefined) {
      out[key] = av;
    } else if (step.has(key)) {
      out[key] = t < 0.5 ? av : bv;
    } else {
      out[key] = mix(av, bv, t);
    }
  }

  return { val: out, ints: [...step] };
}

function mixCorners(a: readonly Rgb[], b: readonly Rgb[], t: number): readonly Rgb[] {
  const out: Rgb[] = [];

  for (let i = 0; i < N_CORNER; i += 1) {
    const ca = a[i] ?? [0, 0, 0];
    const cb = b[i] ?? ca;
    out.push([mix(ca[0], cb[0], t), mix(ca[1], cb[1], t), mix(ca[2], cb[2], t)]);
  }

  return out;
}

export function lerp(a: Preset, b: Preset, t: number): Preset {
  const k = Math.min(Math.max(t, 0), 1);

  if (k === 0) {
    return a;
  }
  if (k === 1) {
    return b;
  }

  return {
    id: `${a.id}->${b.id}`,
    corners: mixCorners(a.corners, b.corners, k),
    bg: mixPar(a.bg, b.bg, k),
    hdr: mixPar(a.hdr, b.hdr, k),
    line: mixPar(a.line, b.line, k),
    part: mixPar(a.part, b.part, k),
    ...(a.icons !== undefined && b.icons !== undefined
      ? { icons: mixPar(a.icons, b.icons, k) }
      : {}),
  };
}
