import type { ContentOption } from "./action.js";
import { optionsFor } from "./option.js";
import { profile, projectOf, repoOf } from "./project.js";

export interface Information {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly paragraphs: readonly string[];
  readonly rows: readonly (readonly [string, string])[];
  readonly options: readonly ContentOption[];
}
