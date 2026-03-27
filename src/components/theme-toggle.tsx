"use client";

import { Moon, SunDim } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/theme";

function currentThemeFromDom(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" ? "light" : "dark";
}

function applyThemeToDom(theme: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTheme(currentThemeFromDom());
  }, []);

  async function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyThemeToDom(nextTheme);
    setLoading(true);

    try {
      await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextTheme }),
      });
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="btn btn-ghost btn-sm"
      disabled={loading}
      onClick={toggleTheme}
      type="button"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunDim size={16} /> : <Moon size={16} />}
    </button>
  );
}
