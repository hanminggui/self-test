/**
 * Twin Stars Joint Poster Component (src/frontend/components/share/TwinStarsJointPoster.tsx)
 * 
 * Interactive component rendering side-by-side or dual-star visual comparison
 * with participants' badges, aphorisms, 4D alignment score, and chemistry breakdown.
 * Supports high-DPI export, mobile long-press image caching, and instant link copying.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Copy,
  Share2,
  Check,
  Sparkles,
  Swords,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  DuelPosterData,
  generateTwinStarsPosterBlob,
  downloadTwinStarsPoster,
  copyTwinStarsPosterToClipboard,
  copyDuelShareTextToClipboard,
  generateDuelQrCodeSvg,
} from "./duelPosterGenerator";
import { getMythicArchetype } from "./mythicArchetypes";
import { getArcaneArchetype } from "./arcaneArchetypes";
import { triggerNativeShare } from "../../utils/shareUtils";

export interface TwinStarsJointPosterProps {
  data: DuelPosterData;
  onChallenge?: () => void;
}

export const TwinStarsJointPoster: React.FC<TwinStarsJointPosterProps> = ({
  data,
  onChallenge,
}) => {
  const isEn = data.locale === "en-US" || String(data.locale).toLowerCase().startsWith("en");
  const pA = data.participantA;
  const pB = data.participantB;
  const comp = data.comparison;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");

  const mythicA = useMemo(() => getMythicArchetype(pA.archetype), [pA.archetype]);
  const mythicB = useMemo(() => getMythicArchetype(pB.archetype), [pB.archetype]);
  const arcaneA = useMemo(() => getArcaneArchetype(pA.archetype), [pA.archetype]);
  const arcaneB = useMemo(() => getArcaneArchetype(pB.archetype), [pB.archetype]);

  const nameA = pA.subjectName || (isEn ? "Player A" : "探索者 A");
  const nameB = pB.subjectName || (isEn ? "Player B" : "探索者 B");
  const titleA = pA.roleTitle || (isEn ? arcaneA.roleTitle : mythicA.roleTitle);
  const titleB = pB.roleTitle || (isEn ? arcaneB.roleTitle : mythicB.roleTitle);
  const totemA = pA.totemOrOrder || (isEn ? arcaneA.orderTitle : mythicA.mythicTotem);
  const totemB = pB.totemOrOrder || (isEn ? arcaneB.orderTitle : mythicB.mythicTotem);
  const aphorismA = pA.aphorism || (isEn ? arcaneA.praiseTagline : mythicA.totemAphorism);
  const aphorismB = pB.aphorism || (isEn ? arcaneB.praiseTagline : mythicB.totemAphorism);

  // Generate QR Code SVG
  useEffect(() => {
    let isCancelled = false;
    generateDuelQrCodeSvg(data.entryUrl || window.location.href).then((svg) => {
      if (!isCancelled) setQrSvg(svg);
    });
    return () => {
      isCancelled = true;
    };
  }, [data.entryUrl]);

  const handleCopyLink = async () => {
    const url = data.entryUrl || window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  const handleCopyShareText = async () => {
    const success = await copyDuelShareTextToClipboard(data);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTwinStarsPoster(data);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    const success = await copyTwinStarsPosterToClipboard(data);
    if (success) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    const url = data.entryUrl || window.location.href;
    const title = isEn
      ? `Twin Stars Duel: ${nameA} vs ${nameB} · ${comp.similarity_percentage}% Alignment`
      : `双星认知对决：${nameA} vs ${nameB} · 契合度 ${comp.similarity_percentage}%`;
    const text = `“${comp.synergy_title}” | 契合度: ${comp.similarity_percentage}% · 互补指数: ${comp.complementary_index}%`;
    await triggerNativeShare({ title, text, url });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* 核心海报容器卡片 */}
      <div
        id="twin-stars-joint-poster"
        className="rounded-[28px] sm:rounded-[36px] bg-[#07080D] border-[2.5px] border-stone-800 dark:border-white/20 shadow-[0_10px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] overflow-hidden relative text-white"
      >
        {/* 顶部双色彩光光晕 */}
        <div className="absolute top-0 left-0 w-1/2 h-80 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-80 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* 顶栏徽章 */}
        <div className="pt-6 sm:pt-8 pb-4 text-center space-y-2 relative z-10 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] sm:text-xs font-black tracking-widest text-amber-400 font-mono">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isEn ? "✦ SELF-TEST · COGNITIVE TWIN DUEL ✦" : "✦ 思维星图 · 双星认知对决 ✦"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
            {isEn ? "COGNITIVE TWIN STARS" : "双星认知对决全景战报"}
          </h2>
        </div>

        {/* 中央双星契合星环 Nexus */}
        <div className="py-4 sm:py-6 text-center relative z-10 space-y-3 px-4">
          <div className="relative inline-flex items-center justify-center">
            {/* 旋转星环效果 */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-dashed border-amber-400/40 animate-spin-slow flex items-center justify-center p-2" />
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-cyan-400/40 absolute flex items-center justify-center" />
            
            {/* 核心数值展示 */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#0E101A] border-2 border-white/20 absolute flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl sm:text-4xl font-black text-[#CCFF00] tracking-tight font-mono">
                {comp.similarity_percentage}%
              </span>
              <span className="text-[10px] sm:text-xs text-white/70 font-bold uppercase tracking-wider">
                {isEn ? "Alignment" : "契合度"}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-block px-4 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-black text-sm sm:text-lg">
              {comp.synergy_title}
            </div>
            <div className="text-xs text-white/70 font-medium">
              {isEn ? `Complementary Index: ${comp.complementary_index}%` : `认知互补指数：${comp.complementary_index}%`}
            </div>
          </div>
        </div>

        {/* 双星对阵卡片 Side-by-Side Dual-Star Grid */}
        <div className="px-4 sm:px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative z-10">
          {/* 左侧：Participant A */}
          <div className="rounded-2xl bg-white/[0.04] border border-cyan-500/30 p-4 sm:p-6 space-y-4 hover:border-cyan-400/60 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
                  {isEn ? "Participant A" : "受测选手 A"}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white truncate max-w-[200px]">
                  {nameA}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono text-xs font-bold shadow-sm">
                <span className="text-sm">{isEn ? (arcaneA.crestSymbol || "⚔️") : "✦"}</span>
                <span className="tracking-wider">{isEn ? arcaneA.sealText : mythicA.sealText}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-white/50 font-medium uppercase font-mono">
                {isEn ? "Archetype & Crest" : "认知画像与图腾"}
              </div>
              <div className="text-base sm:text-lg font-black text-cyan-300">
                {titleA}
              </div>
              <div className="text-xs font-bold text-cyan-400/80">
                ✦ {totemA}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-[10px] text-white/50 font-bold uppercase font-mono">
                {isEn ? "Aphorism Decree" : "图腾箴言与象辞"}
              </div>
              <p className="text-xs italic text-white/90 leading-relaxed font-serif">
                “{aphorismA}”
              </p>
            </div>
          </div>

          {/* 右侧：Participant B */}
          <div className="rounded-2xl bg-white/[0.04] border border-amber-500/30 p-4 sm:p-6 space-y-4 hover:border-amber-400/60 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider uppercase">
                  {isEn ? "Participant B" : "受测选手 B"}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white truncate max-w-[200px]">
                  {nameB}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono text-xs font-bold shadow-sm">
                <span className="text-sm">{isEn ? (arcaneB.crestSymbol || "🛡️") : "✦"}</span>
                <span className="tracking-wider">{isEn ? arcaneB.sealText : mythicB.sealText}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-white/50 font-medium uppercase font-mono">
                {isEn ? "Archetype & Crest" : "认知画像与图腾"}
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300">
                {titleB}
              </div>
              <div className="text-xs font-bold text-amber-400/80">
                ✦ {totemB}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="text-[10px] text-white/50 font-bold uppercase font-mono">
                {isEn ? "Aphorism Decree" : "图腾箴言与象辞"}
              </div>
              <p className="text-xs italic text-white/90 leading-relaxed font-serif">
                “{aphorismB}”
              </p>
            </div>
          </div>
        </div>

        {/* 战力协同与风格对照解析卡 */}
        <div className="px-4 sm:px-8 py-4 relative z-10">
          <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isEn ? "Pairing Dynamics & Chemistry" : "双星化学反应与战力协同解析"}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-medium">
              {comp.pairing_dynamics}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-[#CCFF00] flex items-center gap-1.5">
                  <span>★</span>
                  <span>{isEn ? "Mutual Synergies" : "核心协同优势"}</span>
                </span>
                <ul className="space-y-1 text-white/70">
                  {comp.mutual_strengths.map((str, idx) => (
                    <li key={idx} className="leading-relaxed">• {str}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{isEn ? "Cognitive Contrast" : "风格差异对照"}</span>
                </span>
                <ul className="space-y-1 text-white/70">
                  {comp.mutual_differences.map((diff, idx) => (
                    <li key={idx} className="leading-relaxed">• {diff}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息栏与二维码 */}
        <div className="px-4 sm:px-8 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 text-center sm:text-left">
          <div className="space-y-1 max-w-sm">
            <div className="text-sm font-black text-white">Self-Test · 思维星图</div>
            <div className="text-xs text-white/60">
              {isEn
                ? "Scan QR code or click share to challenge your own cognitive twin"
                : "扫码查看交互式双星战报 · 测测你的二元认知流形"}
            </div>
            <div className="text-[11px] font-mono text-amber-400/80 truncate">
              {data.entryUrl || window.location.href}
            </div>
          </div>

          {qrSvg && (
            <div
              className="w-20 h-20 bg-white p-1 rounded-xl shadow-lg shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
        </div>
      </div>

      {/* 底部交互操作工具栏 (Action Controls) */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 pt-2">
        {/* 下载高清海报 PNG */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="min-h-[44px] px-5 py-3 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? (isEn ? "Generating..." : "生成中...") : (isEn ? "Download Joint Poster" : "保存双星海报 (PNG)")}</span>
        </button>

        {/* 复制对决链接 */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="min-h-[44px] px-4 py-3 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer transition-all"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? (isEn ? "Link Copied!" : "链接已复制！") : (isEn ? "Copy Duel Link" : "复制对决链接")}</span>
        </button>

        {/* 复制论坛分享战报文案 */}
        <button
          type="button"
          onClick={handleCopyShareText}
          className="min-h-[44px] px-4 py-3 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer transition-all"
        >
          {copiedText ? <Check className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" /> : <Share2 className="w-4 h-4" />}
          <span>{copiedText ? (isEn ? "Report Copied!" : "战报文案已复制！") : (isEn ? "Copy Forum Text" : "复制论坛战报")}</span>
        </button>

        {/* 复制海报图像到剪贴板 */}
        <button
          type="button"
          onClick={handleCopyImage}
          className="min-h-[44px] px-4 py-3 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer transition-all"
        >
          {copiedImage ? <Check className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" /> : <Copy className="w-4 h-4" />}
          <span>{copiedImage ? (isEn ? "Image Copied!" : "海报已复制！") : (isEn ? "Copy Image" : "复制海报图")}</span>
        </button>

        {/* 移动端原生系统分享 */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="min-h-[44px] px-4 py-3 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none flex items-center gap-2 cursor-pointer transition-all sm:hidden"
        >
          <Share2 className="w-4 h-4" />
          <span>{isEn ? "Share" : "系统分享"}</span>
        </button>
      </div>

      {/* 底部召唤测试行动点 */}
      {onChallenge && (
        <div className="p-6 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] text-center space-y-3">
          <div className="font-black text-stone-900 dark:text-white text-base sm:text-lg">
            {isEn ? "Want to challenge this pair or test your own cognitive manifold?" : "想向两位受测者发起对决，或测测你的思维图腾？"}
          </div>
          <button
            type="button"
            onClick={onChallenge}
            className="min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] font-black text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] inline-flex items-center gap-2 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isEn ? "Start Free Assessment Now" : "立即开启我的认知测试"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
