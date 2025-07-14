import type { ChoiceSetting } from "./theme.js";

export type ContentAction =
  | { readonly kind: "about" }
  | { readonly kind: "system" }
  | { readonly kind: "profile" }
  | { readonly kind: "board" }
  | { readonly kind: "whats-new" }
  | { readonly kind: "board-display"; readonly enabled: boolean }
  | { readonly kind: "browser"; readonly href?: string; readonly title?: string }
  | { readonly kind: "information"; readonly id: string }
  | { readonly kind: "document"; readonly id: string }
  | { readonly kind: "gallery"; readonly id: string }
  | { readonly kind: "video"; readonly id: string }
  | { readonly kind: "link"; readonly href: string }
  | { readonly kind: "choice"; readonly setting: ChoiceSetting };

export interface ContentOption {
  readonly label: string;
  readonly action: ContentAction;
}
