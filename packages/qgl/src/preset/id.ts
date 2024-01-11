export const PRESET_IDS = [
  "base",
  "coldboot1",
  "coldboot2",
  "welcome_1",
  "welcome_2",
  "day",
  "night",
  "yoake",
  "higure",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];
