import { DEFAULT_PREFERENCES, changePreference } from "@vsh/content";
import type { ChoiceSetting, Preferences } from "@vsh/content";

const KEY = "xmp.preferences";

export function readPreferences(): Preferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value === null || typeof value !== "object") return DEFAULT_PREFERENCES;
    let preferences = DEFAULT_PREFERENCES;
    const settings: readonly ChoiceSetting[] = [
      "theme",
      "color",
      "background",
      "brightness",
      "font",
      "motion",
    ];
    for (const setting of settings) {
      const next: unknown = Reflect.get(value, setting);
      if (typeof next === "string" || typeof next === "number")
        preferences = changePreference(preferences, setting, String(next));
    }
    const wallpaper: unknown = Reflect.get(value, "wallpaper");
    if (typeof wallpaper === "string" && wallpaper.startsWith("/portfolio/"))
      preferences = { ...preferences, wallpaper };
    return preferences.background === "wallpaper" && preferences.wallpaper === ""
      ? { ...preferences, background: "original" }
      : preferences;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
