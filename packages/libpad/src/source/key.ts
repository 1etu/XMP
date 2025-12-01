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

function claimed(ev: KeyboardEvent): boolean {
  const element = ev.target;
  if (!(element instanceof Element)) {
    return false;
  }

  if (ev.code !== "Escape" && element.closest(EDITABLE) !== null) {
    return true;
  }
  if (ev.shiftKey && element.closest(NATIVE) !== null) {
    return true;
  }

  return (
    (ev.code === "Enter" || ev.code === "Space") && element.closest(LINK) !== null
  );
}

export function keyboard(target: EventTarget): PadSource {
  return {
    device: "keyboard",

    attach(emit, pad) {
      const down = (e: Event): void => {
        const ev = e as KeyboardEvent;
        if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.repeat || claimed(ev)) {
          return;
        }

        const cmd = KEYS[ev.code];
        if (cmd === undefined) {
          return;
        }

        ev.preventDefault();
        for (const c of pad.press(cmd)) {
          emit(c);
        }
      };

      const up = (e: Event): void => {
        const cmd = KEYS[(e as KeyboardEvent).code];
        if (cmd !== undefined) {
          pad.release(cmd);
        }
      };

      const blur = (): void => {
        pad.releaseAll();
      };

      target.addEventListener("keydown", down);
      target.addEventListener("keyup", up);
      globalThis.addEventListener("blur", blur);

      return () => {
        target.removeEventListener("keydown", down);
        target.removeEventListener("keyup", up);
        globalThis.removeEventListener("blur", blur);
      };
    },
  };
}
