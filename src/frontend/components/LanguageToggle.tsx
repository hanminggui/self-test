import React from "react";
import { useLocale } from "../contexts/LocaleContext";

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = "" }) => {
  const { locale, setLocale } = useLocale();

  const isEn = locale === "en-US";

  const toggle = () => {
    setLocale(isEn ? "zh-CN" : "en-US");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-400/30 backdrop-blur-md transition-all duration-200 cursor-pointer text-slate-300 hover:text-white shadow-sm select-none ${className}`}
      title={isEn ? "Switch to Chinese (zh-CN)" : "切换至英文 (en-US)"}
      aria-label={isEn ? "Switch to Chinese" : "Switch to English"}
    >
      <span className="text-sm">🌐</span>
      <span className="font-mono tracking-wider font-semibold">
        <span className={!isEn ? "text-indigo-400 font-bold" : "text-slate-400"}>中</span>
        <span className="text-slate-600 mx-1">/</span>
        <span className={isEn ? "text-indigo-400 font-bold" : "text-slate-400"}>EN</span>
      </span>
    </button>
  );
};
