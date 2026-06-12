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
const MATERIAL_FADE = { durationMs: design(200), accelMode: AccelMode.Linear };

const DIRS: Readonly<Record<string, Dir>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

const SOUND: Readonly<Record<Effect, SoundId | undefined>> = {
  none: undefined,
  cursor: SystemSound.Cursor,
  category: SystemSound.CategoryDecide,
  decide: SystemSound.Decide,
  cancel: SystemSound.Cancel,
  reject: SystemSound.Error,
};

const SOUND_BASE = "/original/sound/";

const EMPTY: Snapshot = {
  categories: [],
  categoryLabel: undefined,
  categoryLabels: [],
  items: [],
  labels: [],
};

export interface Described {
  readonly category: string;
  readonly depth: number;
  readonly categories: readonly { id: string; title: string; focused: boolean }[];
  readonly items: readonly {
    id: string;
    title: string;
    info: string;
    focused: boolean;
    folder: boolean;
  }[];
}

export interface ShellOpts {
  readonly cats: readonly Category[];
  readonly metrics: Metrics;
  readonly icons: Readonly<Record<number, string>>;
  readonly target: EventTarget;
  readonly onEffect: (effect: Effect) => void;
  readonly preferences: Preferences;
  readonly onPreferences: (value: Preferences) => void;
}

interface Column {
  state: State;
  offset: number;
  readonly alpha: Scalar;
}
