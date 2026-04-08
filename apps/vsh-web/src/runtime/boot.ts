export type BootState =
  "cold" | "initializing" | "loading-shell" | "starting" | "ready" | "failed";

export interface BootSnapshot {
  readonly state: BootState;
  readonly stage: string;
  readonly done: number;
  readonly total: number;
  readonly detail: string;
}

export interface Stage {
  readonly id: string;
  readonly state: BootState;
  run(): Promise<void>;
}

const COLD: BootSnapshot = {
  state: "cold",
  stage: "",
  done: 0,
  total: 0,
  detail: "",
};

export class Boot {
  #snap: BootSnapshot = COLD;
  readonly #watchers = new Set<() => void>();

  readonly subscribe = (fn: () => void): (() => void) => {
    this.#watchers.add(fn);

    return () => {
      this.#watchers.delete(fn);
    };
  };

  readonly snapshot = (): BootSnapshot => this.#snap;

  async run(stages: readonly Stage[]): Promise<void> {
    const total = stages.length;
    let done = 0;

    for (const stage of stages) {
      this.#set({
        state: stage.state,
        stage: stage.id,
        done,
        total,
        detail: "",
      });

      try {
        await stage.run();
      } catch (err) {
        this.#set({
          state: "failed",
          stage: stage.id,
          done,
          total,
          detail: err instanceof Error ? err.message : String(err),
        });

        return;
      }

      done += 1;
    }

    this.#set({ state: "ready", stage: "", done, total, detail: "" });
  }

  #set(next: BootSnapshot): void {
    this.#snap = next;

    for (const fn of this.#watchers) {
      fn();
    }
  }
}
