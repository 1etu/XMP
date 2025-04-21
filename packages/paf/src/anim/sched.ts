import { Scalar } from "./scalar.js";

export class Scheduler {
  readonly #tracks = new Set<Scalar>();

  get size(): number {
    return this.#tracks.size;
  }

  get settled(): boolean {
    for (const t of this.#tracks) {
      if (!t.done) {
        return false;
      }
    }

    return true;
  }

  add(value: number): Scalar {
    const s = new Scalar(value);
    this.#tracks.add(s);

    return s;
  }

  remove(track: Scalar): void {
    this.#tracks.delete(track);
  }

  clear(): void {
    this.#tracks.clear();
  }

  tick(deltaMs: number): void {
    for (const t of this.#tracks) {
      t.tick(deltaMs);
    }
  }
}
