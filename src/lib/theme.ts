export type ThemeMode = "dark" | "light";

export const THEME_COOKIE_NAME = "trustloop_theme";

export function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "light" ? "light" : "dark";
}
