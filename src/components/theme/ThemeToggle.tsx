"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const cycleTheme = () => {
    const modes = ["light", "dark", "system"] as const;
    const currentIndex = modes.indexOf(theme as (typeof modes)[number]);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const icons: Record<string, React.ReactNode> = {
    light: <Sun className="w-5 h-5" />,
    dark: <Moon className="w-5 h-5" />,
    system: <Monitor className="w-5 h-5" />,
  };

  const labels: Record<string, string> = {
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
      title={`当前主题: ${labels[theme || "system"]}`}
    >
      {icons[theme || "system"] || <Monitor className="w-5 h-5" />}
    </button>
  );
}
