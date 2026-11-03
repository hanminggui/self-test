/**
 * Minimalist Editorial Share Poster Component (MinimalistPoster.tsx)
 * 
 * Renders an ultra-refined, gallery-grade Swiss/Bauhaus monochromatic
 * typographic share card for all 8 cognitive archetypes.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Link2,
} from "lucide-react";
import {
  generatePosterQrCodeSvg,
  downloadPoster,
  copyPosterImageToClipboard,
  copyShareTextToClipboard,
  generateShareText,
  PosterShareData,
  SkillDisplayItem,
} from "./posterGenerator";
import { buildSessionShareUrl } from "../../utils/sessionRoute";
import { triggerNativeShare } from "../../utils/shareUtils";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";
import { useLocale } from "../../contexts/LocaleContext";

export interface MinimalistPosterProps {
  report: {
    subject_name?: string;
    avatar_url?: string | null;
    session_id?: string;
    quadrant_code?: string;
    metrics?: any;
    metacognitive_metrics?: any;
    diagnostic_profile?: {
      archetype?: string;
      quadrant_code?: string;
      role_title?: string;
      praise_tagline?: string;
      strength_tags?: string[];
      empowering_feedback?: string;
      growth_advice?: string;
      skills?: SkillDisplayItem[];
    };
  };
  avatar_url?: string | null;
  entryUrl?: string;
  onClose?: () => void;
  className?: string;
}

export const MinimalistPoster: React.FC<MinimalistPosterProps> = ({
  report,
  avatar_url: propAvatarUrl,
  entryUrl,
  onClose,
  className = "",
}) => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const profile = report.diagnostic_profile || {};
  const quadrantCode = report.quadrant_code || profile.quadrant_code || profile.archetype || "Q1-CAL";
  const def = useMemo(() => getArchetypeDefinition(quadrantCode, locale || "zh-CN"), [quadrantCode, locale]);
  const subjectName = report.subject_name?.trim() || (isEn ? "Explorer" : "探索者");
  const avatarUrl = propAvatarUrl || report.avatar_url || (report as any).avatarUrl || null;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const skills: SkillDisplayItem[] = useMemo(() => {
    const sourceSkills = (profile.skills && profile.skills.length >= 4) ? profile.skills : def.skills;
    return (sourceSkills || []).map((s) => ({
      ...s,
      name: isEn ? s.name : s.name.replace(/\s*\([^)]*\)/g, ""),
    }));
  }, [profile.skills, def.skills, isEn]);

  const [qrSvg, setQrSvg] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const posterCardRef = useRef<HTMLDivElement>(null);

  const resolvedUrl = useMemo(() => {
    if (entryUrl) return entryUrl;
    if (report?.session_id) {
      return buildSessionShareUrl(report.session_id);
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/`;
    }
    return "http://localhost:8000/";
  }, [entryUrl, report?.session_id]);

  useEffect(() => {
    generatePosterQrCodeSvg(resolvedUrl).then(setQrSvg);
  }, [resolvedUrl]);

  const shareData: PosterShareData = useMemo(() => {
    return {
      subjectName,
      avatar_url: avatarUrl,
      avatarUrl,
      archetype: def.archetype,
      roleTitle: profile.role_title || def.role_title,
      praiseTagline: profile.praise_tagline || def.praise_tagline,
      strengthTags: (profile.strength_tags && profile.strength_tags.length > 0)
        ? profile.strength_tags
        : def.strength_tags,
      skills,
      empoweringFeedback: profile.empowering_feedback || def.empowering_feedback,
      locale: locale || "zh-CN",
      entryUrl: resolvedUrl,
    };
  }, [subjectName, avatarUrl, profile, def, skills, locale, resolvedUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyImage = async () => {
    try {
      setCopyingImage(true);
      const ok = await copyPosterImageToClipboard(shareData, undefined, posterCardRef.current);
      if (ok) showToast(isEn ? "Poster copied to clipboard!" : "海报已复制至剪贴板！");
    } catch {
      showToast(isEn ? "Failed to copy." : "复制失败，请尝试下载");
    } finally {
      setCopyingImage(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadPoster(shareData, undefined, posterCardRef.current);
      showToast(isEn ? "Poster download started!" : "海报下载已开始！");
    } catch {
      showToast(isEn ? "Download failed." : "下载失败，请重试");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(resolvedUrl);
        showToast(isEn ? "Link copied!" : "海报链接已复制至剪贴板！");
      }
    } catch {
      showToast(isEn ? "Failed to copy." : "复制失败");
    }
  };

  const handleNativeShare = async () => {
    try {
      const text = generateShareText(shareData);
      const res = await triggerNativeShare({
        title: `Self-Test · Minimalist [${shareData.roleTitle}]`,
        text,
        url: resolvedUrl,
      });
      if (res.message) showToast(res.message);
    } catch (err) {
      console.error(err);
      showToast(isEn ? "Share failed, link copied." : "分享失败，已为您复制链接");
    }
  };

  return (
    <div
      data-share-poster="minimalist-editorial"
      className={`relative flex flex-col items-center max-w-xl mx-auto w-full select-none ${className}`}
    >
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-stone-900 border border-stone-700 text-stone-100 text-xs font-serif shadow-2xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimalist Card Container */}
      <div
        ref={posterCardRef}
        className="relative w-full rounded-3xl overflow-hidden bg-[#FAF9F5] dark:bg-[#111116] border-2 border-stone-900 dark:border-white/20 shadow-2xl text-stone-900 dark:text-stone-100 p-6 sm:p-8 space-y-6"
      >
        {/* Header Rule & Issue Code */}
        <div className="flex items-center justify-between border-b border-stone-900/15 dark:border-white/15 pb-3">
          <div className="flex items-center gap-2 text-xs font-serif tracking-[0.2em] uppercase font-bold text-stone-800 dark:text-stone-200">
            <BookOpen className="w-3.5 h-3.5" />
            <span>ARCHIVE NO. 4D · EDITION 2026</span>
          </div>
          <div className="text-[10px] font-mono font-bold text-stone-700 dark:text-stone-300">
            METASPECTRUM // CERTIFIED
          </div>
        </div>

        {/* Hero Title & Identity */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-stone-900 dark:border-white/30 overflow-hidden shrink-0 bg-stone-200 dark:bg-stone-800 flex items-center justify-center">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={subjectName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="font-serif text-xl font-bold">{subjectName[0] || "A"}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-stone-600 dark:text-stone-400 font-mono">
                {isEn ? "COGNITIVE ARCHETYPE" : "认知心智图鉴"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-stone-950 dark:text-white truncate">
                {profile.role_title || def.role_title}
              </h1>
              <div className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                EXPLORER: {subjectName}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#181820] border border-stone-900/10 dark:border-white/10 italic font-serif text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
            “{profile.praise_tagline || def.praise_tagline}”
          </div>
        </div>

        {/* 4 Aptitudes List */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold border-b border-stone-900/10 dark:border-white/10 pb-1">
            CORE APTITUDES & DYNAMICS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {skills.slice(0, 4).map((sk, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-[#181820] border border-stone-900/10 dark:border-white/10 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 font-serif font-black">
                    <span>{sk.icon}</span>
                    <span>{sk.name}</span>
                  </span>
                  <span className="text-[9px] font-mono text-stone-700 dark:text-stone-300 uppercase">
                    {sk.type}
                  </span>
                </div>
                <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed font-sans line-clamp-2">
                  {sk.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 justify-start pt-1 font-mono">
          {(profile.strength_tags || def.strength_tags || []).slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded border border-stone-900/20 dark:border-white/20 text-stone-700 dark:text-stone-300 font-bold"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer & QR Code */}
        <div className="pt-4 border-t border-stone-900/15 dark:border-white/15 flex items-center justify-between gap-4">
          <div className="space-y-1 text-left min-w-0">
            <div className="font-serif text-xs font-bold tracking-wider">
              SELF-TEST COGNITIVE MANIFOLD
            </div>
            <div className="text-[10px] text-stone-700 dark:text-stone-300 font-mono">
              PERMANENT VERIFICATION INDEX
            </div>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white p-1 border border-stone-900/20 dark:border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
            {qrSvg ? (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-full h-full bg-stone-200 dark:bg-stone-800 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons (Feedback 1: 聚焦海报专属交互，主次分明，移除冗余文案复制) */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-5">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-serif font-black text-xs flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-amber-300" />
          <span>{downloading ? (isEn ? "Rendering..." : "正在生成...") : (isEn ? "Download HD Poster" : "下载高清海报")}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-serif font-bold text-xs flex items-center justify-center gap-2 border border-stone-900/30 shadow-sm active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Copy className="w-4 h-4 text-stone-600" />
          <span>{copyingImage ? (isEn ? "Copying..." : "正在复制...") : (isEn ? "Copy Poster Image" : "复制海报到剪贴板")}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 font-serif font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-900/20 active:translate-y-0.5 cursor-pointer"
        >
          <Link2 className="w-4 h-4 text-stone-500" />
          <span>{isEn ? "Copy Link" : "复制海报链接"}</span>
        </button>
      </div>
    </div>
  );
};
