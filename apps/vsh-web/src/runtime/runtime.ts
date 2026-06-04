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
const BOOT_LIVE_START = verified(4000);
const BOOT_LIVE_FADE = verified(7500);

const MAX_DPR = design(2);
const BRIGHTNESS_STEP = design(0.1);
const ICON_PREPARE_LEAD = design(600);
const PARTICLE_SOFTNESS = measured(0.9);
const THEME_CHANGE = { durationMs: design(450), accelMode: AccelMode.Decelerate };
const INFORMATION_WAVE_TINT = [
  measured(1.095),
  measured(1.08),
  measured(1.31),
] as const;

export interface RuntimeOpts {
  readonly canvas: HTMLCanvasElement;
  readonly rtc?: Rtc;
  readonly quality?: Quality;
  readonly backend?: BackendId;
  readonly appearance?: "reference" | "calendar";
  readonly target?: EventTarget;
  readonly onEffect?: (effect: Effect) => void;
  readonly onShell?: (shell: XmbShell) => void;
  readonly onStartup?: (frame: StartupFrame) => void;
  readonly onFocusLight?: (light: number) => void;
}

export interface Runtime {
  readonly boot: Boot;
  start(): void;
  dispose(): void;
}

function reducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
