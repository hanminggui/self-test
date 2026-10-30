import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer select-none border-2 shrink-0 ${
        isDark
          ? "bg-[#0E0E16] text-[#CCFF00] border-[#CCFF00] shadow-[2px_2px_0px_#FFFFFF] hover:bg-white/10 active:translate-x-0.5 active:translate-y-0.5"
          : "bg-white text-stone-900 border-stone-900 shadow-[0_2px_0_#1c1917] hover:bg-amber-50 active:translate-y-0.5 active:shadow-none"
      } ${className}`}
      title={isDark ? "切换为多巴胺轻萌亮色模式 (Light)" : "切换为赛博先锋酸性暗色模式 (Dark)"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <>
          <Moon className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00]/20" />
          <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#CCFF00]">
            DARK
          </span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          <span className="font-sans text-[10px] font-black tracking-wider text-stone-900">
            LIGHT
          </span>
        </>
      )}
    </button>
  );
};
