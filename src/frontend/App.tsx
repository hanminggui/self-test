import React, { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Compass,
  Sparkles,
  HelpCircle,
  Flame,
  Shield,
  ArrowRight,
  RotateCcw,
  Download,
  Share2,
  Crown,
  Stars,
  Feather,
  Dices,
} from "lucide-react";

const generateRandomCodename = () => {
  const prefixes = [
    "星轨", "微光", "深空", "虚空", "极境", "无界", "辰极",
    "暗曜", "灵知", "破晓", "幻海", "以太", "云渊", "苍穹", "终焉"
  ];
  const suffixes = [
    "领航员", "漫游者", "探索家", "执剑人", "观测者",
    "寻迹者", "破壁人", "行者", "游侠", "先驱", "守夜人"
  ];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
  return `${p}${s} · ${num}`;
};

interface TrialPayload {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>;
  has_hint: boolean;
  hint_cost: number;
  hint_tier1_cost: number;
  hint_tier2_cost: number;
  hints_unlocked: number;
  unlocked_hints: string[];
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
  diagnostic_profile: {
    role_title: string;
    quadrant_code: string;
    praise_tagline: string;
    strength_tags: string[];
    empowering_feedback: string;
    growth_advice: string;
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
  const [unlockedHints, setUnlockedHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);
  const [placeholderCodename, setPlaceholderCodename] = useState(() => generateRandomCodename());

  // Current trial hint cost
  const hintsCost = unlockedHints.length === 0 ? 0 : unlockedHints.length === 1 ? 1 : 3;

  // Start a new exploration session
  const startSession = async () => {
    setLoading(true);
    setErrorMsg("");
    const finalName = subjectName.trim() || placeholderCodename;
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: finalName,
          total_trials: totalTrials,
          warmup_trials: Math.max(5, Math.floor(totalTrials / 3)),
        }),
      });
      if (!res.ok) throw new Error("旅程启程准备中，请稍候重试");
      const data: TrialRequest = await res.json();
      setSessionId(data.session_id);
      setTrialData(data);
      setSelectedOption(null);
      setSelectedAction("HIGH_BET");
      setUnlockedHints(data.payload.unlocked_hints || []);
      setStage("TESTING");
    } catch (e: any) {
      setErrorMsg(e.message || "网络连接微澜，请稍后刷新");
    } finally {
      setLoading(false);
    }
  };

  // Purchase tiered hint
  const handleBuyHint = async () => {
    if (!sessionId || unlockedHints.length >= 2 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hint`, { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "获取灵感启示失败");
      }
      const data = await res.json();
      setUnlockedHints(data.unlocked_hints || [...unlockedHints, data.hint]);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit trial answer & action
  const handleSubmitTrial = useCallback(async () => {
    if (!sessionId || loading) return;
    if (!selectedOption) {
      setErrorMsg("请先在上方轻点选择一个选项，再确认提交");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Submit Phase 1
      const p1Res = await fetch(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: selectedOption }),
      });
      if (!p1Res.ok) {
        const errJson = await p1Res.json().catch(() => ({}));
        throw new Error(errJson.error || "记录选择中出现微澜");
      }

      // 2. Submit Phase 2: action is selectedAction (HIGH_BET or SAFE_BET)
      const p2Res = await fetch(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          confidence_level: selectedAction === "HIGH_BET" ? 0.90 : 0.55,
          revised_choice: selectedOption,
        }),
      });
      if (!p2Res.ok) {
        const errJson = await p2Res.json().catch(() => ({}));
        throw new Error(errJson.error || "确认决策中出现微澜");
      }
      const p2Data = await p2Res.json();

      if (p2Data.is_completed) {
        let repData = p2Data.report;
        if (!repData) {
          const repRes = await fetch(`/api/sessions/${sessionId}/report`);
          if (!repRes.ok) throw new Error("生成特质名片失败");
          repData = await repRes.json();
        }
        setReport(repData);
        setStage("REPORT");
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.55 },
          colors: ["#f59e0b", "#6366f1", "#a855f7", "#38bdf8"],
        });
      } else {
        // Fetch next trial
        const nextReqRes = await fetch(`/api/sessions/${sessionId}/trial`);
        if (!nextReqRes.ok) throw new Error("获取下一步探索题目失败");
        const nextTrial: TrialRequest = await nextReqRes.json();
        setTrialData(nextTrial);
        setSelectedOption(null);
        setSelectedAction("HIGH_BET");
        setUnlockedHints(nextTrial.payload.unlocked_hints || []);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "请求出现微澜，请重试");
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedOption, selectedAction, loading]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (stage !== "TESTING") return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-4xl mx-auto selection:bg-amber-500/20 selection:text-amber-200">
      {/* 顶部极简静谧标头 */}
      <header className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/30 via-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <Compass className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-wide text-white flex items-center gap-2">
              思维星图 · 专属特质探索
            </h1>
            <p className="text-[11px] text-slate-400">跟随直觉与决断，映射独一无二的深层特质</p>
          </div>
        </div>

        {stage === "TESTING" && trialData && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">探索航程</span>
            <span className="font-mono text-amber-300 font-bold text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              {String(trialData.trial_index).padStart(2, "0")} / {totalTrials}
            </span>
          </div>
        )}
      </header>

      {/* 主体区域 */}
      <main className="flex-1 flex flex-col justify-center">
        {/* 1. 欢迎探索阶段：极致温暖、毫无防备、尊崇体验 */}
        {stage === "WELCOME" && (
          <div className="glass-panel rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto w-full shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mb-6 font-medium">
              <Stars className="w-3.5 h-3.5" />
              沉浸式思维灵觉探索
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              探索属于你的本命特质
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto font-normal">
              放下世俗的评判与对错包袱。这是一场只关乎你<span className="text-amber-300 font-semibold">直觉韵律与决断魄力</span>的静谧探索之旅。
              跟随你的第一感应，发现那份深藏于意识底层的神级特质。
            </p>

            <div className="space-y-4 max-w-sm mx-auto text-left mb-8">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-amber-400" /> 探索者称谓（留空自动随机分配代号）
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename();
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                    title="点击随机掷一个专属代号"
                  >
                    <Dices className="w-3.5 h-3.5" /> 随机代号
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`留空自动唤醒：${placeholderCodename}`}
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename();
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-amber-300 cursor-pointer transition-colors"
                    title="换一个随机代号"
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">探索航程规模</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "深度沉浸旅程 (30步)", val: 30 },
                    { label: "敏捷灵感漫游 (16步)", val: 16 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTotalTrials(opt.val)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${totalTrials === opt.val
                        ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/30"
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
              className="w-full max-w-sm px-6 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white font-semibold text-sm shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mx-auto"
            >
              {loading ? "正在凝铸探索图景..." : "开启探索旅程 →"}
            </button>
          </div>
        )}

        {/* 2. 答题进行阶段：无对错焦虑、无分数扣罚压迫 */}
        {stage === "TESTING" && trialData && (
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* 顶部长条柔和流光进度 */}
            <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                style={{ width: `${(trialData.trial_index / totalTrials) * 100}%` }}
              />
            </div>

            {/* 核心图形与规律卡片 */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-4 border border-white/10">
              <div className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-line font-medium font-sans">
                {trialData.payload.prompt}
              </div>

              {/* 灵感启示抽屉 (多级线索) */}
              {unlockedHints.length > 0 && (
                <div className="space-y-2">
                  {unlockedHints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs md:text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <div className="font-semibold text-amber-300 flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          {idx === 0 ? "线索 1 · 宏观思考方向" : "线索 2 · 细节排除指引"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {idx === 0 ? "消耗 1 分" : "消耗 2 分"}
                        </span>
                      </div>
                      {hint}
                    </div>
                  ))}
                </div>
              )}

              {/* 线索购买操作栏 */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {unlockedHints.length === 0
                    ? "解题遇阻？可按阶梯获取多级解题线索"
                    : `已解锁 ${unlockedHints.length}/2 级线索 (当前本题已扣除 ${hintsCost} 分)`}
                </span>

                {unlockedHints.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    💡 获取宏观线索 (-1分)
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">H</kbd>
                  </button>
                ) : unlockedHints.length === 1 ? (
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-300 hover:text-orange-200 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    🔍 获取细节排除线索 (-2分)
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">H</kbd>
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-400/80 font-mono flex items-center gap-1">
                    ✨ 线索已全部解锁
                  </span>
                )}
              </div>
            </div>

            {/* 2x2 选项卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.entries(trialData.payload.options).map(([key, val]) => {
                const isSelected = selectedOption === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedOption(key)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-3.5 cursor-pointer relative ${isSelected
                      ? "glass-card border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30"
                      : "glass-card border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 transition-colors ${isSelected
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40"
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

            {/* 决断本能选择面板 */}
            <div className="glass-panel rounded-2xl p-5 space-y-4 border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">倾听此刻的本能信心：</span>
                <span className="text-[11px] text-slate-500 font-mono">[1] 确信 · [2] 保底</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAction("HIGH_BET")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${selectedAction === "HIGH_BET"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/25"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/15"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs md:text-sm flex items-center gap-1.5 text-amber-300">
                      <Flame className="w-4 h-4 text-amber-400" />
                      🔥 稳赢确信 (+{10 - hintsCost} / -{10 + hintsCost}分)
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">1</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    直觉清醒坚定，胜券在握全额决断
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAction("SAFE_BET")}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${selectedAction === "SAFE_BET"
                    ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/25"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/15"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs md:text-sm flex items-center gap-1.5 text-cyan-300">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      🛡️ 稳健保底 (+{3 - hintsCost}分)
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">2</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    审慎留白，以守为攻蓄势而动
                  </div>
                </button>
              </div>

              {/* 异常提示横幅 */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {/* 继续前行主按钮 */}
              <button
                type="button"
                onClick={handleSubmitTrial}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedOption && !loading
                    ? trialData.trial_index >= totalTrials
                      ? "bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:brightness-110 text-white shadow-xl shadow-amber-500/30 ring-2 ring-amber-400/40 hover:scale-[1.01] active:scale-[0.99]"
                      : "bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-lg shadow-amber-500/20 active:scale-[0.99]"
                    : "bg-slate-800/80 text-slate-400 border border-white/5 hover:border-white/10"
                }`}
              >
                {loading ? (
                  trialData.trial_index >= totalTrials ? "✨ 正在凝铸专属名片..." : "正在记录感应..."
                ) : !selectedOption ? (
                  "请先在上方轻点选择一个选项 ↵"
                ) : trialData.trial_index >= totalTrials ? (
                  "✨ 完成探索，凝铸专属名片 ↵"
                ) : (
                  "确认，下一题 ↵"
                )}
              </button>
            </div>

            {/* 键盘盲打指引 */}
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

        {/* 3. 最终结果展示页面：零量化数据、神级名片、放下一切防备 */}
        {stage === "REPORT" && report && (
          <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
            {/* 专属本命神级名片卡 */}
            <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden text-center shadow-2xl border border-amber-500/30 glow-gold bg-gradient-to-b from-amber-950/20 via-slate-900/80 to-[#0b0d13]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 mb-4 font-medium shadow-inner">
                <Crown className="w-4 h-4 text-amber-400" /> 专属本命思维特质名片
              </div>

              <div className="text-xs text-slate-400 mb-3 tracking-widest uppercase">
                EXPLORER · {report.subject_name}
              </div>

              {/* 5大专属称号 */}
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 mb-3 drop-shadow-md">
                {report.diagnostic_profile.role_title}
              </h2>

              {/* 专属灵魂 Tagline */}
              <p className="text-lg md:text-xl text-amber-100 font-semibold tracking-wide mb-6">
                “{report.diagnostic_profile.praise_tagline}”
              </p>

              {/* 高光标签 */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto mb-8">
                {report.diagnostic_profile.strength_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 深度赋能评语（极高情绪价值） */}
              <div className="text-sm md:text-base text-slate-200 leading-relaxed max-w-2xl mx-auto text-left bg-black/40 p-6 rounded-2xl border border-white/10 shadow-inner space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4" /> 灵魂特质共鸣解读
                </div>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  {report.diagnostic_profile.empowering_feedback}
                </p>
              </div>
            </div>

            {/* 专属特技谱系 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> 专属天赋特技谱系
                </h3>
                <span className="text-xs text-slate-500">独一无二的思维武器库</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.diagnostic_profile.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-5 border border-white/5 space-y-2 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{skill.icon}</span>
                        <span className="font-bold text-sm text-amber-200">{skill.name}</span>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                        {skill.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">{skill.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 战略建议 */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/20 text-xs md:text-sm text-amber-100 leading-relaxed space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> 进阶赋能战略启示
              </div>
              <p className="text-slate-300 text-xs md:text-sm pt-1">
                {report.diagnostic_profile.growth_advice}
              </p>
            </div>

            {/* 按钮区 */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStage("WELCOME");
                  setReport(null);
                  setTrialData(null);
                }}
                className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors border border-white/10 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" /> 重新启程探索
              </button>

              <button
                type="button"
                onClick={() => {
                  const shareText = `【${report.diagnostic_profile.role_title}】\n“${report.diagnostic_profile.praise_tagline}”\n探索者：${report.subject_name}\n标签：${report.diagnostic_profile.strength_tags.map(t => `#${t}`).join(" ")}\n\n${report.diagnostic_profile.empowering_feedback}`;
                  navigator.clipboard?.writeText(shareText);
                  alert("专属本命名片文案已复制至剪贴板，可随心分享！");
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/30"
              >
                <Share2 className="w-4 h-4" /> 复制专属名片
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 底部极简静谧脚注 */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-white/5 mt-8">
        思维星图 · 映照真实的直觉与自我掌控
      </footer>
    </div>
  );
}
