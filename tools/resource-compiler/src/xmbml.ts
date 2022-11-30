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
