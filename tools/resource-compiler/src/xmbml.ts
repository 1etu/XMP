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

function unesc(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function parse(src: string): Node {
  const doc: Node = { tag: "", attrs: {}, kids: [], text: "" };
  const stack: Node[] = [doc];
  const re = /<([!?/]?)([\w:-]*)([^>]*?)(\/?)>/g;
  let last = 0;

  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    const top = stack[stack.length - 1];
    if (top !== undefined) {
      top.text += unesc(src.slice(last, m.index));
    }
    last = re.lastIndex;

    const lead = m[1] ?? "";
    const tag = m[2] ?? "";
    const body = m[3] ?? "";
    const shut = m[4] === "/";

    if (lead === "!" || lead === "?") {
      continue;
    }

    if (lead === "/") {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    const node: Node = { tag, attrs: attrs(body), kids: [], text: "" };
    top?.kids.push(node);

    if (!shut) {
      stack.push(node);
    }
  }

  const root = doc.kids.find((n) => n.tag === ROOT);
  if (root === undefined) {
    throw new FormatError(`no <${ROOT}> element`);
  }

  return root;
}

function tableOf(node: Node): Table {
  const out: Record<string, string> = {};

  for (const pair of node.kids) {
    if (pair.tag !== PAIR) {
      continue;
    }
    const key = pair.attrs["key"];
    if (key === undefined) {
      continue;
    }
    out[key] = (pair.kids[0]?.text ?? pair.text).trim();
  }

  return out;
}

function itemOf(node: Node): Item {
  const src = node.attrs["src"] ?? "";
  const hash = src.lastIndexOf(REF);

  return {
    key: node.attrs["key"] ?? "",
    cls: node.attrs["class"] ?? "",
    attr: node.attrs["attr"] ?? "",
    src: hash < 0 ? src : src.slice(hash + REF.length),
    query: node.tag === QUERY,
  };
}

export function views(src: string): Map<string, View> {
  const out = new Map<string, View>();

  for (const view of parse(src).kids) {
    if (view.tag !== VIEW) {
      continue;
    }

    const id = view.attrs["id"];
    if (id === undefined) {
      throw new FormatError(`<${VIEW}> without id`);
    }

    const tables: Record<string, Table> = {};
    const items: Item[] = [];

    for (const kid of view.kids) {
      if (kid.tag === ATTRS) {
        for (const t of kid.kids) {
          const key = t.attrs["key"];
          if (t.tag === TABLE && key !== undefined) {
            tables[key] = tableOf(t);
          }
        }
      } else if (kid.tag === ITEMS) {
        for (const i of kid.kids) {
          if (i.tag === ITEM || i.tag === QUERY) {
            items.push(itemOf(i));
          }
        }
      }
    }

    out.set(id, { id, tables, items });
  }

  return out;
}
