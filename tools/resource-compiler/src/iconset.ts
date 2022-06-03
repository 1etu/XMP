import * as Mnu from "./mnu.ts";
import { camel, idOf, leafOf } from "./preset.ts";
import * as Qrc from "./qrc.ts";

const MNU_EXT = ".mnu";
const BASE_ID = "base";
const SIG_KEY = "ATTN DIFF";

export interface Set {
  readonly id: string;
  readonly val: Mnu.Block;
  readonly ints: readonly string[];
}

export class PairError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "IconsetPairError";
    this.detail = detail;
  }
}

export function build(arc: Qrc.Archive): Map<string, Set> {
  const out = new Map<string, Set>();
  let base: Set | undefined;

  for (const file of arc.files.filter((f) => f.name.endsWith(MNU_EXT))) {
    const text = Qrc.text(arc, file);
    const id = idOf(file.name);

    if (text.length === 0) {
      out.set(id, { id, val: {}, ints: [] });
      continue;
    }

    const val = Mnu.parse(text);
    const kind = Mnu.kinds(text);

    if (!(SIG_KEY in val)) {
      throw new PairError(`${file.name} lacks ${SIG_KEY}`);
    }

    const set: Set = {
      id,
      val: Object.fromEntries(Object.entries(val).map(([k, v]) => [camel(k), v])),
      ints: Object.keys(val)
        .filter((k) => kind[k] === "int")
        .map(camel)
        .sort(),
    };

    if (id === BASE_ID) {
      base = set;
    }

    out.set(id, set);
  }

  if (base === undefined) {
    throw new PairError(`archive has no ${BASE_ID} icon set`);
  }

  for (const [id, set] of out) {
    if (Object.keys(set.val).length === 0) {
      out.set(id, { id, val: base.val, ints: base.ints });
    }
  }

  return out;
}
