import { build } from "@vsh/explore-plugin";
import type { Category } from "@vsh/explore-plugin";
import { describe, expect, it } from "vitest";

import { cancel, decide, focused, initial, list, move } from "./index.js";
import type { Dir, State } from "./index.js";

function raw(id: string, items: unknown[] = []): unknown {
  return { id, icon: 0, title: id, info: "", action: "none", childPos: 0, items };
}
