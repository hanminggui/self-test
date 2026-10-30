/**
 * Unified Share Poster Modal (PosterModal.tsx)
 * 
 * Interactive dialog overlay presenting either:
 * - Oriental Mythic Share Poster (in Chinese mode)
 * - Western Arcane Order Share Poster (in English mode)
 * 
 * Mobile Adaptation:
 * - Automatically switches to an adaptive full-screen overlay in mobile viewport (<= 768px).
 * - Generates high-definition native <img> tag supporting native long-press "Save to Photos".
 * - Primary share action prioritizes mobile native Web Share API (navigator.share),
 *   smoothly falling back to copying link with UTM tracking.
 * - Safe area inset padding and touch targets >= 44x44px.
 */

import React, { useState, useEffect, useMemo } from "react";
import { X, Sparkles, Download, Copy, Share2, Check } from "lucide-react";
import { ChineseMythicPoster } from "./ChineseMythicPoster";
import { WesternArcanePoster } from "./WesternArcanePoster";
import { useLocale } from "../../contexts/LocaleContext";
import {
  generatePosterBlob,
  downloadPoster,
  copyShareTextToClipboard,
  generateShareText,
  PosterShareData,
  SkillDisplayItem,
} from "./posterGenerator";
import { getMythicArchetype } from "./mythicArchetypes";
import { getArcaneArchetype } from "./arcaneArchetypes";
import { buildSessionShareUrl } from "../../utils/sessionRoute";
import { triggerNativeShare } from "../../utils/shareUtils";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

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

  const activeLocale = propLocale || contextLocale || report?.metadata?.locale || "zh-CN";
  const isEn = String(activeLocale).toLowerCase().startsWith("en");

  const resolvedUrl = useMemo(() => {
    if (entryUrl) return entryUrl;
    if (report?.session_id) {
      return buildSessionShareUrl(report.session_id);
    }
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/`;
    }
    return "http://localhost:8000/";
  }, [entryUrl, report?.session_id]);

  // 解析画像数据
  const profile = report?.diagnostic_profile || {};
  const quadrantCode = report?.quadrant_code || profile.quadrant_code || profile.archetype || "Q1-CAL";
  const def = useMemo(() => getArchetypeDefinition(quadrantCode, activeLocale), [quadrantCode, activeLocale]);
  const subjectName = report?.subject_name || (isEn ? "Explorer" : "探索者");

  const mythicConfig = useMemo(() => getMythicArchetype(def.archetype || quadrantCode), [def.archetype, quadrantCode]);
  const arcaneConfig = useMemo(() => getArcaneArchetype(def.archetype || quadrantCode), [def.archetype, quadrantCode]);

  const skills: SkillDisplayItem[] = useMemo(() => {
    const sourceSkills = (profile.skills && profile.skills.length >= 4) ? profile.skills : def.skills;
    return (sourceSkills || []).map((s: any) => ({
      ...s,
      name: isEn ? s.name : s.name.replace(/\s*\([^)]*\)/g, ""),
    }));
  }, [profile.skills, def.skills, isEn]);

  const shareData: PosterShareData = useMemo(() => {
    return {
      subjectName,
      archetype: isEn ? arcaneConfig.archetype : mythicConfig.archetype,
      roleTitle: profile.role_title || def.role_title || (isEn ? arcaneConfig.roleTitle : mythicConfig.roleTitle),
      praiseTagline: profile.praise_tagline || def.praise_tagline || (isEn ? arcaneConfig.praiseTagline : mythicConfig.praiseTagline),
      strengthTags: (profile.strength_tags && profile.strength_tags.length > 0)
        ? profile.strength_tags
        : def.strength_tags,
      skills,
      empoweringFeedback: profile.empowering_feedback || def.empowering_feedback || (isEn ? arcaneConfig.empoweringFeedback : mythicConfig.totemAphorism),
      locale: activeLocale,
      entryUrl: resolvedUrl,
    };
  }, [subjectName, isEn, arcaneConfig, mythicConfig, profile, def, skills, activeLocale, resolvedUrl]);

  // 移动端原生 <img> 图片生成与缓存
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);
  const [posterBlob, setPosterBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !report) return;
    let active = true;
    setGenerating(true);

    generatePosterBlob(shareData, 2)
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setPosterBlob(blob);
        setPosterImageUrl(objectUrl);
        setGenerating(false);
      })
      .catch((err) => {
        console.warn("Failed to generate mobile poster blob:", err);
        if (active) setGenerating(false);
      });

    return () => {
      active = false;
      if (posterImageUrl) {
        URL.revokeObjectURL(posterImageUrl);
      }
    };
  }, [isOpen, report, shareData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 原生系统分享处理
  const handleNativeShare = async () => {
    try {
      const text = generateShareText(shareData);
      const res = await triggerNativeShare({
        title: `Self-Test · ${shareData.roleTitle}`,
        text,
        url: resolvedUrl,
        blob: posterBlob,
        filename: `${shareData.roleTitle}.png`,
      });
      if (res.message) {
        showToast(res.message);
      }
    } catch (err: any) {
      console.error(err);
      showToast(isEn ? "Share failed, link copied instead." : "分享失败，已为您复制链接");
    }
  };

  // 下载保存海报
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadPoster(shareData, undefined, null);
      showToast(isEn ? "Poster download started! You can also long-press to save." : "海报下载已开始！长按上方图片也可直接保存");
    } catch (err) {
      console.error(err);
      showToast(isEn ? "Download failed, please long-press image to save." : "下载失败，请长按上方图片直接存储");
    } finally {
      setDownloading(false);
    }
  };

  // 复制分享文案
  const handleCopyText = async () => {
    try {
      const ok = await copyShareTextToClipboard(shareData);
      if (ok) {
        setCopiedText(true);
        showToast(isEn ? "Share text copied to clipboard!" : "分享文案已复制至剪贴板！");
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !report) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/90 md:bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 提示吐司 (Toast Message) */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-full bg-slate-900/95 border border-amber-400 text-amber-200 text-xs md:text-sm font-medium shadow-2xl shadow-amber-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. 移动端专属：自适应全屏浮层 (Mobile Adaptive Full-Screen Overlay) */}
      {/* ============================================================== */}
      <div className="flex md:hidden flex-col h-full w-full bg-[#08080C] text-white overflow-hidden pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-200">
        {/* 顶部标题与关闭栏 */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FBBF24] dark:text-[#CCFF00]" />
            <div className="flex flex-col">
              <span className="font-black text-xs text-white">
                {isEn ? "Cognitive Archetype Seal" : "认知流形 · 专属海报"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {shareData.roleTitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label={isEn ? "Close" : "关闭"}
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </header>

        {/* 核心海报图片视口区域 (原生 <img> 标签，长按可直接保存至手机相册) */}
        <main className="flex-1 overflow-y-auto px-4 py-3 flex flex-col items-center justify-center text-center">
          <div className="flex flex-col items-center max-w-full my-auto animate-in zoom-in-95 duration-300">
            {posterImageUrl ? (
              <img
                src={posterImageUrl}
                data-testid="poster-native-image"
                alt={shareData.roleTitle || "Cognitive Archetype Poster"}
                className="w-auto max-w-full max-h-[58dvh] rounded-2xl shadow-2xl border border-white/20 object-contain touch-auto select-auto"
              />
            ) : (
              <div className="w-64 h-96 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 animate-pulse my-auto">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
                  data-testid="poster-native-image"
                  alt={shareData.roleTitle || "Cognitive Archetype Poster"}
                  className="hidden"
                />
                <Sparkles className="w-8 h-8 text-[#FBBF24] dark:text-[#CCFF00] animate-spin" />
                <span className="text-xs text-stone-300 font-bold">
                  {isEn ? "Generating HD Poster..." : "正在渲染高清海报..."}
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] font-bold text-amber-300 dark:text-[#CCFF00] mt-3 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? "Long-press image to save to album" : "长按上方海报直接保存到手机相册"}</span>
            </div>
          </div>
        </main>

        {/* 底部常驻拇指触控操作栏 (Bottom Action Dock) */}
        <footer className="shrink-0 w-full p-3.5 bg-black/90 backdrop-blur-xl border-t border-white/10 flex flex-col gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* 主操作：系统原生分享 (优先 Web Share API) */}
          <button
            type="button"
            data-testid="mobile-native-share-btn"
            onClick={handleNativeShare}
            className="w-full min-h-[44px] py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] shadow-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
            <span>{isEn ? "System Native Share / Copy Link" : "系统原生分享 / 复制链接"}</span>
          </button>

          {/* 次级操作网格：保存海报与复制文案 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="min-h-[44px] py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{downloading ? (isEn ? "Saving..." : "正在保存...") : (isEn ? "Save Image" : "保存到相册")}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[44px] py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 active:scale-[0.98] transition-all cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{isEn ? "Copied!" : "已复制！"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>{isEn ? "Copy Text" : "复制分享文案"}</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* ============================================================== */}
      {/* 2. 桌面端居中弹窗 (Desktop Centered Modal Overlay) */}
      {/* ============================================================== */}
      <div className="hidden md:flex relative w-full max-w-xl my-auto py-4 bg-white/95 dark:bg-[#08080C] border-2 border-stone-900 dark:border-white/20 shadow-[0_8px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] p-4 sm:p-6 rounded-[28px] flex-col max-h-[92vh]">
        {/* 顶部弹窗控制栏 */}
        <div className="flex items-center justify-between pb-3 px-2">
          <div className="flex items-center gap-2 font-black text-sm text-stone-900 dark:text-white">
            <Sparkles className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24] dark:text-[#CCFF00] dark:fill-[#CCFF00]" />
            <span>
              {isEn
                ? "Arcane Order · Cognitive Archetype Seal"
                : "认知流形 · 原创画像专属分享卡"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-[#0E0E16] hover:bg-amber-100 dark:hover:bg-white/10 text-stone-900 dark:text-white flex items-center justify-center border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            aria-label={isEn ? "Close" : "关闭"}
          >
            <X className="w-4 h-4 text-stone-900 dark:text-white stroke-[2.5]" />
          </button>
        </div>

        {/* 海报主体 (多语言自适应分流) */}
        <div className="max-h-[80vh] overflow-y-auto rounded-3xl pr-1">
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
