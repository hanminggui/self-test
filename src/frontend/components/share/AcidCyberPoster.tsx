/**
 * Acid Cyber Editorial Share Poster Component (AcidCyberPoster.tsx)
 * 
 * Renders a cutting-edge Neo-Brutalist Acid Cyber aesthetic share card
 * with high-contrast electric lime, magenta, cobalt cyan, and obsidian black.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  Zap,
  Terminal,
  Cpu,
  Shield,
  Activity,
  Flame,
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

export interface AcidCyberPosterProps {
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

export const AcidCyberPoster: React.FC<AcidCyberPosterProps> = ({
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
      if (ok) {
        showToast(isEn ? "Poster image copied!" : "海报已复制至剪贴板！");
      }
    } catch {
      showToast(isEn ? "Failed to copy image." : "复制失败，请点击下载");
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

  const handleCopyText = async () => {
    try {
      const ok = await copyShareTextToClipboard(shareData);
      if (ok) {
        setCopiedText(true);
        showToast(isEn ? "Share text copied!" : "分享文案已复制！");
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    try {
      const text = generateShareText(shareData);
      const res = await triggerNativeShare({
        title: `Self-Test · ACID CYBER [${shareData.roleTitle}]`,
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
      data-share-poster="acid-cyber"
      className={`relative flex flex-col items-center max-w-xl mx-auto w-full select-none ${className}`}
    >
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#08080C] border-2 border-[#CCFF00] text-[#CCFF00] text-xs font-mono font-bold shadow-[0_0_20px_#CCFF00] flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cyber Acid Card Container */}
      <div
        ref={posterCardRef}
        className="relative w-full rounded-3xl overflow-hidden bg-[#08080C] border-[3px] border-[#CCFF00] shadow-[8px_8px_0px_#CCFF00] text-white p-5 sm:p-7 space-y-5"
        style={{
          backgroundImage: "radial-gradient(#1a1a24 1.5px, transparent 1.5px), radial-gradient(#14141e 1px, #08080C 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Top Header: System Spec & Crosshair */}
        <div className="flex items-center justify-between border-b-2 border-[#CCFF00]/40 pb-3 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-[#CCFF00] font-black tracking-widest uppercase">
            <Terminal className="w-4 h-4" />
            <span>NEO-ACID // V2.0 SPECTRUM</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-[#CCFF00] text-[#08080C] font-black text-[10px]">
            CYBER_SYS_ACTIVE
          </div>
        </div>

        {/* User Identity Banner with Crosshair Avatar */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-[2.5px] border-[#CCFF00] bg-[#12121C] shadow-[4px_4px_0px_#FF3366] overflow-hidden flex items-center justify-center">
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={subjectName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Cpu className="w-10 h-10 text-[#CCFF00]" />
              )}
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF3366] text-white font-mono font-black text-[10px] whitespace-nowrap shadow-md">
              SUBJECT: {subjectName}
            </div>
          </div>

          <div className="pt-2 space-y-1">
            <div className="font-mono text-xs text-[#38BDF8] font-black tracking-widest uppercase">
              // ARCHETYPE CLASSIFICATION
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(204,255,0,0.4)]">
              {profile.role_title || def.role_title}
            </h2>
            <p className="text-xs sm:text-sm text-[#CCFF00] font-mono font-bold max-w-md mx-auto">
              “{profile.praise_tagline || def.praise_tagline}”
            </p>
          </div>
        </div>

        {/* 4 Innate Aptitudes / Skills Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 font-mono">
          {skills.slice(0, 4).map((sk, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-[#0E0E16] border-2 border-white/20 hover:border-[#CCFF00] transition-colors shadow-[3px_3px_0px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between text-xs font-black text-[#CCFF00] mb-1">
                <span className="flex items-center gap-1.5 truncate">
                  <span>{sk.icon}</span>
                  <span className="text-white truncate">{sk.name}</span>
                </span>
                <span className="text-[9px] text-[#38BDF8] border border-[#38BDF8]/40 px-1 rounded shrink-0">
                  {sk.type}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-tight line-clamp-2">
                {sk.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Strength Tags */}
        <div className="flex flex-wrap gap-2 justify-center pt-1 font-mono">
          {(profile.strength_tags || def.strength_tags || []).slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-black border border-[#CCFF00] text-[#CCFF00] font-black shadow-[2px_2px_0px_#CCFF00]"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Bottom QR Section */}
        <div className="pt-3 border-t-2 border-white/10 flex items-center justify-between gap-3 font-mono">
          <div className="space-y-0.5 text-left min-w-0">
            <div className="text-xs font-black text-[#CCFF00]">SELF-TEST · 4D MANIFOLD</div>
            <div className="text-[10px] text-slate-400 truncate">
              SCAN TO VERIFY NEURAL ARCHITECTURE
            </div>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white p-1 border-2 border-[#CCFF00] shrink-0 flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#CCFF00]">
            {qrSvg ? (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-full h-full bg-slate-800 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-5">
        <button
          type="button"
          onClick={handleNativeShare}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#CCFF00] hover:brightness-110 text-[#08080C] font-black text-xs flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>{isEn ? "Native Share" : "系统原生分享"}</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-black hover:bg-stone-900 text-[#CCFF00] font-black text-xs flex items-center justify-center gap-2 border-2 border-[#CCFF00] shadow-[3px_3px_0px_#CCFF00] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? (isEn ? "Generating..." : "正在生成...") : (isEn ? "Download HD" : "下载高清海报")}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-black hover:bg-stone-900 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 shadow-md active:translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Copy className="w-4 h-4 text-[#38BDF8]" />
          <span>{copyingImage ? (isEn ? "Copying..." : "正在复制...") : (isEn ? "Copy Image" : "复制海报到剪贴板")}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-black hover:bg-stone-900 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20 shadow-md active:translate-y-0.5 cursor-pointer"
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">{isEn ? "Copied!" : "文案已复制！"}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#FF3366]" />
              <span>{isEn ? "Copy Text" : "复制分享文案"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
