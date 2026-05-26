import { FrameClock, SysRtc, daylightAt, hourOf, monthPositionOf } from "@vsh/librtc";
import type { Rtc } from "@vsh/librtc";
import { THEME_COLORS } from "@vsh/content";
import {
  Spline,
  alloc,
  bgOf,
  blend,
  createBackend,
  design,
  environmentAt,
  forMonth,
  hdrOf,
  inverseDisplay,
  lineOf,
  measured,
  verified,
  partOf,
  schedOf,
} from "@vsh/qgl";
import type { BackendId, Preset, QglBackend, QglFrame, Quality } from "@vsh/qgl";
import type { Effect, State } from "@vsh/xmb-plugin";
import { AccelMode, Scalar, focusLightAt } from "@vsh/paf";
import type { Snapshot } from "@vsh/paf";
import { readPreferences, savePreferences } from "./preferences.js";

import { Boot } from "./boot.js";
import { XmbShell } from "./shell.js";
import type { Stage } from "./boot.js";
import { Chain } from "./chain.js";
import { loadResources } from "./catalog.js";
import type { Resources } from "./catalog.js";
import { MENU_START, STARTUP_WAVE_DELAY, startupAt } from "./startup.js";
import { IconMaterials } from "./icon-material.js";
import type { StartupFrame } from "./startup.js";

const TO_LIVE = design(1400);
const BOOT_WAVE_FADE = verified(3000);