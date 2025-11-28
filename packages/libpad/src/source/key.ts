import type { Command } from "../cmd.js";
import type { PadSource } from "../source.js";

const KEYS: Readonly<Record<string, Command>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  Enter: "decide",
  Space: "decide",
  Escape: "cancel",
  Backspace: "cancel",
  KeyT: "options",
  PageUp: "l1",
  PageDown: "r1",
};

const EDITABLE = 'input, textarea, select, [contenteditable="true"]';
const NATIVE = "[data-native-input]";
const LINK =
  'a:not([role="menuitem"]):not([data-shell-link]), button[data-native-input], [data-native-input] button';
