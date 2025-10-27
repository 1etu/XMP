import type { Command, InputDevice } from "./cmd.js";
import { Pad } from "./repeat.js";
import type { Detach, PadSource } from "./source.js";
import { scan } from "./source/gamepad.js";

const DEFAULT_DEVICE: InputDevice = "keyboard";
