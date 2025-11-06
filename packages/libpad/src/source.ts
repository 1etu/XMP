import type { Command, InputDevice } from "./cmd.js";
import type { Pad } from "./repeat.js";

export type Emit = (cmd: Command) => void;

export type Detach = () => void;

export interface PadSource {
  readonly device?: InputDevice;
  attach(emit: Emit, pad: Pad): Detach;
}
