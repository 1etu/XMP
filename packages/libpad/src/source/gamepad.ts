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
