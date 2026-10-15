import React, { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Brain,
  HelpCircle,
  Flame,
  Shield,
  ArrowRight,
  RotateCcw,
  Download,
  CheckCircle2,
  Lock,
  Layers,
  Award,
  TrendingUp,
} from "lucide-react";

interface TrialPayload {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>;
  has_hint: boolean;
  hint_cost: number;
  task_type: string;
}

interface TrialRequest {
  session_id: string;
  trial_index: number;
  phase: string;
  payload: TrialPayload;
}

interface SkillItem {
  icon: string;
  type: string;
  name: string;
  desc: string;
}

interface ReportData {
  session_id: string;
  subject_name: string;
  summary: {
    total_trials: number;
    first_order_accuracy: number;
    final_score: number;
    reversals_count: number;
  };
  metacognitive_metrics: {
    d_prime: number;
    meta_d_prime: number;
    m_ratio: number;
    calibration_bias: number;
    brier_score: number;
    info_buying_efficiency: number;
  };
  diagnostic_profile: {
    role_title: string;
    quadrant_code: string;
    praise_tagline: string;
    strength_tags: string[];
    empowering_feedback: string;
    growth_advice: string;
    coachability_index: number;
    skills: SkillItem[];
  };
}

export default function App() {
  const [stage, setStage] = useState<"WELCOME" | "TESTING" | "REPORT">("WELCOME");
  const [subjectName, setSubjectName] = useState("");
  const [totalTrials, setTotalTrials] = useState(30);

  // Active testing state
  const [sessionId, setSessionId] = useState("");
  const [trialData, setTrialData] = useState<TrialRequest | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<"HIGH_BET" | "SAFE_BET">("HIGH_BET");
  const [currentScore, setCurrentScore] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);

  // Start a new session
  const startSession = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: subjectName || "匿名探索者",
          total_trials: totalTrials,
          warmup_trials: Math.max(5, Math.floor(totalTrials / 3)),
        }),
      });
      if (!res.ok) throw new Error("启动测试失败");
      const data: TrialRequest = await res.json();
      setSessionId(data.session_id);
      setTrialData(data);
      setCurrentScore(0);
      setSelectedOption(null);
      setSelectedAction("HIGH_BET");
      setHintText(null);
      setStage("TESTING");
    } catch (e: any) {
      setErrorMsg(e.message || "网络请求异常");
    } finally {
      setLoading(false);
    }
  };

  // Purchase hint
  const handleBuyHint = async () => {
    if (!sessionId || hintText || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hint`, { method: "POST" });
      if (!res.ok) throw new Error("获取线索失败");
      const data = await res.json();
      setHintText(data.hint);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit trial answer & action
  const handleSubmitTrial = useCallback(async () => {
    if (!sessionId || !selectedOption || loading) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Submit Phase 1
      const p1Res = await fetch(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: selectedOption }),
      });
      if (!p1Res.ok) throw new Error("提交答案失败");

      // 2. Submit Phase 2
      const actionToSubmit = hintText ? "BUY_HINT" : selectedAction;
      const p2Res = await fetch(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionToSubmit,
          confidence_level: selectedAction === "HIGH_BET" ? 0.90 : 0.55,
          revised_choice: selectedOption,
        }),
      });
      if (!p2Res.ok) throw new Error("提交决策失败");
      const p2Data = await p2Res.json();

      setCurrentScore(p2Data.current_score);

      if (p2Data.is_completed) {
        // Fetch Report
        const repRes = await fetch(`/api/sessions/${sessionId}/report`);
        if (!repRes.ok) throw new Error("获取报告失败");
        const repData = await repRes.json();
        setReport(repData);
        setStage("REPORT");
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else {
        // Fetch next trial
        const nextReqRes = await fetch(`/api/sessions/${sessionId}/trial`);
        const nextTrial: TrialRequest = await nextReqRes.json();
        setTrialData(nextTrial);
        setSelectedOption(null);
        setSelectedAction("HIGH_BET");
        setHintText(null);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "请求失败");
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedOption, selectedAction, hintText, loading]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (stage !== "TESTING") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        if (trialData && trialData.payload.options[key]) {
          setSelectedOption(key);
        }
      } else if (key === "1") {
        setSelectedAction("HIGH_BET");
      } else if (key === "2") {
        setSelectedAction("SAFE_BET");
      } else if (key === "H") {
        handleBuyHint();
      } else if (key === "ENTER") {
        if (selectedOption && !loading) {
          handleSubmitTrial();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, trialData, selectedOption, selectedAction, loading, handleSubmitTrial]);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-5xl mx-auto">
      {/* 顶部极简导航栏 */}
      <header className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              认知潜能与元认知决断力测评
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Bun Fullstack v2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">解耦一元解题能力 · 测定二元知行自洽度</p>
          </div>
        </div>

        {stage === "TESTING" && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">当前战绩得分</div>
              <div className={`text-lg font-bold font-mono ${currentScore >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {currentScore > 0 ? `+${currentScore}` : currentScore}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 主体区域 */}
      <main className="flex-1 flex flex-col justify-center">
        {/* 1. 欢迎启动阶段 */}
        {stage === "WELCOME" && (
          <div className="glass-panel rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto w-full shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              严谨信号检测论 Type-2 SDT 算法驱动
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              探索你的深层认知觉察
            </h2>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto">
              本测试采用无常识依赖的 8 种高阶抽象逻辑题，并通过动态自适应阶梯将解题难度锚定在认知边界。
              核心不仅检验你能否解对，更衡量你是否<strong>“知己所知，知己所不知”</strong>。
            </p>

            <div className="space-y-4 max-w-sm mx-auto text-left mb-8">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">受测者昵称</label>
                <input
                  type="text"
                  placeholder="请输入您的姓名或代号"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">测试题量规模</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "标准完整测验 (30题)", val: 30 },
                    { label: "快速精简测验 (16题)", val: 16 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTotalTrials(opt.val)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                        totalTrials === opt.val
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <button
              onClick={startSession}
              disabled={loading}
              className="w-full max-w-sm px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto"
            >
              {loading ? "正在初始化测试题库..." : "开始答题 →"}
            </button>
          </div>
        )}

        {/* 2. 答题进行阶段 */}
        {stage === "TESTING" && trialData && (
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* 进度与题型标题栏 */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-400 font-bold text-sm">
                  第 {String(trialData.trial_index).padStart(2, "0")} 题
                </span>
                <span>/ 共 {totalTrials} 题</span>
              </div>

              <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[11px] font-medium">
                {trialData.payload.task_type || "抽象认知推演"}
              </div>
            </div>

            {/* 顶部长条进度条 */}
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                style={{ width: `${(trialData.trial_index / totalTrials) * 100}%` }}
              />
            </div>

            {/* 核心题目展示卡片 */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-4">
              <div className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-line font-medium">
                {trialData.payload.prompt}
              </div>

              {/* 线索展示抽屉 */}
              {hintText ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs md:text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4" /> 启发式线索提示 (已消耗 2 分)
                  </div>
                  {hintText}
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    💡 查看线索 (-2分)
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-white/10">H</kbd>
                  </button>
                </div>
              )}
            </div>

            {/* 2x2 选项网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.entries(trialData.payload.options).map(([key, val]) => {
                const isSelected = selectedOption === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedOption(key)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-3.5 cursor-pointer relative ${
                      isSelected
                        ? "glass-card border-indigo-500 bg-indigo-600/15 ring-2 ring-indigo-500/30"
                        : "glass-card border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
                          : "bg-slate-800 text-slate-400 border border-white/10"
                      }`}
                    >
                      {key}
                    </span>
                    <span className="text-xs md:text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-line pt-0.5">
                      {val}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Phase 2 投注与决策面板 */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">选择您的第二阶段决策信心：</span>
                <span className="text-[11px] text-slate-500">键盘快捷键 [1] 或 [2]</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAction("HIGH_BET")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAction === "HIGH_BET"
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500 text-amber-200 ring-2 ring-amber-500/20"
                      : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs md:text-sm flex items-center gap-1.5 text-amber-300">
                      <Flame className="w-4 h-4 text-amber-400" />
                      🔥 稳赢确信 (+10 / -10分)
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">1</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    若判断正确净胜 +10 分；若判断失误扣除 -10 分
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction("SAFE_BET")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAction === "SAFE_BET"
                      ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/20"
                      : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs md:text-sm flex items-center gap-1.5 text-cyan-300">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      🛡️ 稳健保底 (+3分)
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">2</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    无论客观对错均安全保底斩获 +3 分
                  </div>
                </button>
              </div>

              {/* 确认下一题按钮 */}
              <button
                type="button"
                onClick={handleSubmitTrial}
                disabled={!selectedOption || loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedOption && !loading
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                }`}
              >
                {loading ? "正在评估结算..." : "确认，下一题 ↵"}
              </button>
            </div>

            {/* 键盘盲打提示条 */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <span>快捷键：[A/B/C/D] 选答案</span>
              <span>•</span>
              <span>[1/2] 确信/保底</span>
              <span>•</span>
              <span>[H] 看线索</span>
              <span>•</span>
              <span>[Enter] 确认切题</span>
            </div>
          </div>
        )}

        {/* 3. 最终评估报告阶段 */}
        {stage === "REPORT" && report && (
          <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* 称号英雄大卡片 */}
            <div className="glass-panel rounded-3xl p-8 md:p-10 relative overflow-hidden text-center shadow-2xl border border-indigo-500/30">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-3">
                <Award className="w-3.5 h-3.5" /> 认知潜能定位与称号鉴定
              </div>

              <div className="text-xs text-slate-400 mb-2">受测者：{report.subject_name}</div>

              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 mb-2">
                {report.diagnostic_profile.role_title}
              </h2>

              <p className="text-base md:text-lg text-amber-200/90 font-medium tracking-wide mb-6">
                “{report.diagnostic_profile.praise_tagline}”
              </p>

              {/* 核心亮点标签 */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto mb-6">
                {report.diagnostic_profile.strength_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 赋能评语 */}
              <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto text-left bg-black/20 p-5 rounded-2xl border border-white/5">
                {report.diagnostic_profile.empowering_feedback}
              </p>
            </div>

            {/* 专属技能矩阵 */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> 专属认知技能谱系
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.diagnostic_profile.skills.map((skill, idx) => (
                  <div key={idx} className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{skill.icon}</span>
                        <span className="font-bold text-sm text-white">{skill.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        {skill.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{skill.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 量化指标数据仪表盘 */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> 严谨心理测量学量化数据
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">客观正确率</div>
                  <div className="text-base font-bold font-mono text-indigo-400">
                    {Math.round(report.summary.first_order_accuracy * 100)}%
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">一元辨别力 d'</div>
                  <div className="text-base font-bold font-mono text-cyan-400">
                    {report.metacognitive_metrics.d_prime}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">二元 Meta-d'</div>
                  <div className="text-base font-bold font-mono text-purple-400">
                    {report.metacognitive_metrics.meta_d_prime}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">知行自洽 M_ratio</div>
                  <div className="text-base font-bold font-mono text-amber-400">
                    {report.metacognitive_metrics.m_ratio}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">校准偏差 Bias</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {report.metacognitive_metrics.calibration_bias > 0
                      ? `+${report.metacognitive_metrics.calibration_bias}`
                      : report.metacognitive_metrics.calibration_bias}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3.5 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">最终得分</div>
                  <div className="text-base font-bold font-mono text-yellow-400">
                    {report.summary.final_score}
                  </div>
                </div>
              </div>
            </div>

            {/* 成长建议 */}
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs md:text-sm text-indigo-200 leading-relaxed">
              <span className="font-bold text-indigo-300">进阶战略建议：</span>
              {report.diagnostic_profile.growth_advice}
            </div>

            {/* 操作按钮区 */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStage("WELCOME");
                  setReport(null);
                  setTrialData(null);
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors border border-white/10"
              >
                <RotateCcw className="w-4 h-4" /> 再测一次
              </button>

              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `认知测评报告_${report.subject_name}_${report.session_id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" /> 保存报告
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 底部版权与声明 */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/5 mt-8">
        二元元认知测试实验室 · 基于 Levitt 阶梯控制与信号检测论 Type-2 SDT 范式
      </footer>
    </div>
  );
}
