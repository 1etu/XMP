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
