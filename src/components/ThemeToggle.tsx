"use client";
import { Moon, Sun } from "lucide-react";
import { useApp } from "@/lib/store";

export function ThemeToggle() {
  const theme = useApp((s) => s.prefs.theme);
  const setPrefs = useApp((s) => s.setPrefs);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => setPrefs({ theme: next })} className="btn-ghost w-11 px-0" aria-label={`Switch to ${next} mode`}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
