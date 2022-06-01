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
