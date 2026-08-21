"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
/** Оттенок фона — независим от режима: каждый работает и в светлой, и в тёмной теме. */
export type Tint = "neutral" | "warm" | "cool";

const THEME_KEY = "prime-theme";
const TINT_KEY = "prime-tint";

function applyTheme(theme: Theme) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

function applyTint(tint: Tint) {
  document.documentElement.classList.toggle("tint-warm", tint === "warm");
  document.documentElement.classList.toggle("tint-cool", tint === "cool");
}

/**
 * Общий стейт оформления для шапки, мобильного меню и профиля — раньше
 * каждая переключалка сама читала/писала localStorage, и они расходились.
 * Системная тема ещё и следит за сменой темы ОС на лету, пока выбрана.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [tint, setTintState] = useState<Tint>("neutral");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    const storedTint = (localStorage.getItem(TINT_KEY) as Tint | null) ?? "neutral";
    setThemeState(storedTheme);
    setTintState(storedTint);
    setDark(applyTheme(storedTheme));
    applyTint(storedTint);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
      if (current === "system") setDark(applyTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    setDark(applyTheme(next));
  };

  const setTint = (next: Tint) => {
    setTintState(next);
    localStorage.setItem(TINT_KEY, next);
    applyTint(next);
  };

  return { theme, dark, setTheme, tint, setTint };
}
