import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  Layers,
  Search,
  RefreshCw,
  Users,
  Brain,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
  Sliders,
  ExternalLink,
  Sparkles,
  Info,
  Compass,
  Zap,
  Filter,
} from "lucide-react";

export interface VisualColorToken {
  backgroundColor: string; // hsla 格式
  borderColor: string;     // 高亮边框色
  boxShadow: string;       // 外发光阴影
  hue: number;
}

/**
 * Spec §7.4: 双变量色彩映射纯函数
 * Hue 表达决策偏向倾角 Bias (冷暖双极流向)
 * Saturation, Alpha & Glow 表达信息觅食弹性 IVE (能量充盈度)
 */
export function computeMultivariateColor(
  bias: number, // [-1.0, 1.0], 决策倾角
  ive: number   // [0.0, 1.0], 信息觅食杠杆
): VisualColorToken {
  // 1. 计算色相 Hue (Bias 驱动: 冰蓝 205° -> 翡翠绿 155° -> 炽橙红 15°)
  let hue = 155;
  if (bias < -0.12) {
    const t = Math.min(1.0, Math.max(0.0, (-bias - 0.12) / 0.25));
    hue = Math.round(155 + t * 50); // 155° -> 205°
  } else if (bias > 0.12) {
    const t = Math.min(1.0, Math.max(0.0, (bias - 0.12) / 0.25));
    hue = Math.round(155 - t * 140); // 155° -> 15°
  }

  // 2. 计算饱和度 Saturation 与亮度 Lightness (IVE 驱动)
  const clampedIve = Math.min(1.0, Math.max(0.0, ive));
  const saturation = Math.round(40 + clampedIve * 60); // 40% ~ 100%
  const lightness = Math.round(50 + clampedIve * 10);   // 50% ~ 60%

  // 3. 计算约束透明度 Alpha (IVE 驱动，设立 0.45 保底，杜绝隐形)
  const alpha = (0.45 + clampedIve * 0.55).toFixed(2); // 0.45 ~ 1.00

  // 4. 高杠杆外发光辉光 (IVE >= 0.70 激活)
  const isHighLeverage = clampedIve >= 0.70;
  const boxShadow = isHighLeverage
    ? `0 0 10px hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`
    : "none";

  return {
    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`,
    borderColor: `hsla(${hue}, ${saturation}%, ${Math.min(90, lightness + 20)}%, 0.9)`,
    boxShadow,
    hue,
  };
}

interface SubjectPoint {
  id: string;
  name: string;
  subject_type: string;
  first_order_accuracy: number;
  second_order_accuracy: number;
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  final_score: number;
  is_current?: boolean;
  created_at?: string;
  role_title?: string;
  quadrant_code?: string;
  d_star: number;
  ive: number;
  cognitive_manifold_vector: [number, number, number, number];
  clinical_summary?: string;
}

interface ScatterData {
  baseline_x: number;
  baseline_y: number;
  median_x: number;
  median_y: number;
  mean_x: number;
  mean_y: number;
  subjects: SubjectPoint[];
}

const QUADRANT_PRESETS = [
  { code: "Q1-CAL", defaultTitle: "人形外挂" },
  { code: "Q2-EVO", defaultTitle: "灵窍天开" },
  { code: "Q3-SEN", defaultTitle: "定海神针" },
  { code: "Q4-PIO", defaultTitle: "飞龙在天" },
  { code: "Q5-RET", defaultTitle: "大音希声" },
  { code: "Q6-GAM", defaultTitle: "无畏先锋" },
  { code: "Q7-ARB", defaultTitle: "诸葛在世" },
  { code: "Q8-DRI", defaultTitle: "暮光星灵" },
];

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data
  const [scatterData, setScatterData] = useState<ScatterData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedSubjectReport, setSelectedSubjectReport] = useState<any | null>(null);

  // Reset page when filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag, pageSize]);

  // Scatter view controls
  const [splitLine, setSplitLine] = useState<"BASELINE" | "MEDIAN" | "MEAN">("BASELINE");
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [showThresholdRationale, setShowThresholdRationale] = useState(true);

  // Verify token
  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_token", token);
        loadData();
      } else {
        setAuthError("访问密码或免密令牌无效，请重新输入");
      }
    } catch {
      setAuthError("网络连接失败");
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    // 1. Check URL query token
    const urlParams = new URLSearchParams(window.location.search);
    const tokenInUrl = urlParams.get("token");
    if (tokenInUrl) {
      verifyToken(tokenInUrl);
      return;
    }

    // 2. Check SessionStorage
    const savedToken = sessionStorage.getItem("admin_token");
    if (savedToken) {
      verifyToken(savedToken);
      return;
    }

    setCheckingAuth(false);
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/cohort/scatter");
      if (res.ok) {
        const data = await res.json();
        setScatterData(data);
      }
    } catch (e) {
      console.error("加载数据失败", e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;
    setCheckingAuth(true);
    setAuthError("");
    verifyToken(inputPassword.trim());
  };

  const handleOpenReport = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/report`);
      if (res.ok) {
        const rep = await res.json();
        setSelectedSubjectReport(rep);
      }
    } catch (e) {
      console.error("加载报告失败", e);
    }
  };

  const subjects = scatterData?.subjects || [];

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: subjects.length };
    subjects.forEach((s) => {
      const code = s.quadrant_code;
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, [subjects]);

  const quadrantTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    subjects.forEach((s) => {
      if (s.quadrant_code && s.role_title && !titles[s.quadrant_code]) {
        titles[s.quadrant_code] = s.role_title;
      }
    });
    return titles;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.role_title && s.role_title.toLowerCase().includes(query)) ||
        (s.quadrant_code && s.quadrant_code.toLowerCase().includes(query));

      const matchesTag =
        selectedTag === "ALL" ||
        s.quadrant_code === selectedTag ||
        s.role_title === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [subjects, searchQuery, selectedTag]);

  const totalItems = filteredSubjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Compute split line coordinates based on active settings (4D Cognitive Manifold)
  let splitXRatio = 0.60;
  let splitYRatio = 0.40; // 0.80 / 2.0 = 0.40
  let splitXVal = 0.60;
  let splitYVal = 0.80;

  if (splitLine === "MEDIAN" && scatterData) {
    splitXVal = scatterData.median_x;
    splitYVal = scatterData.median_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  } else if (splitLine === "MEAN" && scatterData) {
    splitXVal = scatterData.mean_x;
    splitYVal = scatterData.mean_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
        正在验证管理员访问凭据...
      </div>
    );
  }

  // 1. 锁屏登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0f]">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">独立管理控制台</h2>
            <p className="text-xs text-slate-400 mt-1">请输入终端生成的管理员访问密码以调阅群体 4D 认知流形数据</p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4">
            <input
              type="password"
              placeholder="请输入管理员密码..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
            />

            {authError && <div className="text-xs text-rose-400">{authError}</div>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              解锁进入控制台 →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-200 p-4 md:p-8 space-y-8">
      {/* 顶部控制台导航 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              4D 认知流形评测控制台 (Admin Manifold Portal)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v2.0 4D认知流形
              </span>
            </h1>
            <p className="text-xs text-slate-400">群体 4D 正交相空间分布图 · 8 大画像 MECE 拓扑与双变量色彩映射</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loadingData}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer border border-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} /> 刷新数据
          </button>
          <a
            href="/"
            className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-medium text-indigo-300 flex items-center gap-1.5 border border-indigo-500/30"
          >
            返回答题页面 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* 统计指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" /> 总参测人次
          </div>
          <div className="text-2xl font-bold font-mono text-white">{subjects.length}</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-cyan-400" /> 平均相变突破度 D*
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {subjects.length > 0
              ? (subjects.reduce((a, b) => a + (b.d_star ?? 0.5), 0) / subjects.length).toFixed(3)
              : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> 平均元认知效率 M_ratio
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {subjects.length > 0
              ? (subjects.reduce((a, b) => a + b.m_ratio, 0) / subjects.length).toFixed(2)
              : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> 群体最高战绩得分
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {subjects.length > 0 ? Math.max(...subjects.map((s) => s.final_score)) : 0}
          </div>
        </div>
      </div>

      {/* 4D 认知流形宏观点阵相空间图 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> 4D 认知流形 2D 平面投影相空间 (Manifold Phase Space)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              横坐标: 相变突破度 D* [0~1.0] · 纵坐标: 元认知效率 M_ratio [0~2.0+] · 色相: 决策倾角 Bias · 纯度/外发光: 觅食杠杆 IVE
            </p>
          </div>

          {/* 控制选项 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setSplitLine("BASELINE")}
                className={`px-3 py-1.5 rounded-md transition-all ${splitLine === "BASELINE" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
              >
                相变基准 (D*=0.60, M=0.80)
              </button>
              <button
                onClick={() => setSplitLine("MEDIAN")}
                className={`px-3 py-1.5 rounded-md transition-all ${splitLine === "MEDIAN" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
              >
                群体中位数
              </button>
              <button
                onClick={() => setSplitLine("MEAN")}
                className={`px-3 py-1.5 rounded-md transition-all ${splitLine === "MEAN" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
              >
                群体均值
              </button>
            </div>

            <button
              onClick={() => setShowThresholdRationale(!showThresholdRationale)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              {showThresholdRationale ? "收起阈值依据" : "相变阈值理论依据"}
            </button>
          </div>
        </div>

        {/* 坐标系整体画布包装器 */}
        <div className="relative w-full rounded-2xl bg-slate-950/95 border border-white/10 overflow-hidden pt-6 pb-12 pl-14 pr-6 select-none shadow-2xl">
          {/* Y 轴刻度尺 (左侧) */}
          <div className="absolute left-0 top-6 bottom-12 w-14 flex flex-col justify-between items-end pr-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
            <span className="text-slate-400">2.0+</span>
            <span>1.6</span>
            <span>1.2</span>
            <span className="text-purple-400 font-bold flex items-center gap-0.5">0.8</span>
            <span>0.4</span>
            <span>0.0</span>
          </div>

          {/* Y 轴垂直标头 */}
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] tracking-wider font-semibold text-slate-400 uppercase pointer-events-none whitespace-nowrap">
            元认知效率 M_ratio (Meta-d' / d')
          </div>

          {/* 内部绘图核心网格区 (0% ~ 100% 对应 X:0~1.0, Y:0~2.0) */}
          <div className="relative w-full h-[380px] md:h-[460px] border border-white/10 rounded-xl bg-slate-950/60">
            {/* 背景剪裁层：仅对渐变光晕与坐标线执行圆角裁剪，严禁裁剪悬浮浮窗 */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              {/* 四象限光晕背景 */}
              {/* Q1: 人形外挂 (右上: 高D*, 高M) */}
              <div
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                  left: `${splitXRatio * 100}%`,
                  bottom: `${splitYRatio * 100}%`,
                  right: 0,
                  top: 0,
                  background: "radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.12), transparent 75%)",
                }}
              />
              {/* Q2 / Q7: 灵窍天开 / 诸葛在世 (左上: 低D*, 高M) */}
              <div
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                  left: 0,
                  bottom: `${splitYRatio * 100}%`,
                  width: `${splitXRatio * 100}%`,
                  top: 0,
                  background: "radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.10), transparent 75%)",
                }}
              />
              {/* Q3 / Q4: 定海神针 / 飞龙在天 (右下: 高D*, 低M) */}
              <div
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                  left: `${splitXRatio * 100}%`,
                  bottom: 0,
                  right: 0,
                  height: `${splitYRatio * 100}%`,
                  background: "radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.09), transparent 75%)",
                }}
              />
              {/* Q5 / Q6 / Q8: 大音希声 / 无畏先锋 / 暮光星灵 (左下: 低D*, 低M) */}
              <div
                className="absolute pointer-events-none transition-all duration-300"
                style={{
                  left: 0,
                  bottom: 0,
                  width: `${splitXRatio * 100}%`,
                  height: `${splitYRatio * 100}%`,
                  background: "radial-gradient(ellipse at bottom left, rgba(244, 63, 94, 0.08), transparent 75%)",
                }}
              />

              {/* 微弱坐标网格线 */}
              {[0.2, 0.4, 0.6, 0.8].map((x) => (
                <div
                  key={`grid-x-${x}`}
                  className="absolute top-0 bottom-0 border-l border-white/[0.04] pointer-events-none"
                  style={{ left: `${x * 100}%` }}
                />
              ))}
              {[0.2, 0.4, 0.6, 0.8].map((y) => (
                <div
                  key={`grid-y-${y}`}
                  className="absolute left-0 right-0 border-t border-white/[0.04] pointer-events-none"
                  style={{ bottom: `${y * 100}%` }}
                />
              ))}
            </div>

            {/* 象限水印标识与称号 */}
            <div className="absolute top-3 right-4 text-right pointer-events-none z-0">
              <span className="text-xs font-bold text-emerald-400/50 uppercase tracking-widest block flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Q1-CAL: 人形外挂
              </span>
              <span className="text-[10px] text-slate-400">高一元突破 · 知行绝对自洽</span>
            </div>
            <div className="absolute top-3 left-4 text-left pointer-events-none z-0">
              <span className="text-xs font-bold text-cyan-400/50 uppercase tracking-widest block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Q2-EVO: 灵窍天开 / Q7-ARB: 诸葛在世
              </span>
              <span className="text-[10px] text-slate-400">高二元觉察 · 借力进化与概率套利</span>
            </div>
            <div className="absolute bottom-3 right-4 text-right pointer-events-none z-0">
              <span className="text-xs font-bold text-amber-400/50 uppercase tracking-widest block flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Q3-SEN: 定海神针 / Q4-PIO: 飞龙在天
              </span>
              <span className="text-[10px] text-slate-400">高一元底蕴 · 审慎守舵 vs 果敢破局</span>
            </div>
            <div className="absolute bottom-3 left-4 text-left pointer-events-none z-0">
              <span className="text-xs font-bold text-rose-400/50 uppercase tracking-widest block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Q5-RET / Q6-GAM / Q8-DRI
              </span>
              <span className="text-[10px] text-slate-400">大音希声 · 无畏先锋 · 暮光星灵</span>
            </div>

            {/* 动态相变/中位/均值 分割线 */}
            {/* 垂直分割线 (X = D*) */}
            <div
              className="absolute top-0 bottom-0 border-l-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
              style={{
                left: `${splitXRatio * 100}%`,
                boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
              }}
            >
              <div className="absolute top-2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
                {splitLine === "BASELINE"
                  ? "D* = 0.60 难度相变"
                  : splitLine === "MEDIAN"
                    ? `中位 D*: ${splitXVal.toFixed(2)}`
                    : `均值 D*: ${splitXVal.toFixed(2)}`}
              </div>
            </div>

            {/* 水平分割线 (Y = M_ratio) */}
            <div
              className="absolute left-0 right-0 border-t-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
              style={{
                bottom: `${splitYRatio * 100}%`,
                boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
              }}
            >
              <div className="absolute right-2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
                {splitLine === "BASELINE"
                  ? "M = 0.80 自洽临界"
                  : splitLine === "MEDIAN"
                    ? `中位 M: ${splitYVal.toFixed(2)}`
                    : `均值 M: ${splitYVal.toFixed(2)}`}
              </div>
            </div>

            {/* 散点渲染：严格遵循第 7 节视觉通道正交规约与双变量色彩映射 */}
            {subjects.map((sub) => {
              const dStarVal = sub.d_star !== undefined ? sub.d_star : 0.5;
              const posX = Math.max(0.02, Math.min(0.98, dStarVal)) * 100;
              const posY = Math.max(0.02, Math.min(0.98, (sub.m_ratio ?? 0.8) / 2.0)) * 100;

              const isHovered = hoveredSubject?.id === sub.id;
              const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.50);

              return (
                <div
                  key={sub.id}
                  onMouseEnter={() => setHoveredSubject(sub)}
                  onMouseLeave={() => setHoveredSubject(null)}
                  onClick={() => handleOpenReport(sub.id)}
                  className={`absolute w-3.5 h-3.5 -ml-[7px] -mb-[7px] rounded-full cursor-pointer transition-all duration-150 z-20 flex items-center justify-center ${sub.is_current
                    ? "scale-150 ring-4 ring-amber-400/80 animate-pulse"
                    : isHovered
                      ? "scale-150 ring-2 ring-white z-30"
                      : "hover:scale-125"
                    }`}
                  style={{
                    left: `${posX}%`,
                    bottom: `${posY}%`,
                    backgroundColor: colorToken.backgroundColor,
                    border: `1.5px solid ${colorToken.borderColor}`,
                    boxShadow: colorToken.boxShadow,
                  }}
                >
                  <div className="w-1 h-1 rounded-full bg-white/80 pointer-events-none" />
                </div>
              );
            })}

            {/* 精致悬浮浮窗 Tooltip (智能翻转 + 置顶 z-50 + 绝不截断) */}
            {hoveredSubject && (() => {
              const dStar = hoveredSubject.d_star !== undefined ? hoveredSubject.d_star : 0.5;
              const posX = Math.max(0.02, Math.min(0.98, dStar)) * 100;
              const posY = Math.max(0.02, Math.min(0.98, (hoveredSubject.m_ratio ?? 0.8) / 2.0)) * 100;
              const isUpperHalf = posY > 48; // 上半部点位：悬浮卡片向下展开，避免冲顶遮挡
              const isRightHalf = posX > 52; // 右半部点位：悬浮卡片向左展开，避免溢出右侧

              return (
                <div
                  className="absolute pointer-events-none glass-panel rounded-2xl p-4 border border-indigo-500/50 text-xs shadow-2xl z-50 space-y-2.5 w-72 md:w-80 backdrop-blur-xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    ...(isUpperHalf
                      ? { top: `${Math.max(4, Math.min(62, (100 - posY) + 4))}%` }
                      : { bottom: `${Math.max(4, Math.min(62, posY + 4))}%` }),
                    ...(isRightHalf
                      ? { right: `${Math.max(3, Math.min(65, (100 - posX) + 3))}%` }
                      : { left: `${Math.max(3, Math.min(65, posX + 3))}%` }),
                  }}
                >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      {hoveredSubject.name}
                      {hoveredSubject.is_current && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">当前</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">ID: {hoveredSubject.id.slice(0, 16)}...</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono inline-block">
                      {hoveredSubject.role_title || "受测者"}
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">{hoveredSubject.quadrant_code || "Q1-CAL"}</div>
                  </div>
                </div>

                {/* 4D 坐标数值九宫格 */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">相变突破度 D*</span>
                    <span className="font-mono text-cyan-300 font-bold">{(hoveredSubject.d_star ?? 0.5).toFixed(3)}</span>
                    <span className="text-[9px] ml-1 text-slate-500">
                      {(hoveredSubject.d_star ?? 0.5) >= 0.60 ? "≥0.6 拓扑" : "<0.6 基底"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">元认知 M_ratio</span>
                    <span className="font-mono text-purple-300 font-bold">{hoveredSubject.m_ratio}</span>
                    <span className="text-[9px] ml-1 text-slate-500">
                      {hoveredSubject.m_ratio >= 0.80 ? "≥0.8 自洽" : "<0.8 衰减"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">决策偏向 Bias</span>
                    <span className="font-mono text-slate-200">
                      {hoveredSubject.calibration_bias > 0 ? `+${hoveredSubject.calibration_bias}` : hoveredSubject.calibration_bias}
                    </span>
                    <span className="text-[9px] ml-1 text-slate-500">
                      {hoveredSubject.calibration_bias > 0.12 ? "自负" : hoveredSubject.calibration_bias < -0.12 ? "谨慎" : "均衡"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">觅食杠杆 IVE</span>
                    <span className="font-mono text-amber-300 font-bold">{(hoveredSubject.ive ?? 0.5).toFixed(3)}</span>
                    <span className="text-[9px] ml-1 text-slate-500">
                      {(hoveredSubject.ive ?? 0.5) >= 0.70 ? "高杠杆" : "自力"}
                    </span>
                  </div>
                </div>

                {/* 临床真值简评 */}
                {hoveredSubject.clinical_summary && (
                  <div className="text-[10px] text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5 leading-relaxed">
                    <span className="text-amber-400 font-semibold mr-1">[临床真值]</span>
                    {hoveredSubject.clinical_summary}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
                  <span>最终得分: <strong className="text-yellow-400 font-mono text-xs">{hoveredSubject.final_score}</strong></span>
                  <span className="text-indigo-400 flex items-center">点击查看画像报告 →</span>
                </div>
              </div>
            );
          })()}
          </div>

          {/* X 轴刻度尺 (底部) */}
          <div className="absolute left-14 right-6 bottom-5 flex justify-between text-[10px] font-mono text-slate-500 pointer-events-none">
            <span>0.0 (基底噪声)</span>
            <span>0.2</span>
            <span>0.4</span>
            <span className="text-cyan-400 font-bold">0.6 (相变阈值)</span>
            <span>0.8</span>
            <span>1.0 (极值突破)</span>
          </div>

          {/* X 轴水平标头 */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase pointer-events-none">
            相变突破度 D* (自适应阶梯信噪比倒数: [0.85 - δ*] / 0.80)
          </div>
        </div>

        {/* 阈值心理物理学科学依据解释卡片 */}
        {showThresholdRationale && (
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                坐标系分割相变阈值 (D* = 0.60, M_ratio = 0.80) 心理物理学理论依据
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Psychophysical Derivation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>横轴阈值 D* = 0.60</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 font-normal">难度信噪比相变</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  系统采用 2-up-1-down 自适应阶梯算法，理论稳态收敛于 70.71% 辨别极限感阈。刺激难度区间为 δ ∈ [0.05, 0.85]，D* = (0.85 - δ*) / 0.80。
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  当 D* ≥ 0.60 时，对应难度残差 δ* ≤ 0.37。在 4AFC 拓扑抽象感知中，δ = 0.37 是从<strong>浅层局部启发式直觉</strong>跃迁至<strong>高阶结构/拓扑不变性推理</strong>的临界信噪比（Critical SNR），标定信号检测论 d' ≥ 1.40（重测信度 r &gt; 0.82）。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                  <span>纵轴阈值 M_ratio = 0.80</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 font-normal">知行自洽黄金分割</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  基于计算神经科学权威模型（Maniscalco &amp; Lau, 2012; Fleming &amp; Lau, 2014），M_ratio = Meta-d' / d' 衡量元认知监控系统对一阶任务信号的信息保真度。
                </p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  理论无损理想观察者 M_ratio = 1.0。由于人类前额叶皮层（dlPFC / aPFC）存在神经突触噪声与注意衰减，健康人类最优认知常模稳态落在 <strong>0.75 ~ 0.85</strong>。故 0.80 确立为“知行绝对自洽”与“自负/认知盲区”的临床分水岭。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Spec §7.3 双变量色彩映射图例指南 (Bivariate Color Legend) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            4D 认知流形视觉通道编码规范 (Visual Channels Legend)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 色相通道说明 */}
            <div className="space-y-1.5">
              <div className="text-slate-400 flex items-center justify-between text-[11px]">
                <span>色相 Hue · 决策偏向倾角 Bias</span>
                <span className="font-mono text-[10px] text-slate-500">双极色温流向</span>
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-[hsl(205,80%,55%)] via-[hsl(155,80%,55%)] to-[hsl(15,85%,55%)] shadow-inner" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span>过度谨慎 (&lt;-0.12)</span>
                <span className="text-emerald-400 font-semibold">知行自洽 (±0.12)</span>
                <span>自负破局 (&gt;+0.12)</span>
              </div>
            </div>

            {/* 饱和度/辉光说明 */}
            <div className="space-y-1.5">
              <div className="text-slate-400 flex items-center justify-between text-[11px]">
                <span>纯度与透明度 Sat/Alpha · 信息觅食杠杆 IVE</span>
                <span className="font-mono text-[10px] text-slate-500">能量充盈度</span>
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-slate-600 via-amber-500/70 to-amber-400 shadow-inner" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span>纯内生算力 (IVE=0, α=0.45)</span>
                <span>均衡借力 (IVE=0.5)</span>
                <span className="text-amber-300 font-semibold">高杠杆辉光 (IVE≥0.70)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 历史明细数据表格 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">受测者 4D 流形评测明细 (MECE 8 大画像全量)</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
              {totalItems} 条
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="搜索受测者 / 称号 / 画像编码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 分类标签过滤栏 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 text-xs no-scrollbar border-b border-white/5">
          <div className="flex items-center gap-1.5 text-slate-500 shrink-0 text-[11px] pr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>标签筛选:</span>
          </div>
          <button
            onClick={() => setSelectedTag("ALL")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 text-xs ${selectedTag === "ALL"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold"
              : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <span>全部画像</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedTag === "ALL" ? "bg-white/20 text-white" : "bg-black/30 text-slate-400"
                }`}
            >
              {tagCounts["ALL"] || 0}
            </span>
          </button>
          {QUADRANT_PRESETS.map((q) => {
            const count = tagCounts[q.code] || 0;
            const isSelected = selectedTag === q.code;
            const title = quadrantTitles[q.code] || q.defaultTitle;
            return (
              <button
                key={q.code}
                onClick={() => setSelectedTag(isSelected ? "ALL" : q.code)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 text-xs border ${isSelected
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10 font-semibold"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
              >
                <span className="font-mono text-[10px] opacity-75">{q.code.split("-")[0]}</span>
                <span>{title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-amber-500/30 text-amber-200" : "bg-black/30 text-slate-400"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-medium">
                <th className="py-3 px-3">受测者</th>
                <th className="py-3 px-3">画像称号</th>
                <th className="py-3 px-3">突破度 D*</th>
                <th className="py-3 px-3">M_ratio</th>
                <th className="py-3 px-3">偏向 Bias</th>
                <th className="py-3 px-3">杠杆 IVE</th>
                <th className="py-3 px-3">最终战绩</th>
                <th className="py-3 px-3">临床真值诊断</th>
                <th className="py-3 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedSubjects.map((sub) => {
                const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.50);
                return (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{
                          backgroundColor: colorToken.backgroundColor,
                          border: `1px solid ${colorToken.borderColor}`,
                          boxShadow: colorToken.boxShadow,
                        }}
                      />
                      {sub.name}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-amber-300 font-semibold">{sub.role_title || "人形外挂"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sub.quadrant_code || "Q1-CAL"}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">
                      {(sub.d_star ?? 0.5).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-300 font-semibold">
                      {sub.m_ratio}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {sub.calibration_bias > 0 ? `+${sub.calibration_bias}` : sub.calibration_bias}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-300">
                      {(sub.ive ?? 0.5).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-yellow-400">{sub.final_score}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={sub.clinical_summary}>
                      {sub.clinical_summary || "--"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenReport(sub.id)}
                        className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        详情报告
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedSubjects.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    未检索到符合条件的受试者记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制栏 */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              显示第 <span className="text-white font-mono font-medium">{totalItems > 0 ? startIndex + 1 : 0}</span> - <span className="text-white font-mono font-medium">{endIndex}</span> 条，共 <span className="text-white font-mono font-medium">{totalItems}</span> 条
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-500">每页:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={10}>10 条</option>
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
                <option value={100}>100 条</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - safeCurrentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-600">...</span>;
                  }
                  return null;
                }

                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs flex items-center justify-center transition-colors ${isActive
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 调阅完整报告 Drawer 弹窗 (双层契约清晰隔离展示) */}
      {selectedSubjectReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  受测者双层诊断报告
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                    {selectedSubjectReport.diagnostic_profile.quadrant_code}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{selectedSubjectReport.subject_name} ({selectedSubjectReport.session_id})</p>
              </div>
              <button
                onClick={() => setSelectedSubjectReport(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 顶栏展示：用户展示层专属称号 */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-2xl font-black text-amber-300">
                {selectedSubjectReport.diagnostic_profile.role_title}
              </div>
              <div className="text-xs text-amber-200/80 mt-1">
                “{selectedSubjectReport.diagnostic_profile.praise_tagline}”
              </div>
            </div>

            {/* 双层架构模块 1：后台统计分析层（严谨客观临床真值） */}
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> 后台统计分析层 · 临床真值与 4D 认知流形特征
              </div>

              {/* 4D 流形参数矩阵 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">突破度 D*</div>
                  <div className="text-sm font-bold font-mono text-cyan-300">
                    {selectedSubjectReport.metacognitive_metrics.d_star?.toFixed(3) ?? "--"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">元认知 M_ratio</div>
                  <div className="text-sm font-bold font-mono text-purple-300">
                    {selectedSubjectReport.metacognitive_metrics.m_ratio}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">决策倾角 Bias</div>
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {selectedSubjectReport.metacognitive_metrics.calibration_bias > 0
                      ? `+${selectedSubjectReport.metacognitive_metrics.calibration_bias}`
                      : selectedSubjectReport.metacognitive_metrics.calibration_bias}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">觅食杠杆 IVE</div>
                  <div className="text-sm font-bold font-mono text-amber-300">
                    {selectedSubjectReport.metacognitive_metrics.info_buying_efficiency?.toFixed(3) ?? "--"}
                  </div>
                </div>
              </div>

              {/* 辅助参数 */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
                <div>一元辨别力 d': <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.d_prime}</span></div>
                <div>二元 Meta-d': <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.meta_d_prime}</span></div>
                <div>Brier Score: <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.brier_score}</span></div>
              </div>

              {/* 客观临床诊断摘要 */}
              <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/10 text-xs text-indigo-100 leading-relaxed">
                <span className="font-semibold text-indigo-300">临床真值归因：</span>
                {selectedSubjectReport.diagnostic_profile.clinical_summary || selectedSubjectReport.diagnostic_profile.critical_weakness}
              </div>
            </div>

            {/* 双层架构模块 2：用户交互展示层（纯正面赋能） */}
            <div className="space-y-3 p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> 用户交互展示层 · 赋能解读与专属技能卡片
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                {selectedSubjectReport.diagnostic_profile.empowering_feedback}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-white">专属技能卡片矩阵：</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedSubjectReport.diagnostic_profile.skills.map((s: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>{s.icon}</span> {s.name}
                        </span>
                        <span className="text-[10px] text-amber-300/80">{s.type}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubjectReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
