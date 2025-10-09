import { Bank } from "./bank.js";
import { mixer } from "./bus.js";
import type { Bus, Mixer } from "./bus.js";
import type { SoundId } from "./snd.js";

export interface AudioOpts {
  readonly base: string;
  readonly ids: readonly SoundId[];
}

const DEFAULT_BUS: Bus = "system";

export class Libaudio {
  readonly #ids: readonly SoundId[];
  readonly #bank: Bank;

  #ctx: AudioContext | undefined;
  #mix: Mixer | undefined;
  #opening = false;

  constructor(opts: AudioOpts) {
    this.#ids = opts.ids;
    this.#bank = new Bank(opts.base);
  }

  get ready(): boolean {
    return this.#bank.size > 0;
  }

  get absent(): readonly SoundId[] {
    return this.#bank.absent;
  }

  async unlock(): Promise<void> {
    if (this.#ctx !== undefined || this.#opening) {
      await this.#ctx?.resume();
      return;
    }

    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined;
    if (Ctor === undefined) {
      return;
    }

    this.#opening = true;

    const ctx = new Ctor();
    this.#ctx = ctx;
    this.#mix = mixer(ctx);

    await this.#bank.load(ctx, this.#ids);
  }

  play(id: SoundId, bus: Bus = DEFAULT_BUS): void {
    const ctx = this.#ctx;
    const clip = this.#bank.of(id);
    const out = this.#mix?.busOf(bus);

    if (ctx === undefined || clip === undefined || out === undefined) {
      return;
    }

    const src = ctx.createBufferSource();
    src.buffer = clip;
    src.connect(out);
    src.start();
  }

  setVolume(value: number): void {
    this.#mix?.setVolume(value);
  }

  dispose(): void {
    void this.#ctx?.close();
    this.#ctx = undefined;
    this.#mix = undefined;
    this.#opening = false;
    this.#bank.clear();
  }
}
