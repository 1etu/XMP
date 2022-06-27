const HDR = "#MNU_1.0";

export type Kind = "int" | "float";
export type Block = Readonly<Record<string, number>>;
export type Kinds = Readonly<Record<string, Kind>>;

export interface Entry {
  readonly key: string;
  readonly kind: Kind;
  readonly val: number;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "MnuFormatError";
    this.detail = detail;
  }
}

const LEGACY = /^([^=]+)=\[([^\]]*)\]$/;

function legacy(lines: readonly string[]): Entry[] {
  const out: Entry[] = [];

  for (const line of lines) {
    const m = LEGACY.exec(line.trim());
    const key = m?.[1]?.trim();
    const val = Number(m?.[2]);

    if (key === undefined || key.length === 0 || !Number.isFinite(val)) {
      continue;
    }

    out.push({ key, kind: "float", val });
  }

  return out;
}

export function entries(src: string): Entry[] {
  const lines = src.split(/\r?\n/);
  const hdr = lines[0]?.trim();

  if (hdr !== HDR) {
    const old = legacy(lines);
    if (old.length > 0) {
      return old;
    }
    throw new FormatError(`want ${HDR}, got ${hdr ?? ""}`);
  }

  const out: Entry[] = [];

  for (const line of lines.slice(1)) {
    const s = line.trim();
    if (s.length === 0) {
      continue;
    }

    const a = s.indexOf(":");
    const b = s.indexOf(":", a + 1);
    if (a < 0 || b < 0) {
      continue;
    }

    const key = s.slice(0, a).trim();
    const kind = s.slice(a + 1, b).trim();
    const val = Number(s.slice(b + 1).trim());

    if (key.length === 0 || !Number.isFinite(val)) {
      continue;
    }

    out.push({ key, kind: kind === "int" ? "int" : "float", val });
  }

  return out;
}

export function parse(src: string): Block {
  const out: Record<string, number> = {};
  for (const e of entries(src)) {
    out[e.key] = e.val;
  }
  return out;
}

export function kinds(src: string): Kinds {
  const out: Record<string, Kind> = {};
  for (const e of entries(src)) {
    out[e.key] = e.kind;
  }
  return out;
}
