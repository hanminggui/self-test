import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Sliders,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  Eye,
  Copy,
  Check,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Brain,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  Compass,
  Sun,
  Moon,
} from "lucide-react";
import {
  AestheticSessionData,
  AestheticTheme,
  computeAestheticParameters,
  generateAestheticSvg,
} from "../utils/aestheticEngine";

interface AestheticAuditPageProps {
  onNavigate?: (path: string) => void;
}

export const AestheticAuditPage: React.FC<AestheticAuditPageProps> = ({ onNavigate }) => {
  const [sessions, setSessions] = useState<AestheticSessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and sorts
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "LLM_AGENT" | "HUMAN">("ALL");
  const [sortBy, setSortBy] = useState<"created" | "m_ratio" | "bias" | "d_prime" | "accuracy" | "trials">("created");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // UI state
  const [showPlanDetails, setShowPlanDetails] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<AestheticSessionData | null>(null);
  const [previewMode, setPreviewMode] = useState<"art" | "page-bg">("art");
  const [previewTheme, setPreviewTheme] = useState<AestheticTheme>("dark");
  const [copiedType, setCopiedType] = useState<"svg" | "css" | null>(null);

  // Fetch real master sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/aesthetic/sessions");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err: any) {
        setError(err.message || "Failed to load session history");
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  // Filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (typeFilter !== "ALL" && s.subject_type !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = s.subject_name.toLowerCase().includes(q);
          const matchesId = s.id.toLowerCase().includes(q);
          return matchesName || matchesId;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortBy === "created") {
          valA = new Date(a.created_at).getTime() || 0;
          valB = new Date(b.created_at).getTime() || 0;
        } else if (sortBy === "m_ratio") {
          valA = a.metrics.m_ratio;
          valB = b.metrics.m_ratio;
        } else if (sortBy === "bias") {
          valA = a.metrics.calibration_bias;
          valB = b.metrics.calibration_bias;
        } else if (sortBy === "d_prime") {
          valA = a.metrics.d_prime;
          valB = b.metrics.d_prime;
        } else if (sortBy === "accuracy") {
          valA = a.metrics.first_order_accuracy;
          valB = b.metrics.first_order_accuracy;
        } else if (sortBy === "trials") {
          valA = a.trials?.length || a.metrics.total_trials || 0;
          valB = b.trials?.length || b.metrics.total_trials || 0;
        }
        return sortOrder === "desc" ? valB - valA : valA - valB;
      });
  }, [sessions, searchQuery, typeFilter, sortBy, sortOrder]);

  const selectedParams = useMemo(() => {
    if (!selectedSession) return null;
    return computeAestheticParameters(selectedSession, 800, 800, {
      theme: previewTheme,
      surface: previewMode === "page-bg" ? "ambient" : "artifact",
    });
  }, [selectedSession, previewTheme, previewMode]);

  const handleCopySvg = async (s: AestheticSessionData) => {
    const svg = generateAestheticSvg(s, 1000, {
      theme: previewTheme,
      surface: previewMode === "page-bg" ? "ambient" : "artifact",
    });
    await navigator.clipboard.writeText(svg);
    setCopiedType("svg");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCss = async (s: AestheticSessionData) => {
    const svg = generateAestheticSvg(s, 1000, {
      theme: previewTheme,
      surface: "ambient",
      showHud: false,
    });
    const encoded = encodeURIComponent(svg);
    const css = `background-image: url("data:image/svg+xml,${encoded}");\nbackground-size: cover;\nbackground-position: center;`;
    await navigator.clipboard.writeText(css);
    setCopiedType("css");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadSvg = (s: AestheticSessionData) => {
    const svg = generateAestheticSvg(s, 1000, {
      theme: previewTheme,
      surface: previewMode === "page-bg" ? "ambient" : "artifact",
    });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cognitive-manifold-${s.id}-${previewTheme}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans p-4 sm:p-8">
      {/* ================= HEADER ================= */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate("/") : (window.location.href = "/"))}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
            title="返回首页"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                计算美学审核面板 · Cognitive Manifold Gallery
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              基于平滑 Catmull-Rom 三次样条、Simplex 谐波等高线与双主题感知色域，实时渲染连续认知流形
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/15 text-xs">
            <button
              type="button"
              onClick={() => setPreviewTheme("dark")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                previewTheme === "dark" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>深空暗域</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTheme("light")}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                previewTheme === "light" ? "bg-amber-400 text-stone-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>暖纸浅域</span>
            </button>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-300 font-mono">
            {loading ? "正在加载 Master 数据..." : `已加载 ${sessions.length} 个真实历史样本`}
          </div>
        </div>
      </header>

      {/* ================= PLANNING SPECIFICATION COLLAPSIBLE ================= */}
      <section className="max-w-7xl mx-auto mb-8 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-md overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPlanDetails(!showPlanDetails)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-slate-200">
              数据维度规划方案：从宏观认知指标到微观试次时序的连续映射矩阵
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{showPlanDetails ? "收起规划" : "查看 12 维计算美学规划"}</span>
            {showPlanDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showPlanDetails && (
          <div className="p-6 pt-2 border-t border-white/10 text-xs space-y-4 leading-relaxed text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Macro Dimensions */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>第一层：宏观结果级数据维度（Macro Aggregates）</span>
                </div>
                <ul className="space-y-1.5 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Calibration Bias (校准偏差)</strong>: 映射为
                    <strong>色彩核心基准色相 (Base Hue)</strong>。从过度谨慎的深靛幽蓝 (240°)，到零偏差的极光青 (175°)，再到过度自信的暖金烈红 (30°)。
                  </li>
                  <li>
                    <strong className="text-slate-200">M-Ratio (元认知觉察效率)</strong>: 映射为
                    <strong>流场谐波秩序 vs 熵增混沌 (Harmonic Order)</strong>。高倍率呈现完美分层谐波，低倍率呈现非对称涡流扰动。
                  </li>
                  <li>
                    <strong className="text-slate-200">d' (感知敏感度)</strong>: 映射为
                    <strong>纹理采样频率与线条细密径 (Frequency & Density)</strong>。高敏锐度生成高频精细网格。
                  </li>
                  <li>
                    <strong className="text-slate-200">Accuracy & Brier Score</strong>: 映射为
                    <strong>色彩通透纯度与饱和度 (Chroma & Lightness)</strong>。精准度越高，色彩越明亮通透。
                  </li>
                </ul>
              </div>

              {/* Micro Dimensions */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="font-bold text-pink-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>第二层：微观试次时序维度（Micro Trial Trajectory）</span>
                </div>
                <ul className="space-y-1.5 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Trial Constellation (时序星轨)</strong>: 每一个 trial 直接渲染为极坐标中的实体星图节点，全量试次通过张力样条连成<strong>“思维心流星轨”</strong>。
                  </li>
                  <li>
                    <strong className="text-slate-200">Difficulty Orbit (难度轨道)</strong>: 节点极径受试题难度扩张。越难的题目越逼近认知视界外沿。
                  </li>
                  <li>
                    <strong className="text-slate-200">Confidence Pulse (置信度光晕)</strong>: 节点大小与光芒强度受该题置信度驱动；购买提示产生星芒微标。
                  </li>
                  <li>
                    <strong className="text-slate-200">Duration & Hesitation (反应耗时谱)</strong>: 思考耗时影响星体密度与波动湍流尺度。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================= CONTROLS & FILTER BAR ================= */}
      <section className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索模型名或 Session ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/15 focus:border-indigo-400 outline-none text-xs w-56"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            {(["ALL", "LLM_AGENT", "HUMAN"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-medium ${
                  typeFilter === t ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "ALL" ? "全部" : t === "LLM_AGENT" ? "AI 模型" : "人类探索者"}
              </button>
            ))}
          </div>
        </div>

        {/* Sorters */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">排序依据:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value="created">时间 (最新)</option>
            <option value="m_ratio">M-Ratio (自洽觉察度)</option>
            <option value="bias">Calibration Bias (校准偏差)</option>
            <option value="d_prime">d' (感知敏感度)</option>
            <option value="accuracy">准确率</option>
            <option value="trials">试次数目 (多到少)</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs hover:bg-white/10 transition cursor-pointer"
          >
            {sortOrder === "desc" ? "降序 ↓" : "升序 ↑"}
          </button>
        </div>
      </section>

      {/* ================= SAMPLES GALLERY GRID ================= */}
      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto" />
            <div className="text-sm text-slate-400">正在分析 master 历史试次与计算美学流形...</div>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center">
            {error}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-20 text-center text-slate-400">无匹配的历史测试记录</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSessions.map((session) => {
              const svgCode = generateAestheticSvg(session, 400, {
                theme: previewTheme,
                surface: "artifact",
                showHud: false,
              });
              const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgCode)}`;
              const m = session.metrics;

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="group rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-400/60 overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  {/* Generated Visual Manifold Preview */}
                  <div className="relative aspect-square w-full overflow-hidden bg-black/60">
                    <img
                      src={dataUrl}
                      alt={session.subject_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                      {session.subject_type === "LLM_AGENT" ? "AI 评测" : "人类"}
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-indigo-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{session.trials?.length || m.total_trials} 题星轨</span>
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-bold text-sm text-slate-100 truncate group-hover:text-indigo-300 transition">
                        {session.subject_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{session.id}</div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-[10px] font-mono text-center">
                      <div className="p-1.5 rounded-lg bg-black/40">
                        <div className="text-slate-400">M-Ratio</div>
                        <div className="font-bold text-emerald-400">{m.m_ratio.toFixed(2)}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-black/40">
                        <div className="text-slate-400">Bias</div>
                        <div
                          className={`font-bold ${
                            m.calibration_bias > 0.1
                              ? "text-amber-400"
                              : m.calibration_bias < -0.1
                              ? "text-sky-400"
                              : "text-slate-200"
                          }`}
                        >
                          {m.calibration_bias > 0 ? `+${m.calibration_bias.toFixed(2)}` : m.calibration_bias.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-black/40">
                        <div className="text-slate-400">d'</div>
                        <div className="font-bold text-indigo-400">{m.d_prime.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ================= DETAIL INSPECTION MODAL ================= */}
      {selectedSession && selectedParams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/20 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{selectedSession.subject_name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                    {selectedSession.id}
                  </span>
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  完成时间: {selectedSession.created_at} · 试次总数: {selectedParams.totalTrials}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-sm"
              >
                ✕ 关闭
              </button>
            </div>

            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left: Rendered Visual Art / Page Background Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">生成效果实景</span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("art")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        previewMode === "art" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      纯矢量流形
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("page-bg")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        previewMode === "page-bg" ? "bg-indigo-600 text-white" : "text-slate-400"
                      }`}
                    >
                      页面背景覆盖实景
                    </button>
                  </div>
                </div>

                <div
                  className={`relative aspect-square rounded-2xl overflow-hidden border shadow-2xl flex items-center justify-center ${
                    previewTheme === "light"
                      ? "bg-[#FFFDF8] border-stone-900/20"
                      : "bg-[#08080C] border-white/10"
                  }`}
                >
                  <img
                    src={`data:image/svg+xml,${encodeURIComponent(
                      generateAestheticSvg(selectedSession, 800, {
                        theme: previewTheme,
                        surface: previewMode === "page-bg" ? "ambient" : "artifact",
                        showHud: previewMode !== "page-bg",
                      })
                    )}`}
                    alt="Manifold"
                    className="w-full h-full object-cover"
                  />

                  {previewMode === "page-bg" && (
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <div
                        className={`p-4 rounded-2xl border-2 text-xs ${
                          previewTheme === "light"
                            ? "bg-white/95 border-stone-900 text-stone-900 shadow-[0_4px_0_#1c1917]"
                            : "bg-[#0E0E16]/90 border-white/20 text-slate-200 shadow-[4px_4px_0px_#CCFF00]"
                        }`}
                      >
                        <div
                          className={`font-black text-sm mb-1 ${
                            previewTheme === "light" ? "text-stone-900" : "text-[#CCFF00]"
                          }`}
                        >
                          元认知评估报告卡片
                        </div>
                        低对比度计算美学背景层由该用户的 {selectedParams.totalTrials} 题轨迹生成，前景正文保持高可读对比度。
                      </div>
                      <div
                        className={`p-4 rounded-2xl border-2 flex items-center justify-between text-xs font-bold ${
                          previewTheme === "light"
                            ? "bg-[#FFFBEB]/95 border-stone-900 text-stone-900 shadow-[0_4px_0_#1c1917]"
                            : "bg-[#12121C]/90 border-white/20 text-white shadow-[3px_3px_0px_#38BDF8]"
                        }`}
                      >
                        <span>CCS 综合评分: {selectedSession.metrics.final_score}</span>
                        <span
                          className={`font-mono font-black ${
                            previewTheme === "light" ? "text-emerald-700" : "text-[#CCFF00]"
                          }`}
                        >
                          M-Ratio: {selectedSession.metrics.m_ratio.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopySvg(selectedSession)}
                    className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedType === "svg" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedType === "svg" ? "已复制 SVG" : "复制 SVG 源码"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCss(selectedSession)}
                    className="flex-1 min-w-[120px] py-2.5 rounded-xl border border-white/20 hover:bg-white/10 font-bold text-xs text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedType === "css" ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                    {copiedType === "css" ? "已复制 CSS" : "复制 CSS Data URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSvg(selectedSession)}
                    className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 font-bold text-xs text-white transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    下载 .svg
                  </button>
                </div>
              </div>

              {/* Right: Data Breakdown & Trail Track */}
              <div className="space-y-5 text-xs">
                {/* Visual Parameters Output */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>美学算法映射产出参数 (Generated Parameters)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400">基准色相 (Base Hue):</span>{" "}
                      <span className="text-indigo-300 font-bold">{selectedParams.baseHue.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="text-slate-400">谐波秩序 (Harmonic):</span>{" "}
                      <span className="text-emerald-300 font-bold">{selectedParams.harmonicOrder.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">采样频率 (Frequency):</span>{" "}
                      <span className="text-sky-300 font-bold">{selectedParams.frequency.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">色彩饱和度 (Chroma):</span>{" "}
                      <span className="text-pink-300 font-bold">{selectedParams.saturation}%</span>
                    </div>
                  </div>
                </div>

                {/* Trial Micro Time-Series Stream */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <div className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>试次时序微观轨迹 (Trial Track - {selectedParams.nodes.length} 题)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">绿为对 / 红为错 / 橙为求助</span>
                  </div>

                  {/* Horizontal Scrollable Trail Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2 pt-1">
                    {selectedParams.nodes.map((node) => (
                      <div
                        key={node.trialIndex}
                        className={`flex-shrink-0 w-11 p-1.5 rounded-lg border text-center font-mono text-[10px] ${
                          node.isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                        }`}
                        title={`T${node.trialIndex}: 置信度 ${(node.confidence * 100).toFixed(0)}%, 难度 ${node.difficulty.toFixed(2)}, 耗时 ${node.duration_ms}ms`}
                      >
                        <div>#{node.trialIndex}</div>
                        <div className="font-bold text-[9px] mt-0.5">{(node.confidence * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Macro Metric Table */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="font-bold text-slate-200">原始多维测试记录指标</div>
                  <div className="grid grid-cols-3 gap-2 text-slate-300 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">d' (感知敏感)</span>
                      {selectedSession.metrics.d_prime.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Meta-d' (元认知)</span>
                      {selectedSession.metrics.meta_d_prime.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">M-Ratio (倍率)</span>
                      {selectedSession.metrics.m_ratio.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bias (偏差)</span>
                      {selectedSession.metrics.calibration_bias.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Brier Score</span>
                      {selectedSession.metrics.brier_score.toFixed(3)}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">准确率</span>
                      {(selectedSession.metrics.first_order_accuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AestheticAuditPage;
