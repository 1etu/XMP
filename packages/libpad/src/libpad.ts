import type { Command, InputDevice } from "./cmd.js";
import { Pad } from "./repeat.js";
import type { Detach, PadSource } from "./source.js";
import { scan } from "./source/gamepad.js";

const DEFAULT_DEVICE: InputDevice = "keyboard";

export class Libpad {
  readonly #pad = new Pad();
  readonly #detach: Detach[] = [];
  readonly #queue: Command[] = [];
  readonly #gamepad = new Set<Command>();

  #device: InputDevice = DEFAULT_DEVICE;

  get device(): InputDevice {
    return this.#device;
  }

  get held(): readonly Command[] {
    return this.#pad.held;
  }

  attach(sources: readonly PadSource[]): void {
    for (const s of sources) {
      this.#detach.push(
        s.attach((cmd) => {
          this.#device = s.device ?? DEFAULT_DEVICE;
          this.#queue.push(cmd);
        }, this.#pad),
      );
    }
  }

  #poll(): void {
    const now = scan();

    for (const cmd of now) {
      if (!this.#gamepad.has(cmd)) {
        this.#device = "gamepad";
        this.#queue.push(...this.#pad.press(cmd));
      }
    }

    for (const cmd of this.#gamepad) {
      if (!now.has(cmd)) {
        this.#pad.release(cmd);
      }
    }

    this.#gamepad.clear();
    for (const cmd of now) {
      this.#gamepad.add(cmd);
    }
  }

  flush(deltaMs: number): readonly Command[] {
    this.#poll();

    const out = [...this.#queue, ...this.#pad.tick(deltaMs)];
    this.#queue.length = 0;

    return out;
  }

  dispose(): void {
    for (const d of this.#detach) {
      d();
    }

    this.#detach.length = 0;
    this.#queue.length = 0;
    this.#gamepad.clear();
    this.#pad.releaseAll();
  }
}
