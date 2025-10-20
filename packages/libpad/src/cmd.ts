export const COMMANDS = [
  "up",
  "down",
  "left",
  "right",
  "decide",
  "cancel",
  "options",
  "l1",
  "r1",
] as const;

export type Command = (typeof COMMANDS)[number];
