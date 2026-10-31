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
}

export const WesternArcanePoster: React.FC<WesternArcanePosterProps> = ({
  report,
  avatar_url: propAvatarUrl,
  entryUrl,
  onClose,
  className = "",
}) => {
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

  return (
    <div
      data-share-poster="western-arcane"
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
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300"
        style={{
          borderColor: colors.cardBorder,
          boxShadow: `0 25px 60px -15px ${colors.glowColor}, 0 0 40px -10px ${colors.primaryGold}33`,
          background: `radial-gradient(circle at 50% 25%, ${colors.bgRadialInner} 0%, ${colors.bgRadialOuter} 65%, #050608 100%)`,
        }}
      >
        {/* 背景星尘装饰 */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#c084fc_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* 顶部秘法横批 */}
        <div className="pt-5 sm:pt-6 pb-2.5 sm:pb-3 text-center border-b border-white/10 relative z-10 bg-black/20">
          <div
            className="text-[12px] sm:text-[13px] font-bold tracking-[0.25em] font-sans"
            style={{ color: colors.secondaryGold }}
          >
            ARCANE ORDER · COGNITIVE SPECTRUM
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-400 uppercase mt-0.5 font-mono">
            ORDO ARCANUM · METACOGNITIVE TESTING LAB
          </div>
        </div>

        {/* 主体卡片区域 */}
        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 relative z-10">
          {/* 1. 秘法徽章 */}
          <div className="relative flex flex-col items-center justify-center pt-2">
            {/* 背部外发光 */}
            <div
              className="absolute w-36 h-36 rounded-full blur-2xl pointer-events-none -top-2"
              style={{ backgroundColor: colors.glowColor }}
            />

            {/* 秘法/头像环 (带圆形裁切与边框光效) */}
            <div
              data-avatar-badge="true"
              className="w-24 h-24 rounded-full border-2 flex items-center justify-center relative shadow-inner overflow-hidden"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                boxShadow: `0 0 24px ${colors.glowColor}, inset 0 0 12px rgba(0, 0, 0, 0.6)`,
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
                  className="text-4xl font-black leading-none select-none drop-shadow-md"
                  style={{ color: colors.secondaryGold }}
                >
                  {arcaneConfig.crestSymbol || (subjectName ? subjectName.charAt(0).toUpperCase() : "✦")}
                </div>
              )}
            </div>

            {/* 头像框下方长条徽带 (展示用户真实昵称，已移除硬编码“Explorer · ”前缀) */}
            <div
              className="mt-3 px-5 py-1 rounded-full border text-xs font-semibold tracking-wider font-sans shadow-md"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0,0,0,0.75)",
                color: colors.secondaryGold,
              }}
            >
              {subjectName}
            </div>
          </div>

          {/* 2. 核心大标题与金句 */}
          <div className="text-center space-y-1">
            <h2
              className="text-3xl md:text-5xl font-black tracking-wider font-sans drop-shadow-lg"
              style={{
                color: colors.secondaryGold,
                textShadow: `0 0 20px ${colors.glowColor}`,
              }}
            >
              {arcaneConfig.roleTitle}
            </h2>

            <p className="text-sm md:text-base text-purple-100 font-sans font-medium pt-1">
              “{arcaneConfig.praiseTagline}”
            </p>
          </div>

          {/* 3. 高光标签 */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {arcaneConfig.strengthTags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border shadow-sm"
                style={{
                  backgroundColor: colors.badgeBg,
                  borderColor: `${colors.primaryGold}66`,
                  color: colors.secondaryGold,
                }}
              >
                {`#${tag.replace(/\s+/g, "")}`}
              </span>
            ))}
          </div>

          {/* 4. 4 项专属认知特技 (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {skills.slice(0, 4).map((skill, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 transition-all hover:border-purple-400/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon || "✦"}</span>
                    <span
                      className="text-xs font-bold font-sans"
                      style={{ color: colors.secondaryGold }}
                    >
                      {skill.name}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                    style={{
                      backgroundColor: colors.badgeBg,
                      borderColor: `${colors.primaryGold}44`,
                      color: colors.secondaryGold,
                    }}
                  >
                    {skill.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-2">
                  {skill.desc}
                </p>
              </div>
            ))}
          </div>

          {/* 5. 认知赋能启示与秘法印章 */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 relative overflow-hidden">
            {/* 右下角秘法印章 */}
            <div className="absolute right-3.5 bottom-3.5 w-16 h-16 rounded-lg bg-purple-900 border border-purple-300/80 shadow-md flex items-center justify-center p-1 select-none pointer-events-none transform rotate-3">
              <div className="text-[9px] font-bold font-sans text-purple-100 text-center leading-tight">
                {arcaneConfig.sealText}
              </div>
            </div>

            <div className="pr-20 space-y-1">
              <div
                className="text-[11px] font-bold font-sans tracking-widest uppercase"
                style={{ color: colors.secondaryGold }}
              >
                [ ORDO ARCANUM · EMPOWERING INSIGHT ]
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed italic line-clamp-3">
                “{empoweringFeedback}”
              </p>
            </div>
          </div>

          {/* 6. 动态二维码扫码区域 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-white/10">
            <div className="space-y-1 text-left">
              <div className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-purple-400" />
                Scan to Discover Your Cognitive Archetype
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Two-Tier Metacognitive Manifold Test
              </p>
            </div>

            {/* 二维码视窗 */}
            <div className="w-16 h-16 rounded-xl bg-white p-1 border border-purple-400/40 shrink-0 flex items-center justify-center overflow-hidden shadow-md">
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
        <div className="py-2.5 bg-black/40 border-t border-white/5 text-center text-[10px] text-slate-500 font-mono tracking-wider">
          VERIFIED BY METACOGNITIVE TESTING LAB · SYSTEM V2.0
        </div>
      </div>

      {/* 底部功能按钮操作栏 (One-Click Actions) */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-5 sm:mt-6">
        {/* 0. 优先唤起系统原生分享 (Web Share API) */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95"
          style={{
            backgroundColor: colors.primaryGold,
            color: "#ffffff",
            boxShadow: `0 4px 14px ${colors.glowColor}`,
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
          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 shadow-md active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-purple-400" />
          <span>{downloading ? "Rendering Poster..." : "Download HD Poster (PNG)"}</span>
        </button>

        {/* 2. 复制海报图片到剪贴板 */}
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 shadow-md active:scale-95 disabled:opacity-50"
        >
          <Copy className="w-4 h-4 text-purple-400" />
          <span>{copyingImage ? "Copying Image..." : "Copy Poster to Clipboard"}</span>
        </button>

        {/* 3. 复制分享文案 */}
        <button
          type="button"
          onClick={handleCopyText}
          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/10 shadow-md active:scale-95"
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Text Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-purple-400" />
              <span>Copy Share Text</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
