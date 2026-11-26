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
  HelpCircle,
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
import { getArchetypeDefinition } from "../../backend/archetype_matrix";
import { AmbientManifoldBackdrop } from "../components/aesthetic/AmbientManifoldBackdrop";
import { CognitiveManifoldSigil } from "../components/aesthetic/CognitiveManifoldSigil";

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
    window.location.href = sessionId ? `/?referrer=${encodeURIComponent(sessionId)}&ref_session=${encodeURIComponent(sessionId)}` : "/";
  };

  const handleStartDuel = () => {
    if (sessionId) {
      saveReferrerSessionId(sessionId);
      window.location.href = `/?referrer=${encodeURIComponent(sessionId)}&ref_session=${encodeURIComponent(sessionId)}&duel=1`;
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
    <div className="relative min-h-screen bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex flex-col font-sans selection:bg-[#FBBF24] dark:selection:bg-[#CCFF00] selection:text-stone-950 dark:selection:text-[#08080C]">
      <AmbientManifoldBackdrop report={localizedReport} intensity="subtle" />
      {/* 顶部全局导航栏 */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FFFDF8]/85 dark:bg-[#08080C]/85 border-b border-stone-900/8 dark:border-white/10 px-3.5 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <a
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer min-w-0"
            aria-label="Self-Test Home"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-[#CCFF00] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#FBBF24] dark:text-[#08080C]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-sm tracking-tight text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-[#CCFF00] transition-colors whitespace-nowrap">
                <span className="hidden sm:inline">Self-Test · </span>
                <span>{isEn ? "Manifold" : "思维星图"}</span>
              </span>
              <span className="text-[10px] text-stone-500 dark:text-slate-400 font-semibold hidden sm:inline">
                {isEn ? "Metacognitive Psychophysics" : "决策元认知评测系统"}
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <LanguageToggle />

            {/* 核心行动点：测测我的认知 */}
            <button
              onClick={handleStartMyTest}
              type="button"
              className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-4 py-1.5 rounded-xl text-xs font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{isEn ? "Test Now" : "测测我的认知"}</span>
              <span className="sm:hidden">{isEn ? "Test" : "自测"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3.5 py-6 sm:px-6 sm:py-8">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 animate-pulse">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100/80 dark:bg-[#12121C] border border-stone-900/10 dark:border-[#CCFF00]/40 flex items-center justify-center">
              <Compass className="w-7 h-7 text-stone-900 dark:text-[#CCFF00] animate-spin" />
            </div>
            <p className="text-sm text-stone-700 dark:text-slate-300 font-bold">
              {isEn ? "Decoding cognitive manifold & archetype..." : "正在解析认知流形与神话图腾..."}
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center">
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
                className="px-7 py-3.5 rounded-2xl text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isEn ? "Start Free Metacognition Test" : "立即测测我的认知"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Report Loaded State */}
        {!loading && localizedReport && profile && (
          <div className="space-y-7 animate-in fade-in duration-500">
            {/* Compact Editorial Title Strip */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white tracking-tight">
                {isEn
                  ? `${localizedReport.subject_name || "Explorer"}'s Assessment Report`
                  : `【${localizedReport.subject_name || "受测者"}】的元认知评测报告`}
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 font-medium">
                {isEn
                  ? `4AFC adaptive psychophysics × Type-2 metacognitive wagering · ${localizedReport.quadrant_code}`
                  : `4AFC 自适应阶梯范式 × 二阶置信度博弈 · ${localizedReport.quadrant_code}`}
              </p>
            </div>

            {/* Primary 2-Column Showcase: Archetype Poster + Scientific Manifold */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left: Social Archetype Poster (includes Archetype, 4 Skills, Resonance, QR & Export Actions) */}
              <div className="lg:col-span-6 w-full">
                {isEn ? (
                  <WesternArcanePoster
                    report={localizedReport}
                    avatar_url={localizedReport?.avatar_url}
                    entryUrl={shareUrl}
                  />
                ) : (
                  <ChineseMythicPoster
                    report={localizedReport}
                    avatar_url={localizedReport?.avatar_url}
                    entryUrl={shareUrl}
                  />
                )}
              </div>

              {/* Right: Quantitative Metrics + 1-of-1 Manifold Sigil + Pure Reading Strategy */}
              <div className="lg:col-span-6 space-y-5 w-full">
                {/* 4 Quantitative Metrics in One Unified Card */}
                <section
                  aria-label={isEn ? "Diagnostic Metrics" : "核心量化指标"}
                  className="rounded-2xl bg-white/95 dark:bg-[#0E0E16]/95 backdrop-blur-md border border-stone-900/12 dark:border-white/12 shadow-[0_12px_36px_-14px_rgba(28,25,23,0.1)] dark:shadow-[0_16px_44px_-16px_rgba(0,0,0,0.65)] overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-stone-900/8 dark:divide-white/10">
                    <div className="p-4 space-y-1">
                      <span className="text-[11px] text-stone-500 dark:text-slate-400 font-bold block">
                        {isEn ? "Sensitivity d'" : "一阶敏感度 d'"}
                      </span>
                      <div className="text-xl sm:text-2xl font-mono font-black tabular-nums text-stone-950 dark:text-[#38BDF8]">
                        {dPrime.toFixed(2)}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-slate-500 font-medium">
                        {isEn ? "Perceptual acuity" : "基础任务敏锐度"}
                      </p>
                    </div>

                    <div className="p-4 space-y-1">
                      <span className="text-[11px] text-stone-500 dark:text-slate-400 font-bold block">
                        {isEn ? "M-Ratio" : "元认知 M-Ratio"}
                      </span>
                      <div className="text-xl sm:text-2xl font-mono font-black tabular-nums text-emerald-700 dark:text-[#CCFF00]">
                        {mRatio.toFixed(2)}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-slate-500 font-medium">
                        {isEn ? "Self-monitoring" : "二阶自省效率"}
                      </p>
                    </div>

                    <div className="p-4 space-y-1">
                      <span className="text-[11px] text-stone-500 dark:text-slate-400 font-bold block">
                        {isEn ? "Bias" : "校准偏差 Bias"}
                      </span>
                      <div className="text-xl sm:text-2xl font-mono font-black tabular-nums text-amber-700 dark:text-[#FBBF24]">
                        {biasSign}{bias.toFixed(2)}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-slate-500 font-medium">
                        {bias > 0.1
                          ? (isEn ? "Bold / confident" : "果敢自信倾向")
                          : bias < -0.1
                          ? (isEn ? "Cautious / prudent" : "审慎保守倾向")
                          : (isEn ? "Well-calibrated" : "知行客观自洽")}
                      </p>
                    </div>

                    <div className="p-4 space-y-1">
                      <span className="text-[11px] text-stone-500 dark:text-slate-400 font-bold block">
                        {isEn ? "Accuracy" : "综合准确率"}
                      </span>
                      <div className="text-xl sm:text-2xl font-mono font-black tabular-nums text-stone-950 dark:text-emerald-400">
                        {Math.round(accuracy * 100)}%
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-slate-500 font-medium">
                        {isEn ? "Task convergence" : "阶梯收敛表现"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* 1-of-1 Computational Cognitive Manifold Sigil */}
                <CognitiveManifoldSigil report={localizedReport} isEn={isEn} compact />

                {/* Pure Reading Strategic Growth Blueprint */}
                {profile.growth_advice && (
                  <section className="rounded-2xl p-5 sm:p-6 bg-white/95 dark:bg-[#0E0E16]/95 backdrop-blur-md border border-stone-900/12 dark:border-white/12 shadow-[0_12px_36px_-14px_rgba(28,25,23,0.1)] dark:shadow-[0_16px_44px_-16px_rgba(0,0,0,0.65)] space-y-2 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-[#CCFF00]">
                      <Compass className="w-4 h-4 shrink-0" />
                      <span>{isEn ? "Strategic Growth Blueprint" : "认知演进策略指南"}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-relaxed font-medium">
                      {profile.growth_advice}
                    </p>
                  </section>
                )}
              </div>
            </div>

            {/* Clean Closing Conversion Bar (Single Duel CTA on entire page) */}
            <section
              aria-label="Call to Action"
              className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-[#FFFBF2] via-[#FFFDF8] to-[#FEF3C7]/45 dark:from-[#10121C] dark:via-[#10121C] dark:to-[#161926] text-stone-900 dark:text-white border border-amber-900/15 dark:border-white/12 shadow-[0_12px_36px_-14px_rgba(28,25,23,0.1)] dark:shadow-[0_16px_44px_-16px_rgba(0,0,0,0.65)] flex flex-col md:flex-row items-center justify-between gap-5"
            >
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-stone-950 dark:text-white">
                  {isEn ? "Discover Your Own Cognitive Manifold" : "测出你的真实认知流形与本命图腾"}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 font-medium">
                  {isEn
                    ? `Compute 4D manifold alignment with ${friendName} or start your 3-minute solo test.`
                    : `免登录 · 3 分钟自适应测评，对比你与【${friendName}】的 4D 认知流形，解锁双星对决与专属图腾。`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={handleStartDuel}
                  type="button"
                  data-testid="bottom-duel-challenge-btn"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-700 dark:bg-[#CCFF00] dark:hover:brightness-110 text-white dark:text-[#08080C] inline-flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Swords className="w-4 h-4 shrink-0" />
                  <span>{isEn ? `Duel with ${friendName}` : `与 ${friendName} 发起双星对决`}</span>
                </button>

                <button
                  onClick={handleStartMyTest}
                  type="button"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-stone-50 text-stone-900 border border-stone-900/15 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:text-white dark:border-white/15 inline-flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-[#CCFF00]" />
                  <span>{isEn ? "Test My Metacognition Now" : "测测我的认知 · 立即开启"}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 底部页脚 */}
      <footer className="relative z-10 border-t border-stone-900/8 dark:border-white/10 py-6 px-4 text-center text-xs text-stone-500 dark:text-slate-400 space-y-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center justify-center gap-4 text-stone-600 dark:text-slate-400 font-semibold">
          <a href="/" className="hover:text-amber-700 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Home" : "首页"}
          </a>
          <a href="/privacy" className="hover:text-amber-700 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Privacy Policy" : "隐私政策"}
          </a>
          <a href="/terms" className="hover:text-amber-700 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Terms of Service" : "用户协议"}
          </a>
          <a href="/admin" className="hover:text-amber-700 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Admin Portal" : "管理控制台"}
          </a>
        </div>
        <p>© {new Date().getFullYear()} Self-Test (思维星图). All rights reserved.</p>
      </footer>
    </div>
  );
};
