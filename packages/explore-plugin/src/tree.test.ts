import { describe, expect, it } from "vitest";

import { TreeError, build, hasChildren } from "./index.js";

const STRINGS = { text: { msg_a: "Settings", msg_b: "Adjusts settings." } };
