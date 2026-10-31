/**
 * Public Share Page (src/frontend/pages/SharePage.tsx)
 * 
 * Standalone public landing page for viewing shared metacognitive assessment reports:
 * - Full dual-theme support: Scheme C Playful Dopamine (Light) & Scheme B Acid Cyber Editorial (Dark)
 * - Accessible without authentication (/share/:sessionId)
 * - Renders the interactive assessment share poster (ChineseMythicPoster / WesternArcanePoster)
 * - Presents in-depth diagnostic details, cognitive metrics, and innate skill matrix
 * - Features prominent "Test My Metacognition" / "测测我的认知" CTA buttons routing to "/"
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  Compass,
  Crown,
  Shield,
  Activity,
  Award,
  Zap,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Share2,
  Check,
  Swords,
} from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { ThemeToggle } from "../components/ThemeToggle";
import { ChineseMythicPoster } from "../components/share/ChineseMythicPoster";
import { WesternArcanePoster } from "../components/share/WesternArcanePoster";
import {
  extractSessionIdFromUrl,
  buildSessionShareUrl,
  saveReferrerSessionId,
} from "../utils/sessionRoute";
import { triggerNativeShare } from "../utils/shareUtils";
import { getArchetypeDefinition } from "../../backend/archetype_matrix";
import { getMythicArchetype } from "../components/share/mythicArchetypes";
import { getArcaneArchetype } from "../components/share/arcaneArchetypes";

export const SharePage: React.FC = () => {
  const { locale, t, formatMessage } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [sessionId, setSessionId] = useState<string | null>(() => {
    return extractSessionIdFromUrl();
  });

  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract session ID on mount / popstate
  useEffect(() => {
    const updateSessionId = () => {
      const id = extractSessionIdFromUrl();
      setSessionId(id);
    };
    window.addEventListener("popstate", updateSessionId);
    return () => window.removeEventListener("popstate", updateSessionId);
  }, []);

  // Fetch public session report
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError(isEn ? "No session ID specified." : "未指定评测会话 ID。");
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(sessionId)}?lang=${encodeURIComponent(locale)}`, {
          headers: { "Accept-Language": locale },
        });

        if (!res.ok) {
          // Fallback probe to /api/sessions/:id
          const fallbackRes = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}?lang=${encodeURIComponent(locale)}`);
          if (!fallbackRes.ok) {
            throw new Error(isEn ? "Assessment report not found or expired." : "未找到该评测记录或已被清理。");
          }
          const data = await fallbackRes.json();
          if (!isCancelled) {
            setReport(data);
          }
          return;
        }

        const data = await res.json();
        if (!isCancelled) {
          setReport(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || (isEn ? "Failed to load assessment report." : "加载评测报告失败。"));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, locale, isEn]);

  // Dynamically localized presentation layer
  const localizedReport = useMemo(() => {
    if (!report) return null;
    const rawProfile = report.diagnostic_profile || {};
    const quadrantCode = report.quadrant_code || rawProfile.quadrant_code || rawProfile.archetype || "Q1-CAL";
    const def = getArchetypeDefinition(quadrantCode, locale);

    const skills = def.skills.map((defSkill: any, idx: number) => {
      const origSkill = rawProfile.skills?.[idx];
      return {
        icon: origSkill?.icon || defSkill.icon || "✨",
        type: defSkill.type || origSkill?.type,
        name: (origSkill?.name || defSkill.name || "").replace(/\s*\([^)]*\)/g, ""),
        desc: origSkill?.desc || defSkill.desc,
      };
    });

    return {
      ...report,
      quadrant_code: def.quadrant_code,
      diagnostic_profile: {
        ...rawProfile,
        archetype: def.archetype,
        role_title: def.role_title,
        english_title: def.english_title,
        quadrant_code: def.quadrant_code,
        praise_tagline: def.praise_tagline,
        strength_tags: def.strength_tags,
        empowering_feedback: def.empowering_feedback,
        growth_advice: def.growth_advice,
        skills,
        clinical_summary: def.clinical_summary,
      },
    };
  }, [report, locale]);

  const friendName = localizedReport?.subject_name || report?.subject_name || (isEn ? "Explorer" : "好友");

  const handleStartMyTest = () => {
    if (sessionId) {
      saveReferrerSessionId(sessionId);
    }
    window.location.href = sessionId ? `/?referrer=${encodeURIComponent(sessionId)}` : "/";
  };

  const handleStartDuel = () => {
    if (sessionId) {
      saveReferrerSessionId(sessionId);
      window.location.href = `/?referrer=${encodeURIComponent(sessionId)}&duel=1`;
    } else {
      window.location.href = "/";
    }
  };

  const shareUrl = useMemo(() => {
    return sessionId ? buildSessionShareUrl(sessionId) : "/";
  }, [sessionId]);

  // Profile data
  const profile = localizedReport?.diagnostic_profile;
  const metrics = localizedReport?.metrics || localizedReport?.metacognitive_metrics;
  const dPrime = metrics?.d_prime ?? 0;
  const mRatio = metrics?.m_ratio ?? 0;
  const bias = metrics?.calibration_bias ?? 0;
  const accuracy = metrics?.first_order_accuracy ?? localizedReport?.summary?.first_order_accuracy ?? 0.75;
  const biasSign = bias >= 0 ? "+" : "";

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex flex-col font-sans selection:bg-[#FBBF24] dark:selection:bg-[#CCFF00] selection:text-stone-950 dark:selection:text-[#08080C]">
      {/* 顶部全局导航栏 */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-[#08080C]/80 border-b-2 border-stone-900/10 dark:border-white/10 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 group cursor-pointer min-w-0"
            aria-label="Self-Test Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FBBF24] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] group-hover:-translate-y-0.5 active:translate-y-0.5 transition-all shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-stone-950 dark:text-[#CCFF00]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-base tracking-tight text-stone-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-[#CCFF00] transition-colors truncate max-w-[120px] sm:max-w-none">
                Self-Test · {isEn ? "Manifold" : "思维星图"}
              </span>
              <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold hidden sm:inline">
                {isEn ? "Metacognitive Psychophysics" : "决策元认知评测系统"}
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />
            <LanguageToggle />

            {/* 与好友对决行动点 */}
            {report && (
              <button
                onClick={handleStartDuel}
                type="button"
                data-testid="header-duel-btn"
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-black bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:brightness-110 text-white border-2 border-stone-900 dark:border-rose-400 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] flex items-center gap-1 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer min-h-[44px]"
              >
                <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span className="hidden sm:inline">{isEn ? `Duel with ${friendName}` : `与 ${friendName} 对决`}</span>
                <span className="sm:hidden">{isEn ? "Duel" : "双星对决"}</span>
              </button>
            )}

            {/* 核心行动点：测测我的认知 */}
            <button
              onClick={handleStartMyTest}
              type="button"
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] flex items-center gap-1 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-950 dark:text-[#08080C]" />
              <span className="hidden xs:inline">{isEn ? "Test Now" : "测测我的认知"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-10">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
              <Compass className="w-8 h-8 text-stone-900 dark:text-[#CCFF00] animate-spin" />
            </div>
            <p className="text-base text-stone-800 dark:text-slate-300 font-bold">
              {isEn ? "Decoding cognitive manifold & archetype..." : "正在解析认知流形与神话图腾..."}
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-stone-900 dark:border-rose-500/40 flex items-center justify-center shadow-[0_4px_0_#1c1917] dark:shadow-none">
              <HelpCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white">
                {isEn ? "Assessment Report Not Found" : "未找到评测报告"}
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleStartMyTest}
                type="button"
                className="px-7 py-3.5 rounded-2xl text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] inline-flex items-center gap-2 cursor-pointer active:translate-y-1 active:shadow-none transition-all"
              >
                <Sparkles className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                <span>{isEn ? "Start Free Metacognition Test" : "立即测测我的认知"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Report Loaded State */}
        {!loading && localizedReport && profile && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header Subject Title */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs text-stone-900 dark:text-[#08080C] font-black shadow-[0_2px_0_#1c1917] dark:shadow-none">
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400 dark:text-[#08080C] dark:fill-[#08080C]" />
                <span>
                  {isEn ? "Public Cognitive Archetype Seal" : "专属认知流形与本命图腾"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
                {isEn
                  ? `${localizedReport.subject_name || "Explorer"}'s Assessment Report`
                  : `【${localizedReport.subject_name || "受测者"}】的元认知评测报告`}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
                {isEn
                  ? "Generated through 4AFC adaptive psychophysics and Type-2 metacognitive wagering."
                  : "基于 4AFC 阶梯范式与二阶元认知置信度博弈，精准定位感知敏锐度与自省决断力。"}
              </p>
            </div>

            {/* 双星对决吸睛挑战横幅 */}
            <div className="p-4 sm:p-6 rounded-[24px] bg-[#FEF3C7] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] sm:shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-[#CCFF00]">
                  <Swords className="w-4 h-4 text-stone-900 dark:text-[#CCFF00]" />
                  <span>
                    {isEn ? "Cognitive Twin Duel Invitation" : "双星认知对决挑战"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-800 dark:text-slate-200 font-bold leading-relaxed">
                  {isEn
                    ? `Challenge ${friendName} to a 4D cognitive manifold duel! Compute mutual alignment, complementary chemistry, and unlock your Twin Stars joint poster.`
                    : `接受来自【${friendName}】的认知对决邀请！测测你们的 4D 认知流形欧氏距离与互补特质，解锁“双星并峙”专属联合对决海报！`}
                </p>
              </div>

              <button
                type="button"
                data-testid="duel-challenge-banner-btn"
                onClick={handleStartDuel}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 dark:bg-[#CCFF00] dark:hover:brightness-110 text-white dark:text-[#08080C] font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all"
              >
                <Swords className="w-4 h-4" />
                <span>{isEn ? `Duel with ${friendName}` : `与 ${friendName} 发起对决`}</span>
              </button>
            </div>

            {/* Poster Card Section */}
            <div className="flex justify-center">
              <div className="w-full max-w-xl">
                {isEn ? (
                  <WesternArcanePoster
                    report={localizedReport}
                    entryUrl={shareUrl}
                    className="shadow-2xl shadow-purple-950/40"
                  />
                ) : (
                  <ChineseMythicPoster
                    report={localizedReport}
                    entryUrl={shareUrl}
                    className="shadow-2xl shadow-amber-950/40"
                  />
                )}
              </div>
            </div>

            {/* 核心吸睛 CTA 横幅：测测我的认知 (Light 多巴胺 vs Dark 赛博先锋) */}
            <section
              aria-label="Call to Action"
              className="relative overflow-hidden rounded-[28px] p-6 sm:p-10 border-[2.5px] border-stone-900 dark:border-white/20 bg-[#FFFBEB] dark:bg-[#0E0E16] shadow-[0_6px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] text-center space-y-4"
            >
              <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black text-xs font-black text-stone-900 dark:text-[#08080C] shadow-[0_2px_0_#1c1917] dark:shadow-none uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400 dark:text-[#08080C] dark:fill-[#08080C]" />
                  <span>{isEn ? "Discover Your Totem" : "探索你的思维图腾"}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                  {isEn ? "How Strong Is Your Metacognition?" : "你的思维流形与认知特质是什么？"}
                </h2>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
                  {isEn
                    ? "Are you an Sovereign Grand Archmage, a Pragmatic Arbitrageur, or an Audacious Pioneer? Take the free 30-trial test to discover your cognitive calibration and innate skills."
                    : "你是统御全局的人形外挂、明察秋毫的诸葛在世，还是无畏探索的飞龙在天？无需注册，立即开启 30 轮自适应阶梯测评，测出你的真实认知流形！"}
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleStartMyTest}
                    type="button"
                    className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-sm sm:text-base font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-5 h-5 text-stone-950 dark:text-[#08080C]" />
                    <span>{isEn ? "Test My Metacognition Now" : "测测我的认知 · 立即开启"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={async () => {
                      const text = isEn
                        ? `Check out ${localizedReport.subject_name || "Explorer"}'s [${profile.role_title}] archetype on Self-Test:`
                        : `来看看【${localizedReport.subject_name || "受测者"}】在 Self-Test 解锁的【${profile.role_title}】专属认知画像：`;
                      await triggerNativeShare({
                        title: `Self-Test · ${profile.role_title}`,
                        text,
                        url: shareUrl,
                      });
                    }}
                    type="button"
                    className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl text-sm sm:text-base font-black bg-white dark:bg-[#12121C] hover:bg-stone-50 dark:hover:bg-white/10 text-stone-900 dark:text-white border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all cursor-pointer min-h-[44px]"
                  >
                    <Share2 className="w-5 h-5 text-stone-950 dark:text-[#CCFF00]" />
                    <span>{isEn ? "Share This Archetype" : "原生分享此画像"}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Diagnostic Details: 深度诊断详情 */}
            <section className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b-2 border-stone-900/10 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-stone-950 dark:text-[#CCFF00]" />
                  <h3 className="text-lg sm:text-xl font-black text-stone-950 dark:text-white">
                    {isEn ? "Diagnostic Metrics & Trait Analysis" : "认知指标与画像深度解析"}
                  </h3>
                </div>
                <span className="text-xs text-stone-950 dark:text-[#CCFF00] font-mono font-black bg-[#FEF3C7] dark:bg-[#12121C] px-3 py-1 rounded-full border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                  {localizedReport.quadrant_code}
                </span>
              </div>

              {/* 4 Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] rounded-2xl p-4 border-[2.5px] border-stone-900 dark:border-[#38BDF8] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#38BDF8] space-y-1.5">
                  <span className="text-xs text-stone-700 dark:text-slate-300 font-black">
                    {isEn ? "1st-Order Sensitivity d'" : "一阶敏感度 d'"}
                  </span>
                  <div className="text-2xl font-mono font-black text-sky-900 dark:text-[#38BDF8]">
                    {dPrime.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-slate-300 font-bold">
                    {isEn ? "Raw perceptual & task acuity" : "基础任务敏锐度与信息处理"}
                  </p>
                </div>

                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] rounded-2xl p-4 border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] space-y-1.5">
                  <span className="text-xs text-stone-700 dark:text-slate-300 font-black">
                    {isEn ? "Metacog M-Ratio" : "元认知效率 M-Ratio"}
                  </span>
                  <div className="text-2xl font-mono font-black text-emerald-900 dark:text-[#CCFF00]">
                    {mRatio.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-slate-300 font-bold">
                    {isEn ? "Type-2 self-monitoring leverage" : "二阶自省与置信度博弈效率"}
                  </p>
                </div>

                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] rounded-2xl p-4 border-[2.5px] border-stone-900 dark:border-[#FBBF24] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#FBBF24] space-y-1.5">
                  <span className="text-xs text-stone-700 dark:text-slate-300 font-black">
                    {isEn ? "Calibration Bias" : "校准偏差 Bias"}
                  </span>
                  <div className="text-2xl font-mono font-black text-amber-900 dark:text-[#FBBF24]">
                    {biasSign}{bias.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-slate-300 font-bold">
                    {bias > 0.1
                      ? (isEn ? "Overconfidence tendency" : "偏向自信敢下注")
                      : bias < -0.1
                      ? (isEn ? "Conservative tendency" : "偏向谨慎保守防守")
                      : (isEn ? "Well-balanced calibration" : "知行合一客观自洽")}
                  </p>
                </div>

                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] rounded-2xl p-4 border-[2.5px] border-stone-900 dark:border-[#10B981] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#10B981] space-y-1.5">
                  <span className="text-xs text-stone-700 dark:text-slate-300 font-black">
                    {isEn ? "Task Accuracy" : "综合准确率"}
                  </span>
                  <div className="text-2xl font-mono font-black text-rose-900 dark:text-[#10B981]">
                    {Math.round(accuracy * 100)}%
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-slate-300 font-bold">
                    {isEn ? "Psychophysical test accuracy" : "自适应阶梯收敛表现"}
                  </p>
                </div>
              </div>

              {/* Empowering Feedback Card */}
              {profile.empowering_feedback && (
                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] p-6 sm:p-7 rounded-[28px] space-y-3">
                  <div className="flex items-center gap-2 font-black text-sm text-stone-950 dark:text-white border-b-2 border-stone-900/10 dark:border-white/10 pb-3">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]" />
                    <span>{isEn ? "Empowering Resonance" : "思维特质深度共鸣"}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-900 dark:text-slate-200 leading-relaxed font-medium">
                    {profile.empowering_feedback}
                  </p>
                </div>
              )}

              {/* 4 Innate Skills Breakdown */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-stone-950 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20" />
                    <span>{isEn ? "Innate Cognitive Skills" : "专属四大正向特技"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {profile.skills.map((skill: any, idx: number) => {
                      const colorMap = [
                        "bg-white dark:bg-[#12121C]",
                        "bg-white dark:bg-[#12121C]",
                        "bg-white dark:bg-[#12121C]",
                        "bg-white dark:bg-[#12121C]",
                      ];
                      const skillBg = colorMap[idx % colorMap.length];
                      return (
                        <div
                          key={idx}
                          className={`${skillBg} rounded-2xl p-4 border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_3.5px_0_#1c1917] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] space-y-1.5`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{skill.icon}</span>
                              <span className="font-black text-xs sm:text-sm text-stone-950 dark:text-white">{skill.name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#08080C] text-stone-950 dark:text-[#CCFF00] border-2 border-stone-900 dark:border-[#CCFF00] font-black">
                              {skill.type}
                            </span>
                          </div>
                          <p className="text-xs text-stone-700 dark:text-slate-300 font-bold leading-relaxed">
                            {skill.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Growth Advice */}
              {profile.growth_advice && (
                <div className="bg-[#FFFBEB] dark:bg-[#0E0E16] rounded-2xl p-4 sm:p-5 border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.8)] text-xs sm:text-sm leading-relaxed space-y-1.5">
                  <span className="font-black text-stone-950 dark:text-[#CCFF00] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-stone-950 dark:text-[#CCFF00]" />
                    <span>{isEn ? "Strategic Growth Blueprint" : "认知演进策略指南"}</span>
                  </span>
                  <p className="text-xs text-stone-800 dark:text-slate-300 leading-relaxed font-bold pt-1">
                    {profile.growth_advice}
                  </p>
                </div>
              )}
            </section>

            {/* Bottom Final CTA Button */}
            <div className="py-6 text-center space-y-3 max-w-md mx-auto">
              <button
                onClick={handleStartDuel}
                type="button"
                data-testid="bottom-duel-challenge-btn"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-black bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:brightness-110 text-white border-[2.5px] border-stone-900 dark:border-rose-400 shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] inline-flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all cursor-pointer min-h-[44px]"
              >
                <Swords className="w-5 h-5 text-white" />
                <span>{isEn ? `Duel with ${friendName}` : `与 ${friendName} 发起双星对决`}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div>
                <button
                  onClick={handleStartMyTest}
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] inline-flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition-all cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                  <span>{isEn ? "Test My Metacognition Now" : "测测我的认知 · 自主评测"}</span>
                </button>
              </div>

              <div className="text-xs text-stone-500 dark:text-slate-400 font-medium pt-1">
                {isEn
                  ? "No login required · Fast 3-minute scientific test"
                  : "免登录 · 3分钟极速自适应科学阶梯测评"}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部页脚 */}
      <footer className="border-t-2 border-stone-900/10 dark:border-white/10 py-6 px-4 text-center text-xs text-stone-500 dark:text-slate-400 space-y-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center justify-center gap-4 text-stone-600 dark:text-slate-400 font-bold">
          <a href="/" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Home" : "首页"}
          </a>
          <a href="/privacy" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Privacy Policy" : "隐私政策"}
          </a>
          <a href="/terms" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Terms of Service" : "用户协议"}
          </a>
          <a href="/admin" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Admin Portal" : "管理控制台"}
          </a>
        </div>
        <p>© {new Date().getFullYear()} Self-Test (思维星图). All rights reserved.</p>
      </footer>
    </div>
  );
};
