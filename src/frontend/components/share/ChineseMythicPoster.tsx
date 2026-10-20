/**
 * Chinese Oriental Mythic Share Poster Component (ChineseMythicPoster.tsx)
 * 
 * Renders an ultra-high-definition, oriental brush/gold aesthetic share card
 * for the 8 cognitive archetypes (Bagua / I-Ching philosophy).
 * Features 4D cognitive metrics, mythic totems, hexagram aphorisms,
 * vermilion seals, dynamic QR code, and one-click copy & download actions.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  QrCode,
  ShieldCheck,
  Compass,
  Flame,
} from "lucide-react";
import {
  getMythicArchetype,
  MythicArchetypeConfig,
} from "./mythicArchetypes";
import {
  formatCognitiveMetric,
  formatBiasMetric,
  formatMRatioMetric,
  generatePosterQrCodeSvg,
  downloadPoster,
  copyPosterImageToClipboard,
  copyShareTextToClipboard,
  PosterShareData,
} from "./posterGenerator";

export interface ChineseMythicPosterProps {
  report: {
    subject_name?: string;
    session_id?: string;
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
  const metrics = report.metacognitive_metrics || {};
  const subjectName = report.subject_name || "探索者";

  // 解析对应的八卦神话画像配置
  const archetypeConfig: MythicArchetypeConfig = useMemo(() => {
    return getMythicArchetype(profile.archetype || profile.quadrant_code || profile.role_title || "");
  }, [profile.archetype, profile.quadrant_code, profile.role_title]);

  const [qrSvg, setQrSvg] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const resolvedUrl = useMemo(() => {
    if (entryUrl) return entryUrl;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/`;
    }
    return "http://localhost:8000/";
  }, [entryUrl]);

  // 组装 PosterShareData
  const shareData: PosterShareData = useMemo(() => {
    return {
      subjectName,
      archetype: archetypeConfig.archetype,
      roleTitle: profile.role_title || archetypeConfig.roleTitle,
      praiseTagline: profile.praise_tagline || archetypeConfig.praiseTagline,
      strengthTags: profile.strength_tags && profile.strength_tags.length > 0
        ? profile.strength_tags
        : ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"],
      metrics: {
        d_prime: metrics.d_prime,
        meta_d_prime: metrics.meta_d_prime,
        m_ratio: metrics.m_ratio,
        calibration_bias: metrics.calibration_bias,
        d_star: metrics.d_star,
        ive: metrics.info_buying_efficiency,
      },
      entryUrl: resolvedUrl,
    };
  }, [subjectName, archetypeConfig, profile, metrics, resolvedUrl]);

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
      await downloadPoster(shareData);
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
      const res = await copyPosterImageToClipboard(shareData);
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
      await downloadPoster(shareData);
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
            className="text-[12px] font-bold tracking-[0.25em] font-serif"
            style={{ color: colors.secondaryGold }}
          >
            东方认知流形 · 周易八卦心智图谱
          </div>
          <div className="text-[9px] tracking-[0.15em] text-slate-400 uppercase mt-0.5 font-mono">
            CHINESE COGNITIVE MANIFOLD ARCHETYPE SPECTRUM
          </div>
        </div>

        {/* 主体卡片区域 */}
        <div className="p-6 md:p-8 space-y-6 relative z-10">
          {/* 1. 八卦图腾中央罗盘徽章 */}
          <div className="relative flex flex-col items-center justify-center pt-2">
            {/* 背部外发光 */}
            <div
              className="absolute w-36 h-36 rounded-full blur-2xl pointer-events-none -top-2"
              style={{ backgroundColor: colors.glowColor }}
            />

            {/* 八卦外环 */}
            <div
              className="w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center relative shadow-inner"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0, 0, 0, 0.45)",
              }}
            >
              <div
                className="text-4xl font-black font-serif leading-none select-none drop-shadow-md"
                style={{ color: colors.secondaryGold }}
              >
                {archetypeConfig.baguaSymbol}
              </div>

              {/* 三爻示意线 */}
              <div className="flex flex-col gap-1 mt-1.5 w-10">
                {[2, 1, 0].map((idx) => {
                  const isYang = archetypeConfig.trigramLines[idx];
                  return isYang ? (
                    <div
                      key={idx}
                      className="h-1 rounded-full w-full"
                      style={{ backgroundColor: colors.secondaryGold }}
                    />
                  ) : (
                    <div key={idx} className="flex justify-between gap-1 w-full">
                      <div
                        className="h-1 rounded-full w-[45%]"
                        style={{ backgroundColor: colors.secondaryGold }}
                      />
                      <div
                        className="h-1 rounded-full w-[45%]"
                        style={{ backgroundColor: colors.secondaryGold }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 图腾称号徽带 */}
            <div
              className="mt-3 px-4 py-1 rounded-full border text-xs font-semibold tracking-wider font-serif shadow-md"
              style={{
                borderColor: colors.primaryGold,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: colors.secondaryGold,
              }}
            >
              【 {archetypeConfig.mythicTotem} · {archetypeConfig.baguaName}为{archetypeConfig.baguaNature} 】
            </div>
          </div>

          {/* 2. 探索者与核心大标题 */}
          <div className="text-center space-y-1">
            <div className="text-xs tracking-widest text-slate-300 font-mono">
              探索者 · {subjectName}
            </div>

            <h2
              className="text-3xl md:text-5xl font-black tracking-wider font-serif drop-shadow-lg"
              style={{
                color: colors.secondaryGold,
                textShadow: `0 0 20px ${colors.glowColor}`,
              }}
            >
              {profile.role_title || archetypeConfig.roleTitle}
            </h2>

            <div
              className="text-xs font-mono font-bold tracking-wider"
              style={{ color: colors.accentColor }}
            >
              [ {archetypeConfig.quadrantCode} ]
            </div>

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

          {/* 4. 4D 认知流形指标矩阵 (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">一元辨别力 d'</span>
                <span className="text-[10px] text-slate-500 font-mono">Type-1</span>
              </div>
              <div
                className="text-2xl font-black font-mono"
                style={{ color: colors.secondaryGold }}
              >
                {formatCognitiveMetric(metrics.d_prime)}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">底层推导客观硬战力</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">二元觉察力 Meta-d'</span>
                <span className="text-[10px] text-slate-500 font-mono">Type-2</span>
              </div>
              <div
                className="text-2xl font-black font-mono"
                style={{ color: colors.secondaryGold }}
              >
                {formatCognitiveMetric(metrics.meta_d_prime)}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">知己掌控与边界洞察</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">二元自洽率 M_ratio</span>
                <span className="text-[10px] text-slate-500 font-mono">Align</span>
              </div>
              <div
                className="text-2xl font-black font-mono"
                style={{ color: colors.secondaryGold }}
              >
                {formatMRatioMetric(metrics.m_ratio)}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">元认知杠杆对齐效能</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">校准偏置 Bias</span>
                <span className="text-[10px] text-slate-500 font-mono">Prudence</span>
              </div>
              <div
                className="text-2xl font-black font-mono"
                style={{ color: colors.secondaryGold }}
              >
                {formatBiasMetric(metrics.calibration_bias)}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">冒险攻坚 vs 审慎避险</div>
            </div>
          </div>

          {/* 5. 易经象辞古训典故与朱砂红印 */}
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
                【 周易 · 象辞古训 】
              </div>
              <p className="text-xs text-slate-300 font-serif leading-relaxed italic">
                “{archetypeConfig.hexagramAphorism}”
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
          className="flex-1 min-w-[150px] px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? "生成海报中..." : "下载高清海报 (PNG)"}
        </button>

        {/* 2. 一键复制海报图片到剪贴板 */}
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={copyingImage}
          className="flex-1 min-w-[150px] px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-amber-200 border border-amber-500/30 hover:border-amber-400 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          <Copy className="w-4 h-4 text-amber-400" />
          {copyingImage ? "复制处理中..." : "复制海报到剪贴板"}
        </button>

        {/* 3. 复制分享文案 */}
        <button
          type="button"
          onClick={handleCopyText}
          className="px-4 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-white/20 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          title="复制文字文案"
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-medium">已复制</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-slate-400" />
              <span>复制文案</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
