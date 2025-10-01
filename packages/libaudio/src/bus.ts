export const BUSES = ["system", "ambient", "content"] as const;

export type Bus = (typeof BUSES)[number];

export const GAIN: Readonly<Record<Bus, number>> = {
  system: 0.45,
  ambient: 0.3,
  content: 0.6,
};
