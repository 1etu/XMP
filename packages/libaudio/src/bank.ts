import type { SoundId } from "./snd.js";

const EXT = ".wav";

export class Bank {
  readonly #base: string;
  readonly #clips = new Map<SoundId, AudioBuffer>();
  readonly #absent = new Set<SoundId>();

  constructor(base: string) {
    this.#base = base;
  }

  get size(): number {
    return this.#clips.size;
  }

  get absent(): readonly SoundId[] {
    return [...this.#absent].sort();
  }

  of(id: SoundId): AudioBuffer | undefined {
    return this.#clips.get(id);
  }

  async load(ctx: AudioContext, ids: readonly SoundId[]): Promise<void> {
    await Promise.all(ids.map((id) => this.#one(ctx, id)));
  }

  async #one(ctx: AudioContext, id: SoundId): Promise<void> {
    try {
      const res = await fetch(`${this.#base}${id}${EXT}`);
      if (!res.ok) {
        this.#absent.add(id);
        return;
      }
      this.#clips.set(id, await ctx.decodeAudioData(await res.arrayBuffer()));
    } catch {
      this.#absent.add(id);
    }
  }

  clear(): void {
    this.#clips.clear();
    this.#absent.clear();
  }
}
