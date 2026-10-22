/**
 * Public Share Page (src/frontend/pages/SharePage.tsx)
 * 
 * Standalone public landing page for viewing shared metacognitive assessment reports:
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
} from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { ChineseMythicPoster } from "../components/share/ChineseMythicPoster";
import { WesternArcanePoster } from "../components/share/WesternArcanePoster";
import {
  extractSessionIdFromUrl,
  buildSessionShareUrl,
} from "../utils/sessionRoute";
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

  const handleStartMyTest = () => {
    window.location.href = "/";
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
    <div className="min-h-screen bg-[#0b0d13] text-[#e2e8f0] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 顶部全局导航栏 */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0d13]/80 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="Self-Test Home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-4 h-4 text-amber-300 animate-spin-slow" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-amber-300 transition-colors">
                Self-Test · {isEn ? "Cognitive Manifold" : "思维星图"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                {isEn ? "Metacognitive Psychophysics" : "决策元认知评测系统"}
              </span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <LanguageToggle />

            {/* 核心行动点：测测我的认知 */}
            <button
              onClick={handleStartMyTest}
              type="button"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEn ? "Test My Metacognition" : "测测我的认知"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-10">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Compass className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
            <p className="text-base text-slate-300 font-medium">
              {isEn ? "Decoding cognitive manifold & archetype..." : "正在解析认知流形与神话图腾..."}
            </p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && error && (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {isEn ? "Assessment Report Not Found" : "未找到评测报告"}
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleStartMyTest}
                type="button"
                className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 inline-flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
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
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header Subject Title */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-medium">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isEn ? "Public Cognitive Archetype Seal" : "专属认知流形与本命图腾"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {isEn
                  ? `${localizedReport.subject_name || "Explorer"}'s Assessment Report`
                  : `【${localizedReport.subject_name || "受测者"}】的元认知评测报告`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                {isEn
                  ? "Generated through 4AFC adaptive psychophysics and Type-2 metacognitive wagering."
                  : "基于 4AFC 阶梯范式与二阶元认知置信度博弈，精准定位感知敏锐度与自省决断力。"}
              </p>
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

            {/* 核心吸睛 CTA 横幅：测测我的认知 */}
            <section
              aria-label="Call to Action"
              className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 shadow-2xl text-center space-y-4"
            >
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>{isEn ? "Discover Your Totem" : "探索你的思维图腾"}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300">
                  {isEn ? "How Strong Is Your Metacognition?" : "你的思维流形与认知特质是什么？"}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isEn
                    ? "Are you an Sovereign Grand Archmage, a Pragmatic Arbitrageur, or an Audacious Pioneer? Take the free 30-trial test to discover your cognitive calibration and innate skills."
                    : "你是统御全局的人形外挂、明察秋毫的诸葛在世，还是无畏探索的飞龙在天？无需注册，立即开启 30 轮自适应阶梯测评，测出你的真实认知流形！"}
                </p>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleStartMyTest}
                    type="button"
                    className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl text-sm sm:text-base font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-xl shadow-amber-500/25 flex items-center gap-2 transform hover:scale-105 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 text-slate-950" />
                    <span>{isEn ? "Test My Metacognition Now" : "测测我的认知 · 立即开启"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Diagnostic Details: 深度诊断详情 */}
            <section className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {isEn ? "Diagnostic Metrics & Trait Analysis" : "认知指标与画像深度解析"}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {localizedReport.quadrant_code}
                </span>
              </div>

              {/* 4 Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEn ? "1st-Order Sensitivity d'" : "一阶敏感度 d'"}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-sky-400">
                    {dPrime.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isEn ? "Raw perceptual & task acuity" : "基础任务敏锐度与信息处理"}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEn ? "Metacog M-Ratio" : "元认知效率 M-Ratio"}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-purple-400">
                    {mRatio.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isEn ? "Type-2 self-monitoring leverage" : "二阶自省与置信度博弈效率"}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEn ? "Calibration Bias" : "校准偏差 Bias"}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400">
                    {biasSign}{bias.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {bias > 0.1
                      ? (isEn ? "Overconfidence tendency" : "偏向自信敢下注")
                      : bias < -0.1
                      ? (isEn ? "Conservative tendency" : "偏向谨慎保守防守")
                      : (isEn ? "Well-balanced calibration" : "知行合一客观自洽")}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEn ? "Task Accuracy" : "综合准确率"}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                    {Math.round(accuracy * 100)}%
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isEn ? "Psychophysical test accuracy" : "自适应阶梯收敛表现"}
                  </p>
                </div>
              </div>

              {/* Empowering Feedback Card */}
              {profile.empowering_feedback && (
                <div className="bg-gradient-to-r from-amber-950/20 via-slate-900/80 to-slate-900/60 border border-amber-500/20 rounded-2xl p-5 sm:p-6 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{isEn ? "Empowering Resonance" : "思维特质深度共鸣"}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {profile.empowering_feedback}
                  </p>
                </div>
              )}

              {/* 4 Innate Skills Breakdown */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>{isEn ? "Innate Cognitive Skills" : "专属四大正向特技"}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.skills.map((skill: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 rounded-xl p-4 border border-white/5 hover:border-amber-500/25 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{skill.icon || "✨"}</span>
                            <span className="font-bold text-xs sm:text-sm text-amber-200">
                              {skill.name}
                            </span>
                          </div>
                          {skill.type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {skill.type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                          {skill.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Growth Advice */}
              {profile.growth_advice && (
                <div className="bg-slate-900/40 rounded-2xl p-4 sm:p-5 border border-white/5 space-y-1">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>{isEn ? "Strategic Growth Blueprint" : "认知演进策略指南"}</span>
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {profile.growth_advice}
                  </p>
                </div>
              )}
            </section>

            {/* Bottom Final CTA Button */}
            <div className="py-6 text-center space-y-3">
              <button
                onClick={handleStartMyTest}
                type="button"
                className="px-8 py-3.5 rounded-2xl text-base font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 inline-flex items-center gap-2 transform hover:scale-105 transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>{isEn ? "Test My Metacognition Now" : "测测我的认知 · 开始评测"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-xs text-slate-500">
                {isEn
                  ? "No login required · Fast 3-minute scientific test"
                  : "免登录 · 3分钟极速自适应科学阶梯测评"}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部页脚 */}
      <footer className="border-t border-white/10 py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
          <a href="/" className="hover:text-amber-300 transition-colors">
            {isEn ? "Home" : "首页"}
          </a>
          <a href="/privacy" className="hover:text-amber-300 transition-colors">
            {isEn ? "Privacy Policy" : "隐私政策"}
          </a>
          <a href="/terms" className="hover:text-amber-300 transition-colors">
            {isEn ? "Terms of Service" : "用户协议"}
          </a>
          <a href="/admin" className="hover:text-amber-300 transition-colors">
            {isEn ? "Admin Portal" : "管理控制台"}
          </a>
        </div>
        <p>© {new Date().getFullYear()} Self-Test (思维星图). All rights reserved.</p>
      </footer>
    </div>
  );
};
