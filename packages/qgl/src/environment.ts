import { measured } from "@vsh/resource";
import { lerp } from "./preset.js";
import type { Catalog, Preset, PresetId } from "./preset.js";

const SCHEDULE: readonly (readonly [number, PresetId])[] = [
  [measured(0), "night"],
  [measured(1), "night"],
  [measured(5), "yoake"],
  [measured(7), "yoake"],
  [measured(11), "day"],
  [measured(13), "day"],
  [measured(17), "higure"],
  [measured(19), "higure"],
  [measured(23), "night"],
  [measured(24), "night"],
];

export function environmentAt(cat: Catalog, hour: number): Preset {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 1; i < SCHEDULE.length; i += 1) {
    const a = SCHEDULE[i - 1];
    const b = SCHEDULE[i];
    if (a === undefined || b === undefined || h > b[0]) continue;
    return lerp(cat[a[1]], cat[b[1]], (h - a[0]) / (b[0] - a[0]));
  }
  return cat.night;
}
