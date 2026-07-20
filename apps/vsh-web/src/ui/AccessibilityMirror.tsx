import { useSyncExternalStore } from "react";

import type { Described, XmbShell } from "../runtime/shell.js";

const EMPTY: Described = { category: "", depth: 0, categories: [], items: [] };
