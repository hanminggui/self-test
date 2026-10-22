/**
 * Chinese Oriental Mythic Share Poster Component (ChineseMythicPoster.tsx)
 * 
 * Renders an ultra-high-definition, oriental brush/gold aesthetic share card
 * for the 8 cognitive archetypes.
 * 
 * Revamped:
 * - 4D raw metrics & quadrant codes completely hidden
 * - Zhouyi Bagua symbols & trigram lines completely de-bagua-fied
 * - User nickname displayed in ribbon under avatar frame
 * - 4 Original Positive Cognitive Skills in 2x2 grid with pure Chinese names
 * - Vermilion seal & empowering feedback banner
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
  getMythicArchetype,
  MythicArchetypeConfig,
} from "./mythicArchetypes";
import {
  generatePosterQrCodeSvg,
  downloadPoster,
  copyPosterImageToClipboard,
  copyShareTextToClipboard,
  PosterShareData,
  SkillDisplayItem,
} from "./posterGenerator";
import { buildSessionReportUrl, buildSessionShareUrl } from "../../utils/sessionRoute";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

export interface ChineseMythicPosterProps {
  report: {
    subject_name?: string;
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
  entryUrl?: string;
  onClose?: () => void;
  className?: string;
}

export const ChineseMythicPoster: React.FC<ChineseMythicPosterProps> = ({
  report,
  entryUrl,
  onClose,
  className = "",
}) => {
  const profile = report.diagnostic_profile || {};
  const quadrantCode = report.quadrant_code || profile.quadrant_code || profile.archetype || "Q1-CAL";
  const def = useMemo(() => getArchetypeDefinition(quadrantCode, "zh-CN"), [quadrantCode]);
  const subjectName = report.subject_name || "探索者";

  // 解析对应的画像配置
  const archetypeConfig: MythicArchetypeConfig = useMemo(() => {
    return getMythicArchetype(def.archetype || quadrantCode);
  }, [def.archetype, quadrantCode]);

  // 解析 4 项专属认知特技 (确保全中文无杂质)
  const skills: SkillDisplayItem[] = useMemo(() => {
    const sourceSkills = (profile.skills && profile.skills.length >= 4) ? profile.skills : def.skills;
    return (sourceSkills || []).map((s) => ({
      ...s,
      name: s.name.replace(/\s*\([^)]*\)/g, ""), // 去除任何英文括号后缀
    }));
  }, [profile.skills, def.skills]);

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
    return profile.empowering_feedback || def.empowering_feedback || archetypeConfig.totemAphorism || "自强不息，知行自洽。";
  }, [profile.empowering_feedback, def.empowering_feedback, archetypeConfig.totemAphorism]);

  // 组装 PosterShareData
  const shareData: PosterShareData = useMemo(() => {
    return {
      subjectName,
      archetype: archetypeConfig.archetype,
      roleTitle: profile.role_title || def.role_title || archetypeConfig.roleTitle,
      praiseTagline: profile.praise_tagline || def.praise_tagline || archetypeConfig.praiseTagline,
      strengthTags: (profile.strength_tags && profile.strength_tags.length > 0)
        ? profile.strength_tags
        : def.strength_tags,
      skills,
      empoweringFeedback,
      locale: "zh-CN",
      entryUrl: resolvedUrl,
    };
  }, [subjectName, archetypeConfig, profile, skills, empoweringFeedback, resolvedUrl]);

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
      showToast("高清海报下载已开始！");
    } catch (err: any) {
      console.error(err);
      showToast("下载海报失败，请稍后重试");
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
        showToast("您的浏览器不支持直接复制图片，已为您自动下载！");
      } else if (res.success) {
        showToast("高清海报已成功复制到剪贴板！");
      } else {
        showToast("复制失败，请尝试直接下载海报");
      }
    } catch (err: any) {
      console.error(err);
      showToast("复制海报失败，已为您自动下载");
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
        showToast("分享文案已复制至剪贴板！");
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const colors = archetypeConfig.colorScheme;

  return (
    <div
      data-share-poster="chinese-mythic"
      className={`relative flex flex-col items-center max-w-xl mx-auto w-full select-none ${className}`}
    >
      {/* 提示吐司 (Toast Message) */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-slate-900/95 border border-amber-400 text-amber-200 text-xs md:text-sm font-medium shadow-2xl shadow-amber-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 核心海报视觉卡片容器 (DOM 实时高清预览) */}
      <div
        ref={posterCardRef}
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300"
        style={{
          borderColor: colors.cardBorder,
          boxShadow: `0 25px 60px -15px ${colors.glowColor}, 0 0 40px -10px ${colors.primaryGold}33`,
          background: `radial-gradient(circle at 50% 25%, ${colors.bgRadialInner} 0%, ${colors.bgRadialOuter} 65%, #050608 100%)`,
        }}
      >
        {/* 背景金尘装饰 */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#fef08a_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* 顶部殿阁横批 */}
        <div className="pt-6 pb-3 text-center border-b border-white/10 relative z-10 bg-black/20">
          <div
            className="text-[13px] font-bold tracking-[0.25em] font-serif"
            style={{ color: colors.secondaryGold }}
          >
            认知流形 · 心智图谱
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-400 uppercase mt-0.5 font-mono">
            COGNITIVE MANIFOLD ARCHETYPE SPECTRUM
          </div>
        </div>

        {/* 主体卡片区域 */}
        <div className="p-6 md:p-8 space-y-6 relative z-10">
          {/* 1. 图腾罗盘徽章 (去卦象化，展现专属原创神兽/心智图腾) */}
          <div className="relative flex flex-col items-center justify-center pt-2">
            {/* 背部外发光 */}
            <div
              className="absolute w-36 h-36 rounded-full blur-2xl pointer-events-none -top-2"
              style={{ backgroundColor: colors.glowColor }}
            />

            {/* 图腾外环 */}
            <div
              className="w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center relative shadow-inner"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0, 0, 0, 0.55)",
              }}
            >
              <div
                className="text-4xl font-black font-serif leading-none select-none drop-shadow-md"
                style={{ color: colors.secondaryGold }}
              >
                {skills[0]?.icon || "✦"}
              </div>
            </div>

            {/* 头像框下方长条徽带 (展示用户真实昵称，如“探索者 · 伏羲042”) */}
            <div
              className="mt-3 px-5 py-1 rounded-full border text-xs font-semibold tracking-wider font-serif shadow-md"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0,0,0,0.75)",
                color: colors.secondaryGold,
              }}
            >
              {`探索者 · ${subjectName}`}
            </div>
          </div>

          {/* 2. 核心大标题与金句 */}
          <div className="text-center space-y-1">
            <h2
              className="text-3xl md:text-5xl font-black tracking-wider font-serif drop-shadow-lg"
              style={{
                color: colors.secondaryGold,
                textShadow: `0 0 20px ${colors.glowColor}`,
              }}
            >
              {profile.role_title || archetypeConfig.roleTitle}
            </h2>

            <p className="text-sm md:text-base text-amber-100 font-serif font-medium pt-1">
              “{profile.praise_tagline || archetypeConfig.praiseTagline}”
            </p>
          </div>

          {/* 3. 高光标签 */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(profile.strength_tags || [
              "高维逻辑底蕴",
              "算力降维压制",
              "知行绝对自洽",
              "手术刀级决断",
            ]).slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border shadow-sm"
                style={{
                  backgroundColor: colors.badgeBg,
                  borderColor: `${colors.primaryGold}66`,
                  color: colors.secondaryGold,
                }}
              >
                {`#${tag}`}
              </span>
            ))}
          </div>

          {/* 4. 4 项原创专属认知特技 (2x2 Grid) - 彻底置换原 4D 敏感指标 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {skills.slice(0, 4).map((skill, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 transition-all hover:border-amber-400/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon || "✦"}</span>
                    <span
                      className="text-xs font-bold font-serif"
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

          {/* 5. 认知赋能启示与朱砂红印 (去卦象化，展现原创赋能解读) */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 relative overflow-hidden">
            {/* 右下角朱砂方印 */}
            <div className="absolute right-3.5 bottom-3.5 w-14 h-14 rounded-lg bg-red-700 border border-yellow-200/80 shadow-md flex items-center justify-center p-1 select-none pointer-events-none transform rotate-3">
              <div className="text-[10px] font-bold font-serif text-yellow-100 text-center leading-tight">
                {archetypeConfig.sealText.slice(0, 2)}
                <br />
                {archetypeConfig.sealText.slice(2, 4)}
              </div>
            </div>

            <div className="pr-16 space-y-1">
              <div
                className="text-[11px] font-bold font-serif tracking-widest"
                style={{ color: colors.secondaryGold }}
              >
                【 认知心智 · 赋能启示 】
              </div>
              <p className="text-xs text-slate-300 font-serif leading-relaxed italic line-clamp-3">
                “{empoweringFeedback}”
              </p>
            </div>
          </div>

          {/* 6. 动态二维码扫码区域 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-white/10">
            <div className="space-y-1 text-left">
              <div className="text-xs font-bold text-white font-serif flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                长按扫码 · 探索你的心智本命
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Two-Tier Metacognitive Manifold Test
              </p>
            </div>

            {/* 二维码视窗 */}
            <div className="w-16 h-16 rounded-xl bg-white p-1 border border-amber-400/40 shrink-0 flex items-center justify-center overflow-hidden shadow-md">
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
      <div className="w-full flex flex-wrap items-center justify-center gap-3 mt-6">
        {/* 1. 下载高清海报 PNG */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: colors.primaryGold,
            color: "#080709",
            boxShadow: `0 4px 14px ${colors.glowColor}`,
          }}
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? "正在渲染海报..." : "下载高清海报 (PNG)"}</span>
        </button>

        {/* 2. 复制海报图片到剪贴板 */}
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all border border-white/10 shadow-md active:scale-95 disabled:opacity-50"
        >
          <Copy className="w-4 h-4 text-amber-400" />
          <span>{copyingImage ? "正在复制图片..." : "复制海报到剪贴板"}</span>
        </button>

        {/* 3. 复制分享文案 */}
        <button
          type="button"
          onClick={handleCopyText}
          className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all border border-white/10 shadow-md active:scale-95"
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">文案已复制！</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>复制分享文案</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
