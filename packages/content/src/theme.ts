export const THEME_COLORS = [
  { value: "silver", label: "Silver", swatch: "#c0c3ca", month: 1 },
  { value: "yellow", label: "Yellow", swatch: "#cfc620", month: 2 },
  { value: "green", label: "Light Green", swatch: "#83b33b", month: 3 },
  { value: "pink", label: "Pink", swatch: "#cf657f", month: 4 },
  { value: "leaf", label: "Green", swatch: "#299825", month: 5 },
  { value: "lavender", label: "Light Purple", swatch: "#9c75c5", month: 6 },
  { value: "aqua", label: "Turquoise", swatch: "#1bb8ac", month: 7 },
  { value: "blue", label: "Blue", swatch: "#003ac0", month: 8 },
  { value: "purple", label: "Purple", swatch: "#8f3ca3", month: 9 },
  { value: "orange", label: "Orange", swatch: "#d89a12", month: 10 },
  { value: "brown", label: "Brown", swatch: "#8c641e", month: 11 },
  { value: "red", label: "Red", swatch: "#bc3d2c", month: 12 },
] as const;

export type ThemeColor = "original" | (typeof THEME_COLORS)[number]["value"];
export type ChoiceSetting =
  "theme" | "color" | "background" | "brightness" | "font" | "motion";

export interface Preferences {
  readonly theme: "original" | "classic";
  readonly color: ThemeColor;
  readonly background: "original" | "classic" | "wallpaper";
  readonly brightness: number;
  readonly font: "original" | "rounded" | "pop";
  readonly motion: "system" | "reduced";
  readonly wallpaper: string;
}

export interface ThemeChoice {
  readonly value: string;
  readonly label: string;
  readonly swatch?: string;
  readonly setting?: ChoiceSetting;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "original",
  color: "original",
  background: "original",
  brightness: 0,
  font: "original",
  motion: "system",
  wallpaper: "",
};
