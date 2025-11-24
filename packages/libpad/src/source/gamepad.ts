import type { Command } from "../cmd.js";

const BUTTONS: Readonly<Record<number, Command>> = {
  0: "decide",
  1: "cancel",
  3: "options",
  4: "l1",
  5: "r1",
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

const AXIS_DEAD = 0.55;
const STANDARD = "standard";

export function scan(): ReadonlySet<Command> {
  const now = new Set<Command>();

  if (typeof navigator.getGamepads !== "function") {
    return now;
  }

  for (const gp of navigator.getGamepads()) {
    if (gp === null || !gp.connected || gp.mapping !== STANDARD) {
      continue;
    }

    gp.buttons.forEach((b, i) => {
      const cmd = BUTTONS[i];
      if (cmd !== undefined && b.pressed) {
        now.add(cmd);
      }
    });

    const [ax = 0, ay = 0] = gp.axes;

    if (ax < -AXIS_DEAD) {
      now.add("left");
    } else if (ax > AXIS_DEAD) {
      now.add("right");
    }

    if (ay < -AXIS_DEAD) {
      now.add("up");
    } else if (ay > AXIS_DEAD) {
      now.add("down");
    }
  }

  return now;
}
