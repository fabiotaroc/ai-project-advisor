import * as React from "react";

export const THEME_STORAGE_KEY = "theme";

type ThemeScriptProps = {
  storageKey?: string;
  defaultTheme?: "light" | "dark" | "system";
  attribute?: "class" | string;
};

// Server-rendered FOUC prevention script. Lives outside the client React tree
// to avoid React 19's "script tag inside React component" dev warning that
// next-themes triggers in Next.js 16.
export function ThemeScript({
  storageKey = THEME_STORAGE_KEY,
  defaultTheme = "system",
  attribute = "class",
}: ThemeScriptProps) {
  const script = `(function(){try{var d=document.documentElement;var s=localStorage.getItem(${JSON.stringify(
    storageKey
  )})||${JSON.stringify(defaultTheme)};var t=s==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):s;${
    attribute === "class"
      ? `d.classList.remove("light","dark");d.classList.add(t);`
      : `d.setAttribute(${JSON.stringify(attribute)},t);`
  }d.style.colorScheme=t;}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
