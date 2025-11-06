import type { Command, InputDevice } from "./cmd.js";
import type { Pad } from "./repeat.js";

export type Emit = (cmd: Command) => void;

export type Detach = () => void;
