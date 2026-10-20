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

import { generateSubjectCodename as generateRandomCodename } from "../backend/codename_generator";
import { useLocale } from "./contexts/LocaleContext";
import { LanguageToggle } from "./components/LanguageToggle";
import { PosterModal } from "./components/share/PosterModal";

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
  unlocked_hints?: string[] | { tier1?: string; tier2?: string };
  task_type: string;
}

const normalizeUnlockedHints = (raw?: string[] | { tier1?: string; tier2?: string }): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const res: string[] = [];
  if (raw.tier1) res.push(raw.tier1);
  if (raw.tier2) res.push(raw.tier2);
  return res;
};

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

const cleanOption = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/^(点阵区|几何构型|符号|命题|特征图形|Dot Matrix|Geometry|Symbol|Proposition|Feature Graph)[：:\s\n]*/gi, "")
    .replace(/·/g, "・")
    .trim();
};

const renderSymbolGrid = (matrix: string[][], isOption: boolean = false) => {
  const cols = matrix[0]?.length || 4;
  const isLarge = cols <= 4;
  const cellSize = isOption
    ? (isLarge ? "w-6 h-6 text-sm" : "w-4 h-4 text-[10px]")
    : (isLarge ? "w-8 h-8 sm:w-9 sm:h-9 text-base sm:text-lg" : "w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm");
  const dotSize = isOption
    ? (isLarge ? "w-1.5 h-1.5" : "w-1 h-1")
    : (isLarge ? "w-2 h-2" : "w-1.5 h-1.5");
  const gap = isOption
    ? (isLarge ? "gap-1" : "gap-0.5")
    : (isLarge ? "gap-1.5" : "gap-1");
  const containerPad = isOption
    ? "p-2 rounded-lg bg-slate-950/60 border border-white/5"
    : "p-3 sm:p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 shadow-inner";

  return (
    <div className={`inline-flex flex-col ${gap} ${containerPad} select-none`}>
      {matrix.map((row, rIdx) => (
        <div key={rIdx} className={`flex ${gap}`}>
          {row.map((cell, cIdx) => {
            const isEmpty = cell === "・" || cell === "·";
            return (
              <div
                key={cIdx}
                className={`${cellSize} flex items-center justify-center rounded-md transition-all ${
                  isEmpty
                    ? "bg-slate-900/50 border border-white/5 text-slate-600"
                    : "bg-indigo-950/70 text-amber-300 font-bold border border-indigo-500/40 shadow-sm shadow-indigo-500/20"
                }`}
              >
                {isEmpty ? (
                  <span className={`${dotSize} rounded-full bg-slate-500/70 inline-block`} />
                ) : (
                  <span>{cell}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const renderOption = (rawVal: string) => {
  const val = cleanOption(rawVal);
  const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
  const is2DGrid =
    lines.length >= 2 &&
    lines.every(l => /^[■▲★◆●○□△✦⬡・·\s]+$/.test(l));

  if (is2DGrid) {
    const matrix = lines.map(l => l.split(/\s+/).filter(Boolean));
    const isUniform = matrix.every(r => r.length === matrix[0].length && r.length >= 2);
    if (isUniform) {
      return renderSymbolGrid(matrix, true);
    }
  }

  return (
    <span className="text-xs md:text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-line pt-0.5 inline-block">
      {val}
    </span>
  );
};

const renderPrompt = (rawPrompt: string) => {
  if (!rawPrompt) return null;
  // 1. Strip any residual title like "【任务类型：...】" or "[Task Type: ...]"
  const cleaned = rawPrompt
    .replace(/^(【任务类型[：:][^】]+】|\[Task Type[：:][^\]]+\])\s*/gi, "")
    .replace(/·/g, "・");

  // Split into paragraphs separated by double newlines
  const paragraphs = cleaned.split(/\n\s*\n/);

  return (
    <div className="space-y-3.5">
      {paragraphs.map((p, idx) => {
        const rawLines = p.split("\n");
        const cleanLines = rawLines.map(l => l.trim()).filter(Boolean);

        // 1. Check if this paragraph is a 2D symbol grid (e.g. 4x4 rotation or 7x6 density)
        const is2DGrid =
          cleanLines.length >= 2 &&
          cleanLines.every(l => /^[■▲★◆●○□△✦⬡・·\s]+$/.test(l));

        if (is2DGrid) {
          const matrix = cleanLines.map(l => l.split(/\s+/).filter(Boolean));
          const isUniform = matrix.every(r => r.length === matrix[0].length && r.length >= 2);
          if (isUniform) {
            return (
              <div key={idx} className="my-3">
                {renderSymbolGrid(matrix, false)}
              </div>
            );
          }
        }

        // 2. Check if this paragraph is a structured multi-line block (steps, samples, rows)
        const isStructuredBlock =
          cleanLines.length >= 2 &&
          cleanLines.some(l => /^(\s*第\s*\d+\s*行[:：]|\s*\[(样本|第\d步)[^\]]*\])/.test(l));

        if (isStructuredBlock) {
          return (
            <div
              key={idx}
              className="my-3 p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-indigo-500/25 space-y-2 inline-block min-w-[220px]"
            >
              {cleanLines.map((line, lIdx) => (
                <div key={lIdx} className="font-mono text-sm md:text-base text-indigo-200 leading-relaxed tracking-wider">
                  {line}
                </div>
              ))}
            </div>
          );
        }

        // 3. Standard text paragraph
        return (
          <p key={idx} className="text-sm md:text-base text-slate-200 leading-relaxed font-sans font-medium whitespace-pre-line">
            {cleanLines.join("\n")}
          </p>
        );
      })}
    </div>
  );
};

export default function App() {
  const { locale, t, formatMessage } = useLocale();
  const isEn = locale === "en-US";

  const [stage, setStage] = useState<"WELCOME" | "TESTING" | "REPORT">("WELCOME");
  const [subjectName, setSubjectName] = useState("");
  const [totalTrials, setTotalTrials] = useState(30);

  // Active testing state
  const [sessionId, setSessionId] = useState("");
  const [trialData, setTrialData] = useState<TrialRequest | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [initialChoiceBeforeHint, setInitialChoiceBeforeHint] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<"HIGH_BET" | "SAFE_BET">("HIGH_BET");
  const [unlockedHints, setUnlockedHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [placeholderCodename, setPlaceholderCodename] = useState(() => generateRandomCodename(locale));

  useEffect(() => {
    setPlaceholderCodename(generateRandomCodename(locale));
  }, [locale]);

  // Current trial hint cost
  const hintsCost = unlockedHints.length === 0 ? 0 : unlockedHints.length === 1 ? 1 : 3;

  // Start a new exploration session
  const startSession = async () => {
    setLoading(true);
    setErrorMsg("");
    const finalName = subjectName.trim() || placeholderCodename;
    try {
      const res = await fetch(`/api/sessions/start?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          subject_name: finalName,
          total_trials: totalTrials,
          warmup_trials: Math.max(5, Math.floor(totalTrials / 3)),
        }),
      });
      if (!res.ok) throw new Error(t.app.startErrorFallback);
      const data: TrialRequest = await res.json();
      setSessionId(data.session_id);
      setTrialData(data);
      setSelectedOption(null);
      setInitialChoiceBeforeHint(null);
      setSelectedAction("HIGH_BET");
      setUnlockedHints(normalizeUnlockedHints(data.payload.unlocked_hints));
      setStage("TESTING");
    } catch (e: any) {
      setErrorMsg(e.message || t.app.networkErrorFallback);
    } finally {
      setLoading(false);
    }
  };

  // Purchase tiered hint
  const handleBuyHint = async () => {
    if (!sessionId || unlockedHints.length >= 2 || loading) return;
    if (selectedOption && !initialChoiceBeforeHint) {
      setInitialChoiceBeforeHint(selectedOption);
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hint?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: { "Accept-Language": locale },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.buyHintErrorFallback);
      }
      const data = await res.json();
      setUnlockedHints(
        data.unlocked_hints
          ? normalizeUnlockedHints(data.unlocked_hints)
          : [...unlockedHints, data.hint]
      );
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
      setErrorMsg(t.app.selectOptionWarning);
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const firstChoice = initialChoiceBeforeHint || selectedOption;
      // 1. Submit Phase 1 (first-order choice prior to hint revision if captured)
      const p1Res = await fetch(`/api/sessions/${sessionId}/phase1?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ choice: firstChoice }),
      });
      if (!p1Res.ok) {
        const errJson = await p1Res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.recordChoiceError);
      }

      // 2. Submit Phase 2: action is selectedAction (HIGH_BET or SAFE_BET)
      const p2Res = await fetch(`/api/sessions/${sessionId}/phase2?lang=${encodeURIComponent(locale)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          action: selectedAction,
          confidence_level: selectedAction === "HIGH_BET" ? 0.95 : 0.50,
          revised_choice: selectedOption,
        }),
      });
      if (!p2Res.ok) {
        const errJson = await p2Res.json().catch(() => ({}));
        throw new Error(errJson.error || t.app.confirmDecisionError);
      }
      const p2Data = await p2Res.json();

      if (p2Data.is_completed) {
        let repData = p2Data.report;
        if (!repData) {
          const repRes = await fetch(`/api/sessions/${sessionId}/report?lang=${encodeURIComponent(locale)}`, {
            headers: { "Accept-Language": locale },
          });
          if (!repRes.ok) throw new Error(t.app.generateReportError);
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
        const nextReqRes = await fetch(`/api/sessions/${sessionId}/trial?lang=${encodeURIComponent(locale)}`, {
          headers: { "Accept-Language": locale },
        });
        if (!nextReqRes.ok) throw new Error(t.app.fetchNextTrialError);
        const nextTrial: TrialRequest = await nextReqRes.json();
        setTrialData(nextTrial);
        setSelectedOption(null);
        setInitialChoiceBeforeHint(null);
        setSelectedAction("HIGH_BET");
        setUnlockedHints(normalizeUnlockedHints(nextTrial.payload.unlocked_hints));
      }
    } catch (e: any) {
      setErrorMsg(e.message || t.app.networkErrorFallback);
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedOption, initialChoiceBeforeHint, selectedAction, loading, locale, t]);

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
              {t.app.appTitle}
            </h1>
            <p className="text-[11px] text-slate-400">{t.app.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stage === "TESTING" && trialData && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">{t.app.voyageProgress}</span>
              <span className="font-mono text-amber-300 font-bold text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                {String(trialData.trial_index).padStart(2, "0")} / {totalTrials}
              </span>
            </div>
          )}
          <LanguageToggle />
        </div>
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
              {t.app.welcomeBadge}
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t.app.welcomeTitle}
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto font-normal">
              {t.app.welcomeDesc}
            </p>

            <div className="space-y-4 max-w-sm mx-auto text-left mb-8">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-amber-400" /> {t.app.explorerNameLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename(locale);
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                    title={t.app.randomCodenameBtn}
                  >
                    <Dices className="w-3.5 h-3.5" /> {t.app.randomCodenameBtn}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={formatMessage(t.app.placeholderCodename, { name: placeholderCodename })}
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = generateRandomCodename(locale);
                      setPlaceholderCodename(next);
                      setSubjectName(next);
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-amber-300 cursor-pointer transition-colors"
                    title={t.app.randomCodenameBtn}
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.app.voyageScaleLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t.app.scale30, val: 30 },
                    { label: t.app.scale16, val: 16 },
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
              {loading ? t.app.startingVoyage : t.app.startVoyageBtn}
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
              {renderPrompt(trialData.payload.prompt)}

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
                          {idx === 0 ? t.app.clue1Title : t.app.clue2Title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {idx === 0 ? t.app.cost1Pt : t.app.cost2Pt}
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
                    ? t.app.hintHint0
                    : formatMessage(t.app.hintHintN, { count: unlockedHints.length, cost: hintsCost })}
                </span>

                {unlockedHints.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleBuyHint}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {t.app.buyClue1Btn}
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
                    {t.app.buyClue2Btn}
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">H</kbd>
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-400/80 font-mono flex items-center gap-1">
                    {t.app.cluesAllUnlocked}
                  </span>
                )}
              </div>
            </div>

            {/* 2x2 选项卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Object.entries(trialData.payload.options).map(([key, rawVal]) => {
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
                    <div className="flex-1 min-w-0">
                      {renderOption(rawVal)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 决断本能选择面板 */}
            <div className="glass-panel rounded-2xl p-5 space-y-4 border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{t.app.instinctPrompt}</span>
                <span className="text-[11px] text-slate-500 font-mono">{t.app.instinctShortcuts}</span>
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
                      {formatMessage(t.app.highBetTitle, { pos: 10 - hintsCost, neg: 10 + hintsCost })}
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">1</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t.app.highBetDesc}
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
                      {formatMessage(t.app.safeBetTitle, { pos: 3 - hintsCost })}
                    </span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">2</kbd>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t.app.safeBetDesc}
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
                  trialData.trial_index >= totalTrials ? t.app.castingCard : t.app.recordingImpression
                ) : !selectedOption ? (
                  t.app.selectOptionFirst
                ) : trialData.trial_index >= totalTrials ? (
                  t.app.finishVoyageBtn
                ) : (
                  t.app.nextTrialBtn
                )}
              </button>
            </div>

            {/* 键盘盲打指引 */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
              {t.app.shortcutsGuide}
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
                <Crown className="w-4 h-4 text-amber-400" /> {t.app.archetypeCardHeader}
              </div>

              <div className="text-xs text-slate-400 mb-3 tracking-widest uppercase">
                {formatMessage(t.app.explorerPrefix, { name: report.subject_name })}
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
                  <Sparkles className="w-4 h-4" /> {t.app.soulResonance}
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
                  <Sparkles className="w-4 h-4 text-amber-400" /> {t.app.innateSkills}
                </h3>
                <span className="text-xs text-slate-500">{t.app.arsenalSubtitle}</span>
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
                <Compass className="w-4 h-4" /> {t.app.strategicAdvice}
              </div>
              <p className="text-slate-300 text-xs md:text-sm pt-1">
                {report.diagnostic_profile.growth_advice}
              </p>
            </div>

            {/* 按钮区 */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStage("WELCOME");
                  setReport(null);
                  setTrialData(null);
                }}
                className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors border border-white/10 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" /> {t.app.restartVoyage}
              </button>

              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-amber-500/30 active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4 text-slate-950" /> {t.app.shareBtn}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 统一分享海报弹窗 (多语言自适应分流) */}
      {showPosterModal && report && (
        <PosterModal
          isOpen={showPosterModal}
          report={report}
          locale={locale}
          onClose={() => setShowPosterModal(false)}
        />
      )}

      {/* 底部极简静谧脚注 */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-white/5 mt-8">
        {t.app.footerText}
      </footer>
    </div>
  );
}
