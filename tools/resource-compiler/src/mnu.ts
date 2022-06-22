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
