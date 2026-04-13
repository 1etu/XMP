import { AccelMode, Scalar } from "@vsh/paf";
import { design } from "@vsh/qgl";
import type { Command } from "@vsh/libpad";

export const BROWSER_HOME = "xmb://home";
const MAX_WINDOWS = design(6);
const MAX_HISTORY = design(64);
const PANEL_MOVE = { durationMs: design(300), accelMode: AccelMode.Decelerate };
const STORAGE_KEY = "xmp.browser";
