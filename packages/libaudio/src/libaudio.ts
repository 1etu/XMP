import { Bank } from "./bank.js";
import { mixer } from "./bus.js";
import type { Bus, Mixer } from "./bus.js";
import type { SoundId } from "./snd.js";

export interface AudioOpts {
  readonly base: string;
  readonly ids: readonly SoundId[];
}
