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

export const SETTING_LABELS: Readonly<Record<ChoiceSetting, string>> = {
  theme: "Theme",
  color: "Colour",
  background: "Background",
  brightness: "Brightness",
  font: "Font",
  motion: "Motion",
};

export const THEME_CHOICES: Readonly<Record<ChoiceSetting, readonly ThemeChoice[]>> = {
  theme: [
    { value: "original", label: "Original" },
    { value: "classic", label: "Classic" },
  ],
  color: [{ value: "original", label: "Original" }, ...THEME_COLORS],
  background: [
    { value: "brightness", label: "Brightness", setting: "brightness" },
    { value: "original", label: "Original" },
    { value: "classic", label: "Classic" },
    { value: "wallpaper", label: "Wallpaper" },
  ],
  brightness: Array.from({ length: 11 }, (_, i) => ({
    value: String(i - 5),
    label: i > 5 ? `+${String(i - 5)}` : String(i - 5),
  })),
  font: [
    { value: "original", label: "Original" },
    { value: "rounded", label: "Rounded" },
    { value: "pop", label: "Pop" },
  ],
  motion: [
    { value: "system", label: "System" },
    { value: "reduced", label: "Reduced" },
  ],
};

export function preferenceLabel(
  preferences: Preferences,
  setting: ChoiceSetting,
): string {
  return (
    THEME_CHOICES[setting].find(
      (choice) => choice.value === String(preferences[setting]),
    )?.label ?? "Original"
  );
}
