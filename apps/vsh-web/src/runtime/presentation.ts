import {
  DEFAULT_PREFERENCES,
  THEME_CHOICES,
  changePreference,
  informationOf,
  optionsFor,
  profile,
  projectOf,
} from "@vsh/content";
import type { ChoiceSetting, ContentAction, Preferences } from "@vsh/content";
import type { Command } from "@vsh/libpad";
import { design } from "@vsh/qgl";
import { WebBrowser } from "./browser.js";

export type Page =
  | { readonly kind: "browser" }
  | { readonly kind: "board" }
  | { readonly kind: "whats-new" }
  | { readonly kind: "about" }
  | { readonly kind: "system" }
  | { readonly kind: "profile"; readonly tab: number; readonly selected: number }
  | { readonly kind: "information"; readonly id: string }
  | { readonly kind: "document"; readonly id: string }
  | { readonly kind: "options"; readonly id: string; readonly selected: number }
  | {
      readonly kind: "gallery";
      readonly id: string;
      readonly index: number;
      readonly controls: boolean;
    }
  | { readonly kind: "video"; readonly id: string; readonly controls: boolean }
  | {
      readonly kind: "choice";
      readonly setting: ChoiceSetting;
      readonly selected: number;
    }
  | { readonly kind: "message"; readonly text: string };

export interface PresentationSnapshot {
  readonly pages: readonly Page[];
  readonly departing: readonly Page[];
  readonly preferences: Preferences;
}
