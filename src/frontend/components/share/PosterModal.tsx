/**
 * Chinese Oriental Mythic Share Poster Modal (PosterModal.tsx)
 * 
 * Interactive dialog overlay presenting the Chinese Mythic Share Poster
 * with high-DPI export actions, dynamic QR codes, and seamless responsive layout.
 */

import React, { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { ChineseMythicPoster } from "./ChineseMythicPoster";

export interface PosterModalProps {
  isOpen: boolean;
  report: any | null;
  entryUrl?: string;
  onClose: () => void;
}

export const PosterModal: React.FC<PosterModalProps> = ({
  isOpen,
  report,
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

  if (!isOpen || !report) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-auto py-4">
        {/* 顶部弹窗控制栏 */}
        <div className="flex items-center justify-between pb-3 px-2">
          <div className="flex items-center gap-2 text-amber-300 font-serif font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>东方认知流形 · 易经八卦神话分享卡</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 海报核心卡片主体 */}
        <div className="max-h-[85vh] overflow-y-auto rounded-3xl pr-1">
          <ChineseMythicPoster
            report={report}
            entryUrl={entryUrl}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
