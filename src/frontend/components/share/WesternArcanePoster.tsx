/**
 * Western Arcane Order Share Poster Component (WesternArcanePoster.tsx)
 * 
 * Renders an ultra-high-definition Western Arcane aesthetic share card
 * for the 8 Arcane Archetypes (Archmage, Alchemist, Paladin, etc.).
 * 
 * Features:
 * - Sanitized data: Zero 4D raw metrics & zero internal quadrant codes
 * - English Arcane 8 Orders & Unique Skill Hierarchies
 * - User nickname displayed in ribbon under avatar frame
 * - 4 Innate Arcane Skills in 2x2 grid
 * - Hermetic/Arcane seal & empowering insight banner
 * - Dynamic QR code and one-click actions (download PNG, copy image, copy text)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  QrCode,
} from "lucide-react";
import {
  getArcaneArchetype,
  ArcaneArchetypeConfig,
} from "./arcaneArchetypes";
import {
  generatePosterQrCodeSvg,
  downloadPoster,
  copyPosterImageToClipboard,
  copyShareTextToClipboard,
  generateShareText,
  PosterShareData,
  SkillDisplayItem,
} from "./posterGenerator";
import { buildSessionReportUrl, buildSessionShareUrl } from "../../utils/sessionRoute";
import { triggerNativeShare } from "../../utils/shareUtils";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";
import { useTheme } from "../../contexts/ThemeContext";
import { resolvePosterSurfacePalette } from "./posterTheme";

export interface WesternArcanePosterProps {
  report: {
    subject_name?: string;
    avatar_url?: string | null;
    session_id?: string;
    quadrant_code?: string;
    metrics?: any;
    metacognitive_metrics?: {
      d_prime?: number;
      meta_d_prime?: number;
      m_ratio?: number;
      calibration_bias?: number;
      d_star?: number;
      info_buying_efficiency?: number;
    };
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
  surfaceTheme?: "auto" | "light" | "dark";
}

export const WesternArcanePoster: React.FC<WesternArcanePosterProps> = ({
  report,
  avatar_url: propAvatarUrl,
  entryUrl,
  onClose,
  className = "",
  surfaceTheme = "auto",
}) => {
  const { isDark } = useTheme();
  const useLightSurface =
    surfaceTheme === "light" ? true : surfaceTheme === "dark" ? false : !isDark;
  const profile = report.diagnostic_profile || {};
  const quadrantCode = report.quadrant_code || profile.quadrant_code || profile.archetype || "Q1-CAL";
  const def = useMemo(() => getArchetypeDefinition(quadrantCode, "en-US"), [quadrantCode]);
  const subjectName = report.subject_name?.trim() || "Explorer";
  const avatarUrl = propAvatarUrl || report.avatar_url || (report as any).avatarUrl || null;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  // 解析西方秘法秩序画像配置
  const arcaneConfig: ArcaneArchetypeConfig = useMemo(() => {
    return getArcaneArchetype(def.archetype || quadrantCode);
  }, [def.archetype, quadrantCode]);

  // 解析 4 项专属技能
  const skills: SkillDisplayItem[] = useMemo(() => {
    if (profile.skills && profile.skills.length >= 4) {
      return profile.skills;
    }
    return def.skills || arcaneConfig.skills;
  }, [profile.skills, def.skills, arcaneConfig]);

  const [qrSvg, setQrSvg] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const posterCardRef = React.useRef<HTMLDivElement>(null);

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

  const empoweringFeedback = useMemo(() => {
    if (profile.empowering_feedback && !/[\u4e00-\u9fa5]/.test(profile.empowering_feedback)) {
      return profile.empowering_feedback;
    }
    return arcaneConfig.empoweringFeedback;
  }, [profile.empowering_feedback, arcaneConfig.empoweringFeedback]);

  // 组装 PosterShareData
  const shareData: PosterShareData = useMemo(() => {
    return {
      subjectName,
      avatar_url: avatarUrl,
      avatarUrl,
      archetype: arcaneConfig.archetype,
      roleTitle: arcaneConfig.roleTitle,
      praiseTagline: arcaneConfig.praiseTagline,
      strengthTags: profile.strength_tags && profile.strength_tags.length > 0
        ? profile.strength_tags
        : arcaneConfig.strengthTags,
      skills,
      empoweringFeedback,
      locale: "en-US",
      entryUrl: resolvedUrl,
    };
  }, [subjectName, avatarUrl, arcaneConfig, profile, skills, empoweringFeedback, resolvedUrl]);

  // 动态渲染二维码 SVG
  useEffect(() => {
    let active = true;
    generatePosterQrCodeSvg(resolvedUrl).then((svg) => {
      if (active) setQrSvg(svg);
    }).catch(console.error);
    return () => { active = false; };
  }, [resolvedUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 一键下载海报 PNG
  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadPoster(shareData, undefined, posterCardRef.current);
      showToast("HD Archetype Poster download started!");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to download poster, please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // 一键复制海报图片到剪贴板
  const handleCopyImage = async () => {
    try {
      setCopyingImage(true);
      const res = await copyPosterImageToClipboard(shareData, posterCardRef.current);
      if (res.fallback) {
        showToast("Direct image copy not supported; auto-downloaded instead!");
      } else if (res.success) {
        showToast("Poster image copied to clipboard!");
      } else {
        showToast("Copy failed, please download directly.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to copy poster, auto-downloading...");
      await downloadPoster(shareData, undefined, posterCardRef.current);
    } finally {
      setCopyingImage(false);
    }
  };

  // 一键复制文字分享
  const handleCopyText = async () => {
    try {
      const ok = await copyShareTextToClipboard(shareData);
      if (ok) {
        setCopiedText(true);
        showToast("Share text copied to clipboard!");
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 一键系统原生分享 (Web Share API 优先，平滑降级复制短链)
  const handleNativeShare = async () => {
    try {
      const text = generateShareText(shareData);
      const res = await triggerNativeShare({
        title: `Self-Test · Cognitive Archetype [${shareData.roleTitle}]`,
        text,
        url: resolvedUrl,
      });
      if (res.message) {
        showToast(res.message);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Share failed, link copied instead");
    }
  };

  const colors = arcaneConfig.colorScheme;
  const surface = useMemo(
    () =>
      resolvePosterSurfacePalette(
        arcaneConfig.archetype,
        colors,
        useLightSurface,
        "arcane"
      ),
    [arcaneConfig.archetype, colors, useLightSurface]
  );

  return (
    <div
      data-share-poster="western-arcane"
      data-poster-surface={surface.isLight ? "light" : "dark"}
      className={`relative flex flex-col items-center max-w-xl mx-auto w-full select-none ${className}`}
    >
      {/* 提示吐司 (Toast Message) */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-slate-900/95 border border-purple-400 text-purple-200 text-xs md:text-sm font-medium shadow-2xl shadow-purple-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 核心海报视觉卡片容器 (DOM 实时高清预览) */}
      <div
        ref={posterCardRef}
        className="relative w-full rounded-2xl overflow-hidden border transition-all duration-300"
        style={{
          borderColor: surface.cardBorder,
          boxShadow: surface.cardShadow,
          background: surface.cardBg,
        }}
      >
        {/* 背景星尘装饰 */}
        <div
          className={`absolute inset-0 pointer-events-none ${surface.dustOpacity} [background-size:24px_24px]`}
          style={{
            backgroundImage: `radial-gradient(${surface.dustDotColor} 1px, transparent 1px)`,
          }}
        />

        {/* 顶部秘法横批 */}
        <div
          className="pt-5 sm:pt-6 pb-2.5 sm:pb-3 text-center border-b relative z-10"
          style={{
            backgroundColor: surface.headerBg,
            borderColor: surface.headerBorder,
          }}
        >
          <div
            className="text-[12px] sm:text-[13px] font-bold tracking-[0.25em] font-sans"
            style={{ color: surface.titleColor }}
          >
            ARCANE ORDER · COGNITIVE SPECTRUM
          </div>
          <div
            className="text-[9px] tracking-[0.15em] uppercase mt-0.5 font-mono"
            style={{ color: surface.subtitleColor }}
          >
            ORDO ARCANUM · METACOGNITIVE TESTING LAB
          </div>
        </div>

        {/* 主体卡片区域 */}
        <div className="p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5 relative z-10">
          {/* 1. 秘法徽章 */}
          <div className="relative flex flex-col items-center justify-center pt-1">
            {/* 背部外发光 */}
            <div
              className="absolute w-36 h-36 rounded-full blur-2xl pointer-events-none -top-2"
              style={{
                backgroundColor: colors.glowColor,
                opacity: surface.isLight ? 0.25 : 1,
              }}
            />

            {/* 秘法/头像环 (带圆形裁切与边框光效) */}
            <div
              data-avatar-badge="true"
              className="w-24 h-24 rounded-full border-2 flex items-center justify-center relative overflow-hidden"
              style={{
                borderColor: surface.avatarRingColor,
                backgroundColor: surface.avatarBg,
                boxShadow: surface.avatarShadow,
              }}
            >
              {avatarUrl && !imageError ? (
                <img
                  src={avatarUrl}
                  alt={subjectName}
                  crossOrigin="anonymous"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover rounded-full select-none pointer-events-none"
                />
              ) : (
                <div
                  className="text-4xl font-black leading-none select-none"
                  style={{ color: surface.titleColor }}
                >
                  {arcaneConfig.crestSymbol || (subjectName ? subjectName.charAt(0).toUpperCase() : "✦")}
                </div>
              )}
            </div>

            {/* 头像框下方长条徽带 (展示用户真实昵称) */}
            <div
              className="mt-3 px-5 py-1 rounded-full border text-xs font-semibold tracking-wider font-sans shadow-sm"
              style={{
                borderColor: surface.avatarRingColor,
                backgroundColor: surface.ribbonBg,
                color: surface.ribbonText,
              }}
            >
              {subjectName}
            </div>
          </div>

          {/* 2. 核心大标题与金句 */}
          <div className="text-center space-y-1">
            <h2
              className="text-3xl md:text-5xl font-black tracking-wider font-sans"
              style={{
                color: surface.titleColor,
                textShadow: surface.titleShadow,
              }}
            >
              {arcaneConfig.roleTitle}
            </h2>

            <p
              className="text-sm md:text-base font-sans font-medium pt-1"
              style={{ color: surface.taglineColor }}
            >
              “{arcaneConfig.praiseTagline}”
            </p>
          </div>

          {/* 3. 高光标签 */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {arcaneConfig.strengthTags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  backgroundColor: surface.tagBg,
                  borderColor: surface.tagBorder,
                  color: surface.tagText,
                }}
              >
                {`#${tag.replace(/\s+/g, "")}`}
              </span>
            ))}
          </div>

          {/* 4. 4 项专属认知特技 (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {skills.slice(0, 4).map((skill, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border space-y-1.5 transition-all"
                style={{
                  backgroundColor: surface.skillCardBg,
                  borderColor: surface.skillCardBorder,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{skill.icon || "✦"}</span>
                    <span
                      className="text-xs font-bold font-sans truncate"
                      style={{ color: surface.skillTitleColor }}
                    >
                      {skill.name}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0"
                    style={{
                      backgroundColor: surface.skillBadgeBg,
                      borderColor: surface.skillBadgeBorder,
                      color: surface.skillBadgeText,
                    }}
                  >
                    {skill.type}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed font-sans line-clamp-2"
                  style={{ color: surface.skillDescColor }}
                >
                  {skill.desc}
                </p>
              </div>
            ))}
          </div>

          {/* 5. 认知赋能启示与秘法印章 */}
          <div
            className="p-4 rounded-xl border relative overflow-hidden"
            style={{
              backgroundColor: surface.insightBg,
              borderColor: surface.insightBorder,
            }}
          >
            {/* 右下角秘法印章 */}
            <div className="absolute right-3.5 bottom-3.5 w-16 h-16 rounded-lg bg-purple-900 border border-purple-300/80 shadow-md flex items-center justify-center p-1 select-none pointer-events-none transform rotate-3">
              <div className="text-[9px] font-bold font-sans text-purple-100 text-center leading-tight">
                {arcaneConfig.sealText}
              </div>
            </div>

            <div className="pr-20 space-y-1">
              <div
                className="text-[11px] font-bold font-sans tracking-widest uppercase"
                style={{ color: surface.insightLabelColor }}
              >
                [ ORDO ARCANUM · EMPOWERING INSIGHT ]
              </div>
              <p
                className="text-xs font-sans leading-relaxed italic line-clamp-3"
                style={{ color: surface.insightTextColor }}
              >
                “{empoweringFeedback}”
              </p>
            </div>
          </div>

          {/* 6. 动态二维码扫码区域 */}
          <div
            className="flex items-center justify-between p-3.5 rounded-xl border"
            style={{
              backgroundColor: surface.qrPanelBg,
              borderColor: surface.qrPanelBorder,
            }}
          >
            <div className="space-y-1 text-left">
              <div
                className="text-xs font-bold font-sans flex items-center gap-1.5"
                style={{ color: surface.qrTitleColor }}
              >
                <QrCode className="w-3.5 h-3.5" style={{ color: surface.actionIconColor }} />
                Scan to Discover Your Cognitive Archetype
              </div>
              <p className="text-[10px] font-mono" style={{ color: surface.qrSubColor }}>
                Two-Tier Metacognitive Manifold Test
              </p>
            </div>

            {/* 二维码视窗 */}
            <div
              className="w-16 h-16 rounded-xl bg-white p-1 border shrink-0 flex items-center justify-center overflow-hidden shadow-sm"
              style={{ borderColor: surface.qrFrameBorder }}
            >
              {qrSvg ? (
                <div
                  className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-full h-full bg-slate-200 animate-pulse rounded" />
              )}
            </div>
          </div>
        </div>

        {/* 底部脚注 */}
        <div
          className="py-2.5 border-t text-center text-[10px] font-mono tracking-wider"
          style={{
            backgroundColor: surface.footerBg,
            borderColor: surface.footerBorder,
            color: surface.footerTextColor,
          }}
        >
          VERIFIED BY METACOGNITIVE TESTING LAB · SYSTEM V2.0
        </div>
      </div>

      {/* 底部功能按钮操作栏 (One-Click Actions) */}
      <div className="w-full grid grid-cols-2 gap-2.5 mt-4 sm:mt-5">
        {/* 0. 优先唤起系统原生分享 (Web Share API) */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="min-h-[42px] px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          style={{
            backgroundColor: surface.actionPrimaryBg,
            color: surface.actionPrimaryText,
            boxShadow: surface.actionPrimaryShadow,
          }}
        >
          <Share2 className="w-4 h-4" />
          <span>System Share</span>
        </button>

        {/* 1. 下载高清海报 PNG */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={`min-h-[42px] px-4 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${surface.actionSecondaryClass}`}
        >
          <Download className="w-4 h-4" style={{ color: surface.actionIconColor }} />
          <span>{downloading ? "Rendering Poster..." : "Download HD Poster (PNG)"}</span>
        </button>

        {/* 2. 复制海报图片到剪贴板 */}
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className={`min-h-[42px] px-4 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${surface.actionSecondaryClass}`}
        >
          <Copy className="w-4 h-4" style={{ color: surface.actionIconColor }} />
          <span>{copyingImage ? "Copying Image..." : "Copy Poster to Clipboard"}</span>
        </button>

        {/* 3. 复制分享文案 */}
        <button
          type="button"
          onClick={handleCopyText}
          className={`min-h-[42px] px-4 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${surface.actionSecondaryClass}`}
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className={surface.isLight ? "text-emerald-700" : "text-emerald-300"}>Text Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" style={{ color: surface.actionIconColor }} />
              <span>Copy Share Text</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
