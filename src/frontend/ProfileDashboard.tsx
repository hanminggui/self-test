import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Compass,
  Sparkles,
  TrendingUp,
  Activity,
  Calendar,
  Award,
  ArrowLeft,
  ArrowRight,
  Share2,
  FileText,
  Clock,
  Target,
  Shield,
  Zap,
  BarChart2,
  Info,
  ExternalLink,
  Cpu,
  User as UserIcon,
  Filter,
  CheckCircle2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useUser } from "./contexts/UserContext";
import { useLocale } from "./contexts/LocaleContext";
import { LanguageToggle } from "./components/LanguageToggle";
import { UserNav } from "./components/auth/UserNav";
import { computeMultivariateColor, formatBias } from "./utils/manifoldUtils";
import { getOctantSectorConfigs } from "./constants/adminConstants";
import { getArchetypeDefinition } from "../backend/archetype_matrix";
import { PosterModal } from "./components/share/PosterModal";
import { ProfileSettings } from "./components/profile/ProfileSettings";
import type { SubjectPoint } from "./types/admin";

export const ProfileDashboard: React.FC = () => {
  const { user, loading: userLoading, openAuthModal } = useUser();
  const { locale, t } = useLocale();

  const [sessions, setSessions] = useState<SubjectPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Primary Section Tab: "history" (timeline & 4D manifold) vs "settings" (profile & privacy)
  const [activeTab, setActiveTab] = useState<"history" | "settings">(
    typeof window !== "undefined" && window.location.pathname.startsWith("/me/settings")
      ? "settings"
      : "history"
  );

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        if (window.location.pathname.startsWith("/me/settings")) {
          setActiveTab("settings");
        } else if (window.location.pathname === "/me" || window.location.pathname.startsWith("/me/")) {
          setActiveTab("history");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab: "history" | "settings") => {
    setActiveTab(tab);
    const targetPath = tab === "settings" ? "/me/settings" : "/me";
    if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
  };

  // Filter & sort states
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HUMAN" | "AGENT">("ALL");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [metricTab, setMetricTab] = useState<"ALL" | "ACCURACY" | "DISCRIMINATION" | "M_RATIO" | "BIAS">("ALL");

  // Interaction states
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [selectedSessionForPoster, setSelectedSessionForPoster] = useState<SubjectPoint | null>(null);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [fullReportData, setFullReportData] = useState<any | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  // Fetch personal sessions from /api/me/sessions
  const fetchSessions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/me/sessions?lang=${encodeURIComponent(locale)}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status === 401) {
        setError(t.profile?.loginPromptTitle || "请先登录");
      } else {
        setError("加载评测历史失败");
      }
    } catch {
      setError("网络请求异常，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }, [user, locale, t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Chronological sessions (oldest to newest for trajectory & trend lines)
  const chronologicalSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [sessions]);

  // Filtered & sorted sessions for timeline display
  const timelineSessions = useMemo(() => {
    let list = [...sessions];
    if (typeFilter === "HUMAN") {
      list = list.filter((s) => s.subject_type === "HUMAN" || !s.agent_metadata);
    } else if (typeFilter === "AGENT") {
      list = list.filter((s) => s.subject_type !== "HUMAN" || Boolean(s.agent_metadata));
    }
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "NEWEST" ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [sessions, typeFilter, sortOrder]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (sessions.length === 0) return null;
    const humanCount = sessions.filter((s) => s.subject_type === "HUMAN" && !s.agent_metadata).length;
    const agentCount = sessions.length - humanCount;

    const accSum = sessions.reduce((acc, s) => acc + (s.first_order_accuracy ?? s.metrics?.first_order_accuracy ?? 0), 0);
    const avgAcc = accSum / sessions.length;

    const dPrimeSum = sessions.reduce((acc, s) => acc + (s.d_prime ?? s.metrics?.d_prime ?? 0), 0);
    const avgDPrime = dPrimeSum / sessions.length;

    const mRatioSum = sessions.reduce((acc, s) => acc + (s.m_ratio ?? s.metrics?.m_ratio ?? 0), 0);
    const avgMRatio = mRatioSum / sessions.length;

    // Latest session
    const latest = chronologicalSessions[chronologicalSessions.length - 1];
    const latestBias = latest?.calibration_bias ?? latest?.metrics?.calibration_bias ?? 0;

    // Dominant Archetype
    const archetypeCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const code = s.quadrant_code || "Q1-CAL";
      archetypeCounts[code] = (archetypeCounts[code] || 0) + 1;
    });
    let dominantCode = "Q1-CAL";
    let maxCount = 0;
    Object.entries(archetypeCounts).forEach(([code, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantCode = code;
      }
    });
    const dominantDef = getArchetypeDefinition(dominantCode, locale);

    return {
      total: sessions.length,
      humanCount,
      agentCount,
      avgAccuracy: (avgAcc * 100).toFixed(1) + "%",
      avgDPrime: avgDPrime.toFixed(2),
      avgMRatio: avgMRatio.toFixed(2),
      latestBias: formatBias(Math.round(latestBias * 100) / 100),
      latestBiasNum: latestBias,
      dominantRole: dominantDef.role_title,
      dominantCode,
      dominantTagline: dominantDef.praise_tagline,
      latestSession: latest,
    };
  }, [sessions, chronologicalSessions, locale]);

  // Open Poster Modal for a specific session
  const handleOpenPoster = async (session: SubjectPoint) => {
    setSelectedSessionForPoster(session);
    setLoadingReportId(session.id);
    try {
      const res = await fetch(`/api/sessions/${session.id}/report?lang=${encodeURIComponent(locale)}`);
      if (res.ok) {
        const report = await res.json();
        setFullReportData(report);
      } else {
        // Fallback synthetic report
        const def = getArchetypeDefinition(session.quadrant_code || "Q1-CAL", locale);
        setFullReportData({
          session_id: session.id,
          subject_name: session.name || user?.display_name || "受测者",
          metrics: session.metrics,
          diagnostic_profile: {
            role_title: session.role_title || def.role_title,
            quadrant_code: session.quadrant_code || def.quadrant_code,
            praise_tagline: session.praise_tagline || def.praise_tagline,
            strength_tags: def.strength_tags,
            empowering_feedback: def.empowering_feedback,
            skills: def.skills,
          },
        });
      }
    } catch {
      const def = getArchetypeDefinition(session.quadrant_code || "Q1-CAL", locale);
      setFullReportData({
        session_id: session.id,
        subject_name: session.name || user?.display_name || "受测者",
        metrics: session.metrics,
        diagnostic_profile: {
          role_title: session.role_title || def.role_title,
          quadrant_code: session.quadrant_code || def.quadrant_code,
          praise_tagline: session.praise_tagline || def.praise_tagline,
          strength_tags: def.strength_tags,
          empowering_feedback: def.empowering_feedback,
          skills: def.skills,
        },
      });
    } finally {
      setLoadingReportId(null);
      setPosterModalOpen(true);
    }
  };

  // Navigate to /report/:id
  const handleViewReport = (sessionId: string) => {
    window.location.href = `/report/${sessionId}`;
  };

  // Return to test page
  const handleReturnToAssessment = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturnToAssessment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer"
            title={t.profile?.backToAssessment || "返回答题测试"}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.profile?.backToAssessment || "返回测试"}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                {t.profile?.title || "个人评测历史与认知流形轨迹"}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  /me
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <UserNav />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* State 1: Guest / Unauthenticated */}
        {!userLoading && !user && (
          <div className="w-full my-12 p-8 lg:p-12 rounded-3xl bg-white/[0.02] border border-white/10 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Compass className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                {t.profile?.loginPromptTitle || "请先登录以查看个人历史"}
              </h2>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {t.profile?.loginPromptDesc ||
                  "登录您的探索者账号即可跨设备永久留存评测成果与认知流形进化图谱。完全无需管理密码，即刻开启心智轨迹追踪。"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={openAuthModal}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>{t.profile?.signInBtn || "立即登录"}</span>
              </button>

              <button
                onClick={handleReturnToAssessment}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <span>{t.profile?.backToAssessment || "返回测试"}</span>
              </button>
            </div>
          </div>
        )}

        {/* State 2: User Authenticated */}
        {user && (
          <>
            {/* Sub-Navigation Tabs: History vs Settings */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("history")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "history"
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{t.profile?.tabHistory || "评测历史与流形"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("settings")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t.profile?.tabSettings || "个人资料与偏好"}</span>
                </button>
              </div>

              {activeTab === "history" && (
                <button
                  onClick={fetchSessions}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="刷新数据"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                  <span className="hidden sm:inline">刷新记录</span>
                </button>
              )}
            </div>

            {/* View Mode Switching */}
            {activeTab === "settings" ? (
              <ProfileSettings />
            ) : (
              <>
                {/* User Profile Header Card */}
            <div className="w-full p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/10 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-xl font-bold">
                    {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {user.display_name}
                    </h2>
                    <span className="capitalize text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                      {user.primary_provider}
                    </span>
                    {user.metadata?.trust_level !== undefined && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                        <Shield className="w-2.5 h-2.5" />
                        L{user.metadata.trust_level}
                      </span>
                    )}
                  </div>
                  {user.email && (
                    <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    {t.profile?.subtitle || "回顾历次二元认知探索历程，追踪相变突破度与元认知演化跃迁"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                <button
                  onClick={fetchSessions}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="刷新数据"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                  <span className="hidden sm:inline">刷新</span>
                </button>
              </div>
            </div>

            {/* Loading Skeleton */}
            {loading && sessions.length === 0 && (
              <div className="w-full p-12 text-center flex flex-col items-center justify-center space-y-4">
                <Compass className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400">正在检索云端认知档案与四维流形坐标...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* State 3: Empty State */}
            {!loading && sessions.length === 0 && !error && (
              <div className="w-full py-16 px-6 text-center rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {t.profile?.emptyTitle || "暂无历史评测记录"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    {t.profile?.emptyDesc ||
                      "完成一次二元认知评测后，您的测试结果与四维流形心智轨迹将自动在此呈现。"}
                  </p>
                </div>
                <button
                  onClick={handleReturnToAssessment}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>{t.profile?.startAssessmentBtn || "立即开启评测"}</span>
                </button>
              </div>
            )}

            {/* State 4: Has History */}
            {sessions.length > 0 && summaryStats && (
              <>
                {/* 1. Summary Metric KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statTotalSessions || "评测总场次"}</span>
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {summaryStats.total}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      人: {summaryStats.humanCount} · 智能体: {summaryStats.agentCount}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statMeanAccuracy || "平均准确率"}</span>
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-300">
                      {summaryStats.avgAccuracy}
                    </div>
                    <div className="text-[10px] text-slate-500">阶梯收敛 ~70%</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statMeanDPrime || "平均敏感度 d'"}</span>
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {summaryStats.avgDPrime}
                    </div>
                    <div className="text-[10px] text-slate-500">一阶感知辨别力</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statMeanMRatio || "元认知 M_ratio"}</span>
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-purple-300">
                      {summaryStats.avgMRatio}
                    </div>
                    <div className="text-[10px] text-slate-500">基准值 0.80</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statLatestBias || "最新偏向 Bias"}</span>
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div
                      className={`text-xl font-bold font-mono ${
                        summaryStats.latestBiasNum > 0.12
                          ? "text-rose-400"
                          : summaryStats.latestBiasNum < -0.12
                          ? "text-sky-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {summaryStats.latestBias}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {summaryStats.latestBiasNum > 0.12
                        ? "自信高估"
                        : summaryStats.latestBiasNum < -0.12
                        ? "审慎低估"
                        : "自洽平衡"}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{t.profile?.statDominantArchetype || "主导认知流派"}</span>
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-sm font-bold text-amber-300 truncate" title={summaryStats.dominantRole}>
                      {summaryStats.dominantRole}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {summaryStats.dominantCode}
                    </div>
                  </div>
                </div>

                {/* 2. Visual Manifold Trajectory & Evolution Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: 4D Manifold Trajectory Plot (Acceptance Criterion 4) */}
                  <div className="lg:col-span-7 p-6 rounded-3xl bg-white/[0.02] border border-white/10 shadow-xl backdrop-blur-md flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Compass className="w-4 h-4 text-cyan-400" />
                          <span>{t.profile?.trajectoryTitle || "4D 认知流形轨迹空间"}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {t.profile?.trajectorySubtitle ||
                            "纵览自我相变突破度 D* 与元认知效率 M_ratio 在相图空间中的演变脉络"}
                        </p>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span>{t.profile?.baselineNote || "基准: D*=0.60, M_ratio=0.80"}</span>
                      </div>
                    </div>

                    {/* SVG Manifold Trajectory Coordinate Plane */}
                    <div className="relative w-full h-[360px] select-none">
                      <ManifoldTrajectorySvg
                        sessions={chronologicalSessions}
                        hoveredId={hoveredPointId}
                        onHover={setHoveredPointId}
                        onSelectSession={handleOpenPoster}
                        locale={locale}
                      />
                    </div>

                    {/* Visual Channel Legend Bar */}
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-sans">色相 Hue (Bias 偏向):</span>
                        <div className="w-20 h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-rose-400" />
                        <span>谨慎 (-1.0) → 自洽 (0) → 自负 (+1.0)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-sans">饱和度/光晕 (IVE 杠杆):</span>
                        <div className="w-14 h-2 rounded-full bg-gradient-to-r from-slate-600 via-amber-500/70 to-amber-300" />
                        <span>内生 (0) → 高杠杆 (≥0.7)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Metric Evolution Charts (Acceptance Criterion 3) */}
                  <div className="lg:col-span-5 p-6 rounded-3xl bg-white/[0.02] border border-white/10 shadow-xl backdrop-blur-md flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                          <span>{t.profile?.evolutionTitle || "四维认知指标演化趋势"}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {t.profile?.evolutionSubtitle || "追踪准确率、相变敏感度、元认知与偏向随场次的动态演进"}
                        </p>
                      </div>
                    </div>

                    {/* Metric Selector Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
                      {(
                        [
                          { key: "ALL", label: t.profile?.tabAll || "全景" },
                          { key: "ACCURACY", label: t.profile?.tabAccuracy || "准确率" },
                          { key: "DISCRIMINATION", label: t.profile?.tabDiscrimination || "辨别力 d'" },
                          { key: "M_RATIO", label: t.profile?.tabMRatio || "元认知 M_ratio" },
                          { key: "BIAS", label: t.profile?.tabBias || "偏向 Bias" },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setMetricTab(tab.key)}
                          className={`flex-1 min-w-[60px] py-1 px-2 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer ${
                            metricTab === tab.key
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* SVG Line / Evolution Chart */}
                    <div className="relative w-full h-[320px] select-none">
                      <EvolutionLineChartSvg
                        sessions={chronologicalSessions}
                        tab={metricTab}
                        hoveredId={hoveredPointId}
                        onHover={setHoveredPointId}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Interactive Assessment History Timeline (Acceptance Criterion 2) */}
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 shadow-xl backdrop-blur-md space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span>{t.profile?.historyTitle || "历次评测时间轴"}</span>
                        <span className="text-xs font-mono text-slate-400 font-normal">
                          ({timelineSessions.length})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {t.profile?.timelineSubtitle || "按时间倒序排列的完整测评档案与四维认知指标"}
                      </p>
                    </div>

                    {/* Filter & Sort Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filter by Type */}
                      <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <button
                          onClick={() => setTypeFilter("ALL")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            typeFilter === "ALL" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {t.profile?.filterAll || "全部"}
                        </button>
                        <button
                          onClick={() => setTypeFilter("HUMAN")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            typeFilter === "HUMAN" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {t.profile?.filterHuman || "人类"}
                        </button>
                        <button
                          onClick={() => setTypeFilter("AGENT")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            typeFilter === "AGENT" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {t.profile?.filterAgent || "智能体"}
                        </button>
                      </div>

                      {/* Sort Order */}
                      <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <button
                          onClick={() => setSortOrder("NEWEST")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            sortOrder === "NEWEST" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {t.profile?.sortNewest || "最新优先"}
                        </button>
                        <button
                          onClick={() => setSortOrder("OLDEST")}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            sortOrder === "OLDEST" ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {t.profile?.sortOldest || "最早优先"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Cards Grid */}
                  <div className="space-y-3">
                    {timelineSessions.map((session, idx) => {
                      const quadrantCode = session.quadrant_code || "Q1-CAL";
                      const archetypeDef = getArchetypeDefinition(quadrantCode, locale);
                      const isHuman = session.subject_type === "HUMAN" && !session.agent_metadata;
                      const dateStr = session.created_at
                        ? new Date(session.created_at).toLocaleString(locale, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--";

                      const isHovered = hoveredPointId === session.id;

                      const firstAcc = session.first_order_accuracy ?? session.metrics?.first_order_accuracy ?? 0;
                      const dPrime = session.d_prime ?? session.metrics?.d_prime ?? 0;
                      const mRatio = session.m_ratio ?? session.metrics?.m_ratio ?? 0;
                      const bias = session.calibration_bias ?? session.metrics?.calibration_bias ?? 0;
                      const ive = session.ive ?? session.metrics?.ive ?? 0.5;

                      const visualToken = computeMultivariateColor(bias, ive);

                      return (
                        <div
                          key={session.id}
                          onMouseEnter={() => setHoveredPointId(session.id)}
                          onMouseLeave={() => setHoveredPointId(null)}
                          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                            isHovered
                              ? "bg-indigo-950/30 border-indigo-400/50 shadow-lg shadow-indigo-500/10"
                              : "bg-white/[0.02] border-white/5 hover:border-white/15"
                          }`}
                        >
                          {/* Left: Index, Role Title, Date, Subject Type */}
                          <div className="flex items-center gap-3.5 min-w-[220px]">
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                              #{sortOrder === "NEWEST" ? timelineSessions.length - idx : idx + 1}
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {session.role_title || archetypeDef.role_title}
                                </span>
                                <span
                                  className="text-[10px] font-mono px-2 py-0.2 rounded-full border"
                                  style={{
                                    backgroundColor: visualToken.backgroundColor,
                                    borderColor: visualToken.borderColor,
                                  }}
                                >
                                  {quadrantCode}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>{dateStr}</span>
                                <span>·</span>
                                {isHuman ? (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <UserIcon className="w-3 h-3 text-slate-500" />
                                    <span>人类受测</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-cyan-400 font-mono">
                                    <Cpu className="w-3 h-3" />
                                    <span>
                                      {session.agent_metadata?.model_name || "Agent"}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle: 4D Metrics Badges */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full md:w-auto font-mono text-xs">
                            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[9px] text-slate-400 font-sans">准确率</div>
                              <div className="font-bold text-emerald-300">
                                {(firstAcc * 100).toFixed(1)}%
                              </div>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[9px] text-slate-400 font-sans">辨别力 d'</div>
                              <div className="font-bold text-cyan-300">{dPrime.toFixed(2)}</div>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[9px] text-slate-400 font-sans">M_ratio</div>
                              <div className="font-bold text-purple-300">{mRatio.toFixed(2)}</div>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[9px] text-slate-400 font-sans">Bias</div>
                              <div
                                className={`font-bold ${
                                  bias > 0.12 ? "text-rose-400" : bias < -0.12 ? "text-sky-400" : "text-emerald-400"
                                }`}
                              >
                                {formatBias(Math.round(bias * 100) / 100)}
                              </div>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-center">
                              <div className="text-[9px] text-slate-400 font-sans">IVE 杠杆</div>
                              <div className="font-bold text-amber-300">{ive.toFixed(2)}</div>
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            <button
                              onClick={() => handleOpenPoster(session)}
                              disabled={loadingReportId === session.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
                              title={t.profile?.shareCard || "生成分享名片"}
                            >
                              <Share2 className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">{t.profile?.shareCard || "分享名片"}</span>
                            </button>

                            <button
                              onClick={() => handleViewReport(session.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-xs font-medium text-white transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
                              title={t.profile?.viewReport || "查看完整画像报告"}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{t.profile?.viewReport || "报告"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
              </>
            )}
          </>
        )}
      </main>

      {/* Share Poster Modal */}
      {posterModalOpen && (
        <PosterModal
          isOpen={posterModalOpen}
          report={fullReportData}
          locale={locale}
          entryUrl={
            selectedSessionForPoster
              ? `${window.location.origin}/report/${selectedSessionForPoster.id}`
              : window.location.origin
          }
          onClose={() => {
            setPosterModalOpen(false);
            setSelectedSessionForPoster(null);
            setFullReportData(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * 4D Cognitive Manifold Trajectory SVG Plane
 * X-axis: Phase breakthrough D* (0.0 ~ 1.0)
 * Y-axis: Metacognitive efficiency M_ratio (0.0 ~ 2.0+)
 * Hue: Calibration Bias (-1.0 to +1.0)
 * Outer Glow: IVE (0.0 to 1.0)
 * Directional line connecting runs #1 -> #2 -> ... -> #N
 */
interface ManifoldTrajectorySvgProps {
  sessions: SubjectPoint[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelectSession: (session: SubjectPoint) => void;
  locale: string;
}

const ManifoldTrajectorySvg: React.FC<ManifoldTrajectorySvgProps> = ({
  sessions,
  hoveredId,
  onHover,
  onSelectSession,
  locale,
}) => {
  const width = 640;
  const height = 340;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 34;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Coordinate scales
  // X: d_star from 0.0 to 1.0
  const getX = (dStar: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, dStar));
    return padLeft + clamped * plotWidth;
  };

  // Y: m_ratio from 0.0 to 2.0
  const getY = (mRatio: number) => {
    const clamped = Math.max(0.0, Math.min(2.0, mRatio));
    return padTop + (1.0 - clamped / 2.0) * plotHeight;
  };

  // Reference lines
  const baselineX = getX(0.6);
  const baselineY = getY(0.8);

  // Build path connecting points in chronological order
  const pathD = useMemo(() => {
    if (sessions.length < 2) return "";
    return sessions
      .map((s, idx) => {
        const x = getX(s.d_star ?? s.metrics?.d_star ?? 0.5);
        const y = getY(s.m_ratio ?? s.metrics?.m_ratio ?? 0.8);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [sessions, plotWidth, plotHeight]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full overflow-visible"
    >
      <defs>
        {/* Trajectory arrow marker */}
        <marker
          id="trajectory-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" opacity="0.8" />
        </marker>

        {/* Trajectory line gradient */}
        <linearGradient id="trajectory-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
        </linearGradient>

        {/* Pulsing ring filter */}
        <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background Quadrant Shading */}
      {/* Q1: Upper-Right (D* >= 0.60, M_ratio >= 0.80) */}
      <rect
        x={baselineX}
        y={padTop}
        width={padLeft + plotWidth - baselineX}
        height={baselineY - padTop}
        fill="#10b981"
        fillOpacity="0.04"
      />
      {/* Q2: Lower-Right (D* >= 0.60, M_ratio < 0.80) */}
      <rect
        x={baselineX}
        y={baselineY}
        width={padLeft + plotWidth - baselineX}
        height={padTop + plotHeight - baselineY}
        fill="#f59e0b"
        fillOpacity="0.03"
      />
      {/* Q3: Upper-Left (D* < 0.60, M_ratio >= 0.80) */}
      <rect
        x={padLeft}
        y={padTop}
        width={baselineX - padLeft}
        height={baselineY - padTop}
        fill="#6366f1"
        fillOpacity="0.03"
      />
      {/* Q4: Lower-Left (D* < 0.60, M_ratio < 0.80) */}
      <rect
        x={padLeft}
        y={baselineY}
        width={baselineX - padLeft}
        height={padTop + plotHeight - baselineY}
        fill="#64748b"
        fillOpacity="0.02"
      />

      {/* Quadrant Zone Labels */}
      <text
        x={padLeft + plotWidth - 6}
        y={padTop + 14}
        textAnchor="end"
        className="fill-emerald-400/40 text-[9px] font-mono tracking-widest font-bold"
      >
        Q1 · 真知 (VERITAS)
      </text>
      <text
        x={padLeft + plotWidth - 6}
        y={padTop + plotHeight - 8}
        textAnchor="end"
        className="fill-amber-400/40 text-[9px] font-mono tracking-widest font-bold"
      >
        Q2 · 洞见 (VISIONARY)
      </text>
      <text
        x={padLeft + 6}
        y={padTop + 14}
        textAnchor="start"
        className="fill-indigo-400/40 text-[9px] font-mono tracking-widest font-bold"
      >
        Q3 · 守御 (DEFENDER)
      </text>
      <text
        x={padLeft + 6}
        y={padTop + plotHeight - 8}
        textAnchor="start"
        className="fill-slate-500/40 text-[9px] font-mono tracking-widest font-bold"
      >
        Q4 · 混沌 (CHAOS)
      </text>

      {/* Grid Lines */}
      {[0.0, 0.5, 1.0, 1.5, 2.0].map((val) => {
        const y = getY(val);
        return (
          <g key={`y-${val}`}>
            <line
              x1={padLeft}
              y1={y}
              x2={padLeft + plotWidth}
              y2={y}
              stroke="#ffffff"
              strokeOpacity="0.06"
              strokeDasharray="2,2"
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-500 text-[9px] font-mono"
            >
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {[0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
        const x = getX(val);
        return (
          <g key={`x-${val}`}>
            <line
              x1={x}
              y1={padTop}
              x2={x}
              y2={padTop + plotHeight}
              stroke="#ffffff"
              strokeOpacity="0.06"
              strokeDasharray="2,2"
            />
            <text
              x={x}
              y={padTop + plotHeight + 14}
              textAnchor="middle"
              className="fill-slate-500 text-[9px] font-mono"
            >
              {val.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Baseline Reference Lines */}
      <line
        x1={baselineX}
        y1={padTop}
        x2={baselineX}
        y2={padTop + plotHeight}
        stroke="#38bdf8"
        strokeOpacity="0.4"
        strokeDasharray="4,3"
        strokeWidth="1.2"
      />
      <line
        x1={padLeft}
        y1={baselineY}
        x2={padLeft + plotWidth}
        y2={baselineY}
        stroke="#c084fc"
        strokeOpacity="0.4"
        strokeDasharray="4,3"
        strokeWidth="1.2"
      />

      {/* Axis Titles */}
      <text
        x={padLeft + plotWidth / 2}
        y={padTop + plotHeight + 28}
        textAnchor="middle"
        className="fill-slate-400 text-[9px] font-mono font-medium tracking-wider"
      >
        相变突破度 D* (PHASE BREAKTHROUGH)
      </text>
      <text
        x={12}
        y={padTop + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${padTop + plotHeight / 2})`}
        className="fill-slate-400 text-[9px] font-mono font-medium tracking-wider"
      >
        元认知效率 M_ratio
      </text>

      {/* Directional Trajectory Line */}
      {pathD && (
        <>
          <path
            d={pathD}
            fill="none"
            stroke="url(#trajectory-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#trajectory-arrow)"
          />
          {/* Subtle line glow */}
          <path
            d={pathD}
            fill="none"
            stroke="#818cf8"
            strokeWidth="6"
            strokeOpacity="0.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Points along trajectory */}
      {sessions.map((s, idx) => {
        const dStar = s.d_star ?? s.metrics?.d_star ?? 0.5;
        const mRatio = s.m_ratio ?? s.metrics?.m_ratio ?? 0.8;
        const bias = s.calibration_bias ?? s.metrics?.calibration_bias ?? 0.0;
        const ive = s.ive ?? s.metrics?.ive ?? 0.5;

        const x = getX(dStar);
        const y = getY(mRatio);
        const isHovered = hoveredId === s.id;
        const isLatest = idx === sessions.length - 1;

        const token = computeMultivariateColor(bias, ive);

        return (
          <g
            key={s.id}
            className="cursor-pointer transition-transform duration-150"
            onMouseEnter={() => onHover(s.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelectSession(s)}
          >
            {/* Outer pulsating aura for latest run */}
            {isLatest && (
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="3,2"
                className="animate-spin"
                style={{ transformOrigin: `${x}px ${y}px`, animationDuration: "8s" }}
              />
            )}

            {/* Hover ring */}
            {isHovered && (
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
            )}

            {/* Core Point Circle */}
            <circle
              cx={x}
              cy={y}
              r={isHovered ? 9 : isLatest ? 7.5 : 6}
              fill={token.backgroundColor}
              stroke={isHovered ? "#ffffff" : token.borderColor}
              strokeWidth={isHovered ? 2.5 : 1.5}
              style={{
                boxShadow: token.boxShadow,
                filter: ive >= 0.7 ? "url(#glow-filter)" : undefined,
              }}
            />

            {/* Run Number Label */}
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              className="fill-white text-[8px] font-mono font-bold pointer-events-none"
            >
              {idx + 1}
            </text>

            {/* Hover Tooltip Overlay */}
            {isHovered && (
              <g transform={`translate(${x > width - 140 ? x - 130 : x + 12}, ${y > height - 80 ? y - 60 : y - 20})`}>
                <rect
                  width="120"
                  height="72"
                  rx="8"
                  fill="#090d16"
                  stroke="#818cf8"
                  strokeWidth="1"
                  fillOpacity="0.95"
                  className="shadow-2xl"
                />
                <text x="8" y="16" className="fill-white text-[10px] font-bold">
                  Run #{idx + 1} · {s.role_title || s.quadrant_code}
                </text>
                <text x="8" y="30" className="fill-slate-400 text-[9px] font-mono">
                  D*: <tspan className="fill-cyan-300 font-bold">{dStar.toFixed(2)}</tspan> · M:{" "}
                  <tspan className="fill-purple-300 font-bold">{mRatio.toFixed(2)}</tspan>
                </text>
                <text x="8" y="44" className="fill-slate-400 text-[9px] font-mono">
                  Bias:{" "}
                  <tspan className={bias > 0.12 ? "fill-rose-300" : bias < -0.12 ? "fill-sky-300" : "fill-emerald-300"}>
                    {formatBias(Math.round(bias * 100) / 100)}
                  </tspan>
                </text>
                <text x="8" y="58" className="fill-slate-400 text-[9px] font-mono">
                  IVE: <tspan className="fill-amber-300 font-bold">{ive.toFixed(2)}</tspan>
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Metric Evolution Multi-Series Time-Series SVG Chart
 * Shows dynamic evolution of accuracy, d', M_ratio, and bias across runs
 */
interface EvolutionLineChartSvgProps {
  sessions: SubjectPoint[];
  tab: "ALL" | "ACCURACY" | "DISCRIMINATION" | "M_RATIO" | "BIAS";
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

const EvolutionLineChartSvg: React.FC<EvolutionLineChartSvgProps> = ({
  sessions,
  tab,
  hoveredId,
  onHover,
}) => {
  const width = 500;
  const height = 300;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const count = sessions.length;
  const getX = (idx: number) => {
    if (count <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (count - 1)) * plotWidth;
  };

  // Determine series configurations based on active tab
  const seriesConfig = useMemo(() => {
    if (tab === "ACCURACY") {
      return [
        {
          key: "first_acc",
          name: "首次答题准确率",
          color: "#10b981",
          min: 0.0,
          max: 1.0,
          getValue: (s: SubjectPoint) => s.first_order_accuracy ?? s.metrics?.first_order_accuracy ?? 0.7,
          format: (v: number) => (v * 100).toFixed(0) + "%",
          refVal: 0.7,
          refColor: "#10b981",
        },
        {
          key: "second_acc",
          name: "次级判断准确率",
          color: "#38bdf8",
          min: 0.0,
          max: 1.0,
          getValue: (s: SubjectPoint) => s.second_order_accuracy ?? s.metrics?.second_order_accuracy ?? 0.7,
          format: (v: number) => (v * 100).toFixed(0) + "%",
        },
      ];
    }
    if (tab === "DISCRIMINATION") {
      return [
        {
          key: "d_prime",
          name: "相变敏感度 d'",
          color: "#38bdf8",
          min: 0.0,
          max: 3.0,
          getValue: (s: SubjectPoint) => s.d_prime ?? s.metrics?.d_prime ?? 1.2,
          format: (v: number) => v.toFixed(2),
          refVal: 1.0,
          refColor: "#38bdf8",
        },
        {
          key: "d_star",
          name: "突破度 D*",
          color: "#818cf8",
          min: 0.0,
          max: 1.0,
          getValue: (s: SubjectPoint) => s.d_star ?? s.metrics?.d_star ?? 0.5,
          format: (v: number) => v.toFixed(2),
          refVal: 0.6,
          refColor: "#818cf8",
        },
      ];
    }
    if (tab === "M_RATIO") {
      return [
        {
          key: "m_ratio",
          name: "元认知效率 M_ratio",
          color: "#c084fc",
          min: 0.0,
          max: 2.0,
          getValue: (s: SubjectPoint) => s.m_ratio ?? s.metrics?.m_ratio ?? 0.9,
          format: (v: number) => v.toFixed(2),
          refVal: 0.8,
          refColor: "#c084fc",
        },
      ];
    }
    if (tab === "BIAS") {
      return [
        {
          key: "bias",
          name: "置信偏向 Bias",
          color: "#fbbf24",
          min: -0.6,
          max: 0.6,
          getValue: (s: SubjectPoint) => s.calibration_bias ?? s.metrics?.calibration_bias ?? 0.0,
          format: (v: number) => formatBias(Math.round(v * 100) / 100),
          refVal: 0.0,
          refColor: "#10b981",
        },
      ];
    }

    // ALL (Normalized 4-Series Multi-Trace)
    return [
      {
        key: "acc",
        name: "准确率",
        color: "#10b981",
        min: 0.0,
        max: 1.0,
        getValue: (s: SubjectPoint) => s.first_order_accuracy ?? s.metrics?.first_order_accuracy ?? 0.7,
        format: (v: number) => (v * 100).toFixed(0) + "%",
      },
      {
        key: "d_prime",
        name: "辨别力 d'",
        color: "#38bdf8",
        min: 0.0,
        max: 3.0,
        getValue: (s: SubjectPoint) => s.d_prime ?? s.metrics?.d_prime ?? 1.2,
        format: (v: number) => v.toFixed(2),
      },
      {
        key: "m_ratio",
        name: "元认知 M_ratio",
        color: "#c084fc",
        min: 0.0,
        max: 2.0,
        getValue: (s: SubjectPoint) => s.m_ratio ?? s.metrics?.m_ratio ?? 0.9,
        format: (v: number) => v.toFixed(2),
      },
      {
        key: "bias",
        name: "偏向 Bias",
        color: "#fbbf24",
        min: -0.6,
        max: 0.6,
        getValue: (s: SubjectPoint) => s.calibration_bias ?? s.metrics?.calibration_bias ?? 0.0,
        format: (v: number) => formatBias(Math.round(v * 100) / 100),
      },
    ];
  }, [tab]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {/* Background Grid */}
      {[0.0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
        const y = padTop + frac * plotHeight;
        return (
          <line
            key={`grid-y-${frac}`}
            x1={padLeft}
            y1={y}
            x2={padLeft + plotWidth}
            y2={y}
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeDasharray="2,2"
          />
        );
      })}

      {/* X Axis Run Ticks */}
      {sessions.map((_, idx) => {
        const x = getX(idx);
        return (
          <g key={`tick-x-${idx}`}>
            <line
              x1={x}
              y1={padTop + plotHeight}
              x2={x}
              y2={padTop + plotHeight + 4}
              stroke="#ffffff"
              strokeOpacity="0.2"
            />
            <text
              x={x}
              y={padTop + plotHeight + 16}
              textAnchor="middle"
              className="fill-slate-500 text-[9px] font-mono"
            >
              #{idx + 1}
            </text>
          </g>
        );
      })}

      {/* Render Each Series Line */}
      {seriesConfig.map((series) => {
        const points = sessions.map((s, idx) => {
          const val = series.getValue(s);
          const clamped = Math.max(series.min, Math.min(series.max, val));
          const frac = (clamped - series.min) / (series.max - series.min || 1);
          const x = getX(idx);
          const y = padTop + (1.0 - frac) * plotHeight;
          return { x, y, val, id: s.id, session: s };
        });

        const lineD = points
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");

        // Reference line if defined
        let refY: number | null = null;
        if (series.refVal !== undefined) {
          const refFrac = (series.refVal - series.min) / (series.max - series.min || 1);
          refY = padTop + (1.0 - refFrac) * plotHeight;
        }

        return (
          <g key={series.key}>
            {refY !== null && (
              <g>
                <line
                  x1={padLeft}
                  y1={refY}
                  x2={padLeft + plotWidth}
                  y2={refY}
                  stroke={series.refColor || series.color}
                  strokeOpacity="0.4"
                  strokeDasharray="3,3"
                />
                <text
                  x={padLeft + 4}
                  y={refY - 3}
                  className="fill-slate-400 text-[8px] font-mono"
                >
                  基准: {series.refVal}
                </text>
              </g>
            )}

            {/* Line Path */}
            <path
              d={lineD}
              fill="none"
              stroke={series.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Dots */}
            {points.map((p, idx) => {
              const isHovered = hoveredId === p.id;
              return (
                <circle
                  key={`dot-${series.key}-${p.id}-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? "#ffffff" : series.color}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => onHover(p.id)}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
          </g>
        );
      })}

      {/* Series Legend at Top */}
      <g transform={`translate(${padLeft + 4}, ${padTop - 8})`}>
        {seriesConfig.map((series, idx) => {
          return (
            <g key={`leg-${series.key}`} transform={`translate(${idx * 110}, 0)`}>
              <circle cx="4" cy="-4" r="3" fill={series.color} />
              <text x="12" y="-1" className="fill-slate-300 text-[9px] font-mono">
                {series.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default ProfileDashboard;
