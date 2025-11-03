import { design } from "@vsh/resource";

import { isRepeatable } from "./cmd.js";
import type { Command } from "./cmd.js";

export interface Repeat {
  readonly holdMs: number;
  readonly rateMs: number;
  readonly fastAfterMs: number;
  readonly fastRateMs: number;
}

export const REPEAT: Repeat = {
  holdMs: design(400),
  rateMs: design(120),
  fastAfterMs: design(1600),
  fastRateMs: design(60),
};

interface Held {
  readonly cmd: Command;
  heldMs: number;
  nextMs: number;
}

export class Pad {
  readonly #repeat: Repeat;
  readonly #held = new Map<Command, Held>();

  constructor(repeat: Repeat = REPEAT) {
    this.#repeat = repeat;
  }

  get held(): readonly Command[] {
    return [...this.#held.keys()];
  }

  isHeld(cmd: Command): boolean {
    return this.#held.has(cmd);
  }

  press(cmd: Command): readonly Command[] {
    if (this.#held.has(cmd)) {
      return [];
    }

    this.#held.set(cmd, { cmd, heldMs: 0, nextMs: this.#repeat.holdMs });

    return [cmd];
  }

  release(cmd: Command): void {
    this.#held.delete(cmd);
  }

  releaseAll(): void {
    this.#held.clear();
  }

  tick(deltaMs: number): readonly Command[] {
    const out: Command[] = [];

    for (const held of this.#held.values()) {
      if (!isRepeatable(held.cmd)) {
        continue;
      }

      held.heldMs += deltaMs;

      while (held.heldMs >= held.nextMs) {
        out.push(held.cmd);
        held.nextMs +=
          held.heldMs >= this.#repeat.fastAfterMs
            ? this.#repeat.fastRateMs
            : this.#repeat.rateMs;
      }
    }

    return out;
  }
}
