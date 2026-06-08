import type { Category, Entry } from "@vsh/explore-plugin";
import { actionFor, projectOf } from "@vsh/content";
import type { Preferences } from "@vsh/content";
import { Libaudio, SystemSound } from "@vsh/libaudio";
import type { SoundId } from "@vsh/libaudio";
import { Libpad, keyboard, touch } from "@vsh/libpad";
import type { Command, InputDevice } from "@vsh/libpad";
import {
  AccelMode,
  CATEGORY_MOVE,
  LEVEL_PUSH,
  PhXmShell,
  place,
  SUBMENU_PARENT_SHIFT,
} from "@vsh/paf";
import type { Metrics, Scalar, Snapshot, Spec, View } from "@vsh/paf";
import { hasChildren } from "@vsh/explore-plugin";
import { cancel, decide, focused, initial, list, move } from "@vsh/xmb-plugin";
import type { Dir, Effect, State, Step } from "@vsh/xmb-plugin";
import { design, verified } from "@vsh/qgl";
import { Presentation } from "./presentation.js";
import { ABOUT_EXIT_MS, AboutRoll } from "./about.js";
import { BOARD_EXPAND_MS, Board } from "./board.js";
import type { BoardCommand } from "./board.js";
import { WHATS_NEW, WhatsNew } from "./whats-new.js";

const PREVIEW_DELAY = design(650);
const OPTION_MOVE = { durationMs: verified(300), accelMode: AccelMode.Decelerate };