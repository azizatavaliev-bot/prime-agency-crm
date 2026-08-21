"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "prime-theme";

function applyTheme(theme: Theme) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

/**
 * Общий стейт темы для шапки и меню — раньше каждая переключалка сама
 * читала/писала localStorage, и они расходились. Системная тема ещё и
 * следит за сменой темы ОС на лету, пока выбрана.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setDark(applyTheme(stored));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
      if (current === "system") setDark(applyTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setDark(applyTheme(next));
  };

  return { theme, dark, setTheme };
}
