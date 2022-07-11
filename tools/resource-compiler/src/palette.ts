import * as Dds from "./dds.ts";
import type * as Qrc from "./qrc.ts";

const N_MONTH = 12;
const GRID_W = 4;
const GRID_H = 8;
const DAY_PFX = "textures/month_bg/rgb/";
const NIGHT_PFX = "textures/month_bg/night/";

export type Rgb = readonly [number, number, number];

export interface Palette {
  readonly month: number;
  readonly day: readonly Rgb[];
  readonly night: readonly Rgb[];
}

export class PairError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PalettePairError";
    this.detail = detail;
  }
}

function sample(img: Dds.Image): Rgb[] {
  const out: Rgb[] = [];

  for (let gy = 0; gy < GRID_H; gy += 1) {
    for (let gx = 0; gx < GRID_W; gx += 1) {
      const x = Math.min(img.wid - 1, Math.round(((gx + 0.5) / GRID_W) * img.wid));
      const y = Math.min(img.hgt - 1, Math.round(((gy + 0.5) / GRID_H) * img.hgt));
      const o = (y * img.wid + x) * 4;
      out.push([img.rgba[o] ?? 0, img.rgba[o + 1] ?? 0, img.rgba[o + 2] ?? 0]);
    }
  }

  return out;
}

export function build(arc: Qrc.Archive): Palette[] {
  const names = arc.names.filter((n) => n.endsWith(".dds"));
  const imgs = Dds.extract(arc.raw);

  if (names.length !== imgs.length) {
    throw new PairError(
      `${String(names.length)} dds names, ${String(imgs.length)} images`,
    );
  }

  const day = new Map<number, Dds.Image>();
  const night = new Map<number, Dds.Image>();

  names.forEach((name, i) => {
    const img = imgs[i];
    if (img === undefined) {
      return;
    }
    const n = Number(name.slice(-6, -4));
    if (!Number.isInteger(n) || n < 1 || n > N_MONTH) {
      return;
    }
    if (name.startsWith(DAY_PFX)) {
      day.set(n, img);
    } else if (name.startsWith(NIGHT_PFX)) {
      night.set(n, img);
    }
  });

  if (day.size !== N_MONTH || night.size !== N_MONTH) {
    throw new PairError(
      `want ${String(N_MONTH)} day and night, got ${String(day.size)} and ${String(night.size)}`,
    );
  }

  const out: Palette[] = [];

  for (let m = 1; m <= N_MONTH; m += 1) {
    const d = day.get(m);
    const n = night.get(m);
    if (d === undefined || n === undefined) {
      continue;
    }
    out.push({ month: m, day: sample(d), night: sample(n) });
  }

  return out;
}
