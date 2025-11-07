import { design } from "@vsh/resource";
import type { Rtc } from "@vsh/librtc";

import { indicate, sameMinute } from "./indicator.js";
import type { Indicator } from "./indicator.js";

const TICK_MS = design(1000);
