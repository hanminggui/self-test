import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Layers,
  Search,
  RefreshCw,
  Users,
  Brain,
  Award,
  ChevronRight,
  X,
  Sliders,
  ExternalLink,
  Sparkles,
  Info,
  Compass,
  Zap,
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

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data
  const [scatterData, setScatterData] = useState<ScatterData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectReport, setSelectedSubjectReport] = useState<any | null>(null);

  // Scatter view controls
  const [evalSystem, setEvalSystem] = useState<"MANIFOLD" | "PERCENTAGE">("MANIFOLD");
  const [splitLine, setSplitLine] = useState<"BASELINE" | "MEDIAN" | "MEAN">("BASELINE");
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);

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

  const subjects = scatterData?.subjects || [];
  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.role_title && s.role_title.includes(searchQuery)) ||
      (s.quadrant_code && s.quadrant_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute split line coordinates based on active settings
  let splitXRatio = 0.60;
  let splitYRatio = 0.40; // 0.80 / 2.0 = 0.40
  if (evalSystem === "MANIFOLD") {
    if (splitLine === "BASELINE") {
      splitXRatio = 0.60;
      splitYRatio = 0.80 / 2.0;
    } else if (splitLine === "MEDIAN" && scatterData) {
      splitXRatio = scatterData.median_x;
      splitYRatio = scatterData.median_y / 2.0;
    } else if (splitLine === "MEAN" && scatterData) {
      splitXRatio = scatterData.mean_x;
      splitYRatio = scatterData.mean_y / 2.0;
    }
  } else {
    // PERCENTAGE system
    if (splitLine === "BASELINE") {
      splitXRatio = 0.7071;
      splitYRatio = 0.7071;
    } else if (splitLine === "MEDIAN" && scatterData) {
      splitXRatio = scatterData.median_x;
      splitYRatio = scatterData.median_y;
    } else if (splitLine === "MEAN" && scatterData) {
      splitXRatio = scatterData.mean_x;
      splitYRatio = scatterData.mean_y;
    }
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
                v2.0 临床双层架构
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

      {/* 4D 认知流形宏观点阵散点图 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> 4D 认知流形 2D 平面投影相空间 (Manifold Phase Space)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {evalSystem === "MANIFOLD"
                ? "X 轴: 相变突破度 D* [0~1] · Y 轴: 元认知效率 M_ratio [0~2.0+] · 色相: 决策倾角 Bias · 纯度/辉光: 觅食杠杆 IVE"
                : "X 轴: 原始答对率 P(correct) · Y 轴: 二元对齐度"}
            </p>
          </div>

          {/* 控制选项 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setEvalSystem("MANIFOLD")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  evalSystem === "MANIFOLD" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                4D 认知流形 [D*, M_ratio]
              </button>
              <button
                onClick={() => setEvalSystem("PERCENTAGE")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  evalSystem === "PERCENTAGE" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                经典胜率空间 [v1.0]
              </button>
            </div>

            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setSplitLine("BASELINE")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  splitLine === "BASELINE" ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                {evalSystem === "MANIFOLD" ? "相变阈值 (D*=0.6, M=0.8)" : "70.7% 基准"}
              </button>
              <button
                onClick={() => setSplitLine("MEDIAN")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  splitLine === "MEDIAN" ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                中位数
              </button>
              <button
                onClick={() => setSplitLine("MEAN")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  splitLine === "MEAN" ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                均值
              </button>
            </div>
          </div>
        </div>

        {/* 散点图绘制画布容器 */}
        <div className="relative w-full h-[420px] md:h-[500px] bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden p-6">
          {/* 四象限背景水印标签 */}
          {evalSystem === "MANIFOLD" ? (
            <>
              <div className="absolute top-4 right-4 text-right pointer-events-none">
                <span className="text-xs font-bold text-emerald-400/35 uppercase tracking-widest block">
                  Q1-CAL: 领航统帅
                </span>
                <span className="text-[10px] text-slate-500">高一元突破 · 知行绝对自洽</span>
              </div>
              <div className="absolute top-4 left-4 text-left pointer-events-none">
                <span className="text-xs font-bold text-cyan-400/35 uppercase tracking-widest block">
                  Q2-EVO: 潜龙在渊 / Q7-ARB: 神机策士
                </span>
                <span className="text-[10px] text-slate-500">高二元觉察 · 借力进化与概率套利</span>
              </div>
              <div className="absolute bottom-4 right-4 text-right pointer-events-none">
                <span className="text-xs font-bold text-amber-400/35 uppercase tracking-widest block">
                  Q3-SEN: 定海神针 / Q4-PIO: 飞龙在天
                </span>
                <span className="text-[10px] text-slate-500">高一元底蕴 · 审慎守舵 vs 果敢破局</span>
              </div>
              <div className="absolute bottom-4 left-4 text-left pointer-events-none">
                <span className="text-xs font-bold text-rose-400/35 uppercase tracking-widest block">
                  Q5-RET / Q6-GAM / Q8-DRI
                </span>
                <span className="text-[10px] text-slate-500">暗夜行者 · 无畏先锋 · 星轨漫游者</span>
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-4 right-4 text-right pointer-events-none">
                <span className="text-xs font-bold text-emerald-400/30 uppercase tracking-widest block">Q1: 领航统帅</span>
              </div>
              <div className="absolute top-4 left-4 text-left pointer-events-none">
                <span className="text-xs font-bold text-cyan-400/30 uppercase tracking-widest block">Q2: 潜龙在渊</span>
              </div>
              <div className="absolute bottom-4 right-4 text-right pointer-events-none">
                <span className="text-xs font-bold text-amber-400/30 uppercase tracking-widest block">Q3/Q4: 定海神针 / 飞龙在天</span>
              </div>
              <div className="absolute bottom-4 left-4 text-left pointer-events-none">
                <span className="text-xs font-bold text-rose-400/30 uppercase tracking-widest block">Q5/Q6: 暗夜行者 / 无畏先锋</span>
              </div>
            </>
          )}

          {/* 分割参考虚线 */}
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-indigo-500/30 pointer-events-none z-0"
            style={{ left: `${splitXRatio * 100}%` }}
          />
          <div
            className="absolute left-0 right-0 border-t border-dashed border-indigo-500/30 pointer-events-none z-0"
            style={{ bottom: `${splitYRatio * 100}%` }}
          />

          {/* 散点渲染：严格遵循第 7 节视觉通道正交规约与双变量色彩映射 */}
          {subjects.map((sub) => {
            let posX = 50;
            let posY = 50;
            if (evalSystem === "MANIFOLD") {
              const dStarVal = sub.d_star !== undefined ? sub.d_star : 0.5;
              posX = Math.max(0.04, Math.min(0.96, dStarVal)) * 100;
              posY = Math.max(0.04, Math.min(0.96, sub.m_ratio / 2.0)) * 100;
            } else {
              posX = Math.max(0.05, Math.min(0.95, sub.first_order_accuracy)) * 100;
              posY = Math.max(0.05, Math.min(0.95, sub.second_order_accuracy)) * 100;
            }

            const isHovered = hoveredSubject?.id === sub.id;
            const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.50);

            return (
              <div
                key={sub.id}
                onMouseEnter={() => setHoveredSubject(sub)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => handleOpenReport(sub.id)}
                className={`absolute w-3.5 h-3.5 -ml-[7px] -mb-[7px] rounded-full cursor-pointer transition-transform duration-150 z-10 flex items-center justify-center ${
                  sub.is_current ? "scale-150 ring-4 ring-amber-400/60" : isHovered ? "scale-150 ring-2 ring-white" : ""
                }`}
                style={{
                  left: `${posX}%`,
                  bottom: `${posY}%`,
                  backgroundColor: colorToken.backgroundColor,
                  border: `1.5px solid ${colorToken.borderColor}`,
                  boxShadow: colorToken.boxShadow,
                }}
              >
                <div className="w-1 h-1 rounded-full bg-white/70 pointer-events-none" />
              </div>
            );
          })}

          {/* Hover 浮动卡片 */}
          {hoveredSubject && (
            <div
              className="absolute pointer-events-none glass-panel rounded-xl p-3.5 border border-indigo-500/40 text-xs shadow-2xl z-30 space-y-1.5 w-60 animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(70, Math.max(5, (hoveredSubject.d_star ?? 0.5) * 100))}%`,
                bottom: `${Math.min(65, Math.max(10, (hoveredSubject.m_ratio / 2.0) * 100))}%`,
              }}
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>{hoveredSubject.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                  {hoveredSubject.role_title || "受测者"}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <div>突破度 D*: <span className="font-mono text-cyan-300 font-bold">{(hoveredSubject.d_star ?? 0.5).toFixed(3)}</span></div>
                <div>元认知 M_ratio: <span className="font-mono text-purple-300 font-bold">{hoveredSubject.m_ratio}</span></div>
                <div>决策偏向 Bias: <span className="font-mono text-slate-200">{hoveredSubject.calibration_bias > 0 ? `+${hoveredSubject.calibration_bias}` : hoveredSubject.calibration_bias}</span></div>
                <div>觅食杠杆 IVE: <span className="font-mono text-amber-300 font-bold">{(hoveredSubject.ive ?? 0.5).toFixed(3)}</span></div>
                <div>最终战绩: <span className="font-mono text-yellow-400 font-bold">{hoveredSubject.final_score} 分</span></div>
              </div>
              {hoveredSubject.clinical_summary && (
                <div className="text-[10px] text-slate-400 border-t border-white/5 pt-1 leading-snug">
                  {hoveredSubject.clinical_summary}
                </div>
              )}
            </div>
          )}
        </div>

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
          <h2 className="text-base font-bold text-white">受测者 4D 流形评测明细 (MECE 8 大画像全量)</h2>

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
              {filteredSubjects.map((sub) => {
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
                      <div className="text-amber-300 font-semibold">{sub.role_title || "领航统帅"}</div>
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
              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    未检索到符合条件的受试者记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
