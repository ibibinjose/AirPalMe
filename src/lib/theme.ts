export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "airpal_theme";

export function getThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    /* fallback */
  }
  return "system";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
  } else if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("dark", "light");
    root.removeAttribute("data-theme");
  }
}

export function setThemePreference(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

export function initTheme(): void {
  applyTheme(getThemePreference());
}
