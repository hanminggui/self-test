/**
 * Unified Share Poster Modal (PosterModal.tsx)
 * 
 * Interactive dialog overlay presenting either:
 * - Oriental Mythic Share Poster (in Chinese mode)
 * - Western Arcane Order Share Poster (in English mode)
 * 
 * Features dynamic multilingual adaptive routing, responsive container,
 * high-DPI export actions, and unified modal controls.
 */

import React, { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { ChineseMythicPoster } from "./ChineseMythicPoster";
import { WesternArcanePoster } from "./WesternArcanePoster";
import { useLocale } from "../../contexts/LocaleContext";

export interface PosterModalProps {
  isOpen: boolean;
  report: any | null;
  locale?: string;
  entryUrl?: string;
  onClose: () => void;
}

export const PosterModal: React.FC<PosterModalProps> = ({
  isOpen,
  report,
  locale: propLocale,
  entryUrl,
  onClose,
}) => {
  // ESC 快捷键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 从 LocaleContext 中获取当前激活语言，或采用 prop / report 语言
  let contextLocale = "zh-CN";
  try {
    const loc = useLocale();
    if (loc?.locale) contextLocale = loc.locale;
  } catch {
    // 允许在非 React Context 环境（如独立 SSR 测试）中优雅回退
  }

  if (!isOpen || !report) return null;

  const activeLocale = propLocale || contextLocale || report?.metadata?.locale || "zh-CN";
  const isEn = String(activeLocale).toLowerCase().startsWith("en");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-auto py-4">
        {/* 顶部弹窗控制栏 */}
        <div className="flex items-center justify-between pb-3 px-2">
          <div className="flex items-center gap-2 font-black text-sm text-white">
            <Sparkles className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24]" />
            <span>
              {isEn
                ? "Arcane Order · Cognitive Archetype Seal"
                : "认知流形 · 原创画像专属分享卡"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-[#0E0E16] hover:bg-amber-100 dark:hover:bg-white/10 text-stone-900 dark:text-white flex items-center justify-center border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            aria-label={isEn ? "Close" : "关闭"}
          >
            <X className="w-4 h-4 text-stone-900 dark:text-white stroke-[2.5]" />
          </button>
        </div>

        {/* 海报主体 (多语言自适应分流) */}
        <div className="max-h-[85vh] overflow-y-auto rounded-3xl pr-1">
          {isEn ? (
            <WesternArcanePoster
              report={report}
              entryUrl={entryUrl}
              onClose={onClose}
            />
          ) : (
            <ChineseMythicPoster
              report={report}
              entryUrl={entryUrl}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
