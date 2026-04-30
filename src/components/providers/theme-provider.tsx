"use client";

import * as React from "react";
import { THEME_STORAGE_KEY } from "@/components/providers/theme-script";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: "class" | string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  themes: Theme[];
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(
  theme: ResolvedTheme,
  attribute: string,
  disableTransition: boolean
) {
  const root = document.documentElement;

  let cleanupTransition: (() => void) | null = null;
  if (disableTransition) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important}"
      )
    );
    document.head.appendChild(style);
    cleanupTransition = () => {
      window.getComputedStyle(document.body);
      setTimeout(() => document.head.removeChild(style), 1);
    };
  }

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  } else {
    root.setAttribute(attribute, theme);
  }
  root.style.colorScheme = theme;

  cleanupTransition?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
  attribute = "class",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = window.localStorage.getItem(storageKey) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
      if (stored === "system" && enableSystem) return "system";
    } catch {}
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "light" : getSystemTheme()
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : (theme as ResolvedTheme);

  React.useEffect(() => {
    applyTheme(resolvedTheme, attribute, disableTransitionOnChange);
  }, [resolvedTheme, attribute, disableTransitionOnChange]);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue as Theme | null;
      if (next === "light" || next === "dark" || next === "system") {
        setThemeState(next);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {}
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: enableSystem
        ? ["light", "dark", "system"]
        : ["light", "dark"],
    }),
    [theme, setTheme, resolvedTheme, enableSystem]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: undefined as Theme | undefined,
      setTheme: (_: Theme) => {},
      resolvedTheme: undefined as ResolvedTheme | undefined,
      themes: ["light", "dark", "system"] as Theme[],
    };
  }
  return ctx;
}
