"use client";

import { useEffect } from "react";

/** Appearance chosen in Settings: light, dark, or follow the computer's setting. */
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

/**
 * Runs in <head> before the page paints, so a dark-mode user never sees a white flash.
 * Kept as a string because it is inlined into the HTML.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"light";` +
  `var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);` +
  `document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "system" ? stored : "light";
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemePreference(preference: ThemePreference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
}

/** Keeps "System" in sync when the computer switches between light and dark while the app is open. */
export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getThemePreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return null;
}
