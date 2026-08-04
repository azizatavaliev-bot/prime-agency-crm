"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("prime-theme", next ? "dark" : "light");
  };

  return (
    <button onClick={toggle} className="btn-ghost w-full" title="Сменить тему">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}
