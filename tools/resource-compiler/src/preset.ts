import * as Mnu from "./mnu.ts";
import * as Qrc from "./qrc.ts";

const N_CORNER = 4;
const BASE_ID = "base";
const CHAN = ["RED", "GREEN", "BLUE"] as const;

const SIG: Readonly<Record<string, string>> = {
  BACKGROUND: "1 RED",
  HDR: "ENABLED",
  LINE1: "STATE",
  PARTICLES: "emit vel min",
  PARTICLES_SPE: "delta time",
  PARTICLES_UI: "brownian",
};

export type Rgb = readonly [number, number, number];

export interface Group {
  readonly val: Mnu.Block;
  readonly ints: readonly string[];
}

export interface Preset {
  readonly id: string;
  readonly corners: readonly Rgb[];
  readonly bg: Group;
  readonly hdr: Group;
  readonly line: Group;
  readonly part: Group;
}

interface Src {
  readonly val: Mnu.Block;
  readonly kind: Mnu.Kinds;
}

export class PairError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "PresetPairError";
    this.detail = detail;
  }
}

export function camel(key: string): string {
  const parts = key
    .trim()
    .split(/[\s_]+/)
    .filter((p) => p.length > 0)
    .map((p) => p.toLowerCase());

  return parts
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

function rekey(block: Mnu.Block, skip: ReadonlySet<string>): Mnu.Block {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(block)) {
    if (!skip.has(k)) {
      out[camel(k)] = v;
    }
  }
  return out;
}

function corners(block: Mnu.Block): { rgb: Rgb[]; keys: Set<string> } {
  const rgb: Rgb[] = [];
  const keys = new Set<string>();

  for (let i = 1; i <= N_CORNER; i += 1) {
    const triple = CHAN.map((c) => {
      const key = `${String(i)} ${c}`;
      keys.add(key);
      return block[key] ?? 0;
    });
    rgb.push([triple[0] ?? 0, triple[1] ?? 0, triple[2] ?? 0]);
  }

  return { rgb, keys };
}

export function idOf(name: string): string {
  const parts = name.split("/");
  return parts.length >= 3 ? (parts[1] ?? BASE_ID) : BASE_ID;
}

export function leafOf(name: string): string {
  const seg = name.split("/");
  return seg[seg.length - 1] ?? name;
}

function kindOf(name: string): string {
  const leaf = leafOf(name);
  return leaf.slice(0, leaf.lastIndexOf("."));
}

export function build(arc: Qrc.Archive): Map<string, Preset> {
  const byId = new Map<string, Map<string, Src>>();

  for (const file of arc.files.filter((f) => f.name.endsWith(".mnu"))) {
    const name = file.name;
    const text = Qrc.text(arc, file);

    const src: Src =
      text.length === 0
        ? { val: {}, kind: {} }
        : { val: Mnu.parse(text), kind: Mnu.kinds(text) };
    const kind = kindOf(name);
    const want = SIG[kind];
    if (want !== undefined && Object.keys(src.val).length > 0 && !(want in src.val)) {
      throw new PairError(`${name} lacks ${want}; table order broke`);
    }

    const id = idOf(name);
    let group = byId.get(id);
    if (group === undefined) {
      group = new Map<string, Src>();
      byId.set(id, group);
    }
    group.set(kind, src);
  }

  const base = byId.get(BASE_ID);
  if (base === undefined) {
    throw new PairError("archive has no base preset");
  }

  const out = new Map<string, Preset>();

  const pick = (group: Map<string, Src>, kind: string): Src => {
    const own = group.get(kind);
    if (own !== undefined && Object.keys(own.val).length > 0) {
      return own;
    }
    return base.get(kind) ?? { val: {}, kind: {} };
  };

  const group = (src: Src, skip: ReadonlySet<string>): Group => ({
    val: rekey(src.val, skip),
    ints: Object.keys(src.val)
      .filter((k) => !skip.has(k) && src.kind[k] === "int")
      .map(camel)
      .sort(),
  });

  for (const [id, g] of byId) {
    const bg = pick(g, "BACKGROUND");
    const { rgb, keys } = corners(bg.val);

    out.set(id, {
      id,
      corners: rgb,
      bg: group(bg, keys),
      hdr: group(pick(g, "HDR"), new Set()),
      line: group(pick(g, "LINE1"), new Set()),
      part: group(pick(g, "PARTICLES"), new Set()),
    });
  }

  return out;
}
