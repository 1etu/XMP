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
