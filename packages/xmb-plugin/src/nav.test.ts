import { build } from "@vsh/explore-plugin";
import type { Category } from "@vsh/explore-plugin";
import { describe, expect, it } from "vitest";

import { cancel, decide, focused, initial, list, move } from "./index.js";
import type { Dir, State } from "./index.js";

function raw(id: string, items: unknown[] = []): unknown {
  return { id, icon: 0, title: id, info: "", action: "none", childPos: 0, items };
}

const TREE = {
  categories: [
    { id: "user", icon: 1, title: "Users", items: [raw("poweroff"), raw("newuser")] },
    {
      id: "sysconf",
      icon: 2,
      title: "Settings",
      items: [
        raw("update"),
        {
          ...(raw("device") as object),
          childPos: 1,
          items: [raw("d0"), raw("d1"), raw("d2")],
        },
        raw("theme"),
      ],
    },
    { id: "network", icon: 7, title: "Network", items: [raw("browser")] },
  ],
} as never;
