const ROOT = "XMBML";
const VIEW = "View";
const ATTRS = "Attributes";
const TABLE = "Table";
const PAIR = "Pair";
const ITEMS = "Items";
const ITEM = "Item";
const QUERY = "Query";
const REF = "#";

export type Table = Readonly<Record<string, string>>;

export interface Item {
  readonly key: string;
  readonly cls: string;
  readonly attr: string;
  readonly src: string;
  readonly query: boolean;
}

export interface View {
  readonly id: string;
  readonly tables: Readonly<Record<string, Table>>;
  readonly items: readonly Item[];
}

interface Node {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly kids: Node[];
  text: string;
}

export class FormatError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "XmbmlFormatError";
    this.detail = detail;
  }
}

function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;

  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    const k = m[1];
    const v = m[2];
    if (k !== undefined && v !== undefined) {
      out[k] = v;
    }
  }

  return out;
}
