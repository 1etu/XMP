export const SystemSound = {
  Cursor: "snd_cursor",
  Decide: "snd_decide",
  Cancel: "snd_cancel",
  CategoryDecide: "snd_category_decide",
  Option: "snd_option",
  Error: "snd_error",
} as const;

export type SoundId = (typeof SystemSound)[keyof typeof SystemSound];

export const SOUND_IDS: readonly SoundId[] = Object.values(SystemSound);

export function isSoundId(v: string): v is SoundId {
  return (SOUND_IDS as readonly string[]).includes(v);
}
