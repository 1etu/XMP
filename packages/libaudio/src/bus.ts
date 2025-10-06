export const BUSES = ["system", "ambient", "content"] as const;

export type Bus = (typeof BUSES)[number];

export const GAIN: Readonly<Record<Bus, number>> = {
  system: 0.45,
  ambient: 0.3,
  content: 0.6,
};

export interface Mixer {
  readonly master: GainNode;
  busOf(bus: Bus): GainNode | undefined;
  setVolume(value: number): void;
  readonly volume: number;
}

export function mixer(ctx: AudioContext): Mixer {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  const buses = new Map<Bus, GainNode>();

  for (const name of BUSES) {
    const g = ctx.createGain();
    g.gain.value = GAIN[name];
    g.connect(master);
    buses.set(name, g);
  }

  return {
    master,

    busOf(bus: Bus): GainNode | undefined {
      return buses.get(bus);
    },

    setVolume(value: number): void {
      master.gain.value = Math.min(Math.max(value, 0), 1);
    },

    get volume(): number {
      return master.gain.value;
    },
  };
}
