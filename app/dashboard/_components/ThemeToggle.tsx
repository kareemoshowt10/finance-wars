"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function applyTheme(theme: "light" | "dark") {
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  try { localStorage.setItem("fw-theme", theme); } catch {}
}

export default function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }

  const Icon = theme === "dark" ? Sun : Moon;
  if (compact) {
    return (
      <button onClick={toggle} className="p-2 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 text-current/60 hover:text-current" title="Toggle theme">
        <Icon className="w-4 h-4" />
      </button>
    );
  }
  return (
    <button onClick={toggle} className="btn-secondary !py-1.5 !px-3 text-xs">
      <Icon className="w-3.5 h-3.5" />
      {theme === "dark" ? "Light" : "Dark"} mode
    </button>
  );
}
