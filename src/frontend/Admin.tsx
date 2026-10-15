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
} from "lucide-react";

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
  const [evalSystem, setEvalSystem] = useState<"PERCENTAGE" | "SDT">("PERCENTAGE");
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
            <p className="text-xs text-slate-400 mt-1">请输入终端生成的管理员访问密码以调阅群体数据</p>
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
      (s.role_title && s.role_title.includes(searchQuery))
  );

  // Compute split line coordinates based on active settings
  let splitX = 0.7071;
  let splitY = 0.7071;
  if (scatterData) {
    if (splitLine === "MEDIAN") {
      splitX = scatterData.median_x;
      splitY = scatterData.median_y;
    } else if (splitLine === "MEAN") {
      splitX = scatterData.mean_x;
      splitY = scatterData.mean_y;
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
              元认知评测控制台 (Admin Dashboard)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                已认证
              </span>
            </h1>
            <p className="text-xs text-slate-400">群体四象限分布图 · 全量受测者数据检索与报告回溯</p>
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
            <Brain className="w-4 h-4 text-cyan-400" /> 平均一元胜率
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {scatterData ? `${Math.round(scatterData.mean_x * 100)}%` : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> 平均二元自洽度 M_ratio
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {subjects.length > 0
              ? (subjects.reduce((a, b) => a + b.m_ratio, 0) / subjects.length).toFixed(2)
              : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> 群体最高得分
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {subjects.length > 0 ? Math.max(...subjects.map((s) => s.final_score)) : 0}
          </div>
        </div>
      </div>

      {/* 四象限群体点阵散点图 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> 群体认知与元认知四象限分布图
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">X轴: 一元客观解题胜率 · Y轴: 二元主观知行对齐度</p>
          </div>

          {/* 控制选项 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setEvalSystem("PERCENTAGE")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  evalSystem === "PERCENTAGE" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                百分比体系 [0~1]
              </button>
              <button
                onClick={() => setEvalSystem("SDT")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  evalSystem === "SDT" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                SDT 体系 [d', Meta-d']
              </button>
            </div>

            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setSplitLine("BASELINE")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  splitLine === "BASELINE" ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
                }`}
              >
                70.7% 基准
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
        <div className="relative w-full h-[400px] md:h-[480px] bg-slate-950/70 rounded-2xl border border-white/5 overflow-hidden p-6">
          {/* 四象限背景水印标签 */}
          <div className="absolute top-4 right-4 text-right pointer-events-none">
            <span className="text-xs font-bold text-amber-400/30 uppercase tracking-widest block">Q1: 人形外挂</span>
            <span className="text-[10px] text-slate-600">知己所知 · 降维压制</span>
          </div>
          <div className="absolute top-4 left-4 text-left pointer-events-none">
            <span className="text-xs font-bold text-emerald-400/30 uppercase tracking-widest block">Q2: 潜龙在渊</span>
            <span className="text-[10px] text-slate-600">知己所不知 · 敏锐进化</span>
          </div>
          <div className="absolute bottom-4 right-4 text-right pointer-events-none">
            <span className="text-xs font-bold text-purple-400/30 uppercase tracking-widest block">Q3: 飞龙在天 / 定海神针</span>
            <span className="text-[10px] text-slate-600">攻坚先锋 · 稳健守舵</span>
          </div>
          <div className="absolute bottom-4 left-4 text-left pointer-events-none">
            <span className="text-xs font-bold text-rose-400/30 uppercase tracking-widest block">Q4: 无畏先锋</span>
            <span className="text-[10px] text-slate-600">敢打敢拼 · 破局试错</span>
          </div>

          {/* 分割参考虚线 */}
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-indigo-500/30 pointer-events-none z-0"
            style={{ left: `${splitX * 100}%` }}
          />
          <div
            className="absolute left-0 right-0 border-t border-dashed border-indigo-500/30 pointer-events-none z-0"
            style={{ bottom: `${splitY * 100}%` }}
          />

          {/* 散点渲染 */}
          {subjects.map((sub) => {
            const posX = Math.max(0.05, Math.min(0.95, sub.first_order_accuracy)) * 100;
            const posY = Math.max(0.05, Math.min(0.95, sub.second_order_accuracy)) * 100;

            const isHovered = hoveredSubject?.id === sub.id;

            return (
              <div
                key={sub.id}
                onMouseEnter={() => setHoveredSubject(sub)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => handleOpenReport(sub.id)}
                className={`absolute w-4 h-4 -ml-2 -mb-2 rounded-full cursor-pointer transition-all duration-200 z-10 flex items-center justify-center ${
                  sub.is_current
                    ? "bg-amber-400 ring-4 ring-amber-400/30 animate-pulse scale-125"
                    : isHovered
                    ? "bg-indigo-400 ring-4 ring-indigo-400/30 scale-150"
                    : "bg-indigo-500 hover:bg-indigo-400 shadow-md shadow-indigo-500/50"
                }`}
                style={{ left: `${posX}%`, bottom: `${posY}%` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            );
          })}

          {/* Hover 浮动卡片 */}
          {hoveredSubject && (
            <div
              className="absolute pointer-events-none glass-panel rounded-xl p-3 border border-indigo-500/40 text-xs shadow-2xl z-30 space-y-1 w-52 animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(75, Math.max(5, hoveredSubject.first_order_accuracy * 100))}%`,
                bottom: `${Math.min(75, Math.max(10, hoveredSubject.second_order_accuracy * 100))}%`,
              }}
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>{hoveredSubject.name}</span>
                <span className="text-[10px] text-amber-300 font-normal">{hoveredSubject.role_title || "受测者"}</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div>一元客观胜率: {(hoveredSubject.first_order_accuracy * 100).toFixed(1)}%</div>
                <div>二元对齐度: {(hoveredSubject.second_order_accuracy * 100).toFixed(1)}%</div>
                <div>自洽度 M_ratio: {hoveredSubject.m_ratio}</div>
                <div>最终战绩得分: {hoveredSubject.final_score} 分</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 历史明细数据表格 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-white">受测者评测记录全明细</h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="搜索受测者姓名 / 称号..."
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
                <th className="py-3 px-4">受测者</th>
                <th className="py-3 px-4">鉴定称号</th>
                <th className="py-3 px-4">一元正确率</th>
                <th className="py-3 px-4">二元对齐度</th>
                <th className="py-3 px-4">M_ratio</th>
                <th className="py-3 px-4">校准偏差</th>
                <th className="py-3 px-4">最终得分</th>
                <th className="py-3 px-4">测试时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSubjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-4 font-medium text-white">{sub.name}</td>
                  <td className="py-3 px-4 text-amber-300 font-semibold">{sub.role_title || "标准型"}</td>
                  <td className="py-3 px-4 font-mono">{(sub.first_order_accuracy * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 font-mono">{(sub.second_order_accuracy * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{sub.m_ratio}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {sub.calibration_bias > 0 ? `+${sub.calibration_bias}` : sub.calibration_bias}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-yellow-400">{sub.final_score}</td>
                  <td className="py-3 px-4 text-slate-500">{sub.created_at || "--"}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenReport(sub.id)}
                      className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      查看报告
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* 调阅完整报告 Drawer 弹窗 */}
      {selectedSubjectReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">受测者诊断报告明细</h3>
                <p className="text-xs text-slate-400">{selectedSubjectReport.subject_name} ({selectedSubjectReport.session_id})</p>
              </div>
              <button
                onClick={() => setSelectedSubjectReport(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-2xl font-black text-amber-300">
                {selectedSubjectReport.diagnostic_profile.role_title}
              </div>
              <div className="text-xs text-amber-200/80 mt-1">
                “{selectedSubjectReport.diagnostic_profile.praise_tagline}”
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
              {selectedSubjectReport.diagnostic_profile.empowering_feedback}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                <div className="text-slate-400">客观胜率</div>
                <div className="text-sm font-bold font-mono text-white">
                  {(selectedSubjectReport.summary.first_order_accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                <div className="text-slate-400">一元辨别力 d'</div>
                <div className="text-sm font-bold font-mono text-cyan-400">
                  {selectedSubjectReport.metacognitive_metrics.d_prime}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                <div className="text-slate-400">二元 Meta-d'</div>
                <div className="text-sm font-bold font-mono text-purple-400">
                  {selectedSubjectReport.metacognitive_metrics.meta_d_prime}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                <div className="text-slate-400">自洽度 M_ratio</div>
                <div className="text-sm font-bold font-mono text-amber-400">
                  {selectedSubjectReport.metacognitive_metrics.m_ratio}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-white">专属技能矩阵：</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedSubjectReport.diagnostic_profile.skills.map((s: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <div className="font-semibold text-white flex items-center gap-1">
                      <span>{s.icon}</span> {s.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{s.desc}</div>
                  </div>
                ))}
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
