import React, { useState } from "react";
import {
  Compass,
  Sparkles,
  HelpCircle,
  Flame,
  Shield,
  ArrowRight,
  Check,
  Info,
  Lock,
} from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";
import { useGameEffects } from "../../contexts/GameEffectsContext";
import { BottomSheet } from "../common/BottomSheet";

export interface TrialPayload {
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

export interface TrialRequest {
  session_id: string;
  trial_index: number;
  phase: string;
  payload: TrialPayload;
}

export interface MobileAssessmentViewProps {
  trialData: TrialRequest;
  totalTrials: number;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  selectedAction: "HIGH_BET" | "SAFE_BET";
  onSelectAction: (action: "HIGH_BET" | "SAFE_BET") => void;
  unlockedHints: string[];
  hintsCost: number;
  onBuyHint: () => Promise<void>;
  onSubmitTrial: () => Promise<void>;
  loading: boolean;
  errorMsg: string;
  inAppLayout?: boolean;
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
    ? (isLarge ? "w-5 h-5 text-xs" : "w-4 h-4 text-[9px]")
    : (cols <= 4
        ? "w-7 h-7 sm:w-8 sm:h-8 text-sm"
        : cols <= 6
        ? "w-6 h-6 text-xs"
        : "w-5 h-5 text-[10px]");
  const dotSize = isOption
    ? "w-1 h-1"
    : (cols <= 4 ? "w-1.5 h-1.5" : "w-1 h-1");
  const gap = isOption
    ? "gap-0.5"
    : (cols <= 4 ? "gap-1" : "gap-0.5");
  const containerPad = isOption
    ? "p-1.5 rounded-lg bg-[#FFFBEB] dark:bg-[#12121C] border border-stone-900/30 dark:border-white/20 shadow-[0_1px_0_#1c1917] dark:shadow-none"
    : "p-2.5 sm:p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]";

  return (
    <div className={`inline-flex flex-col ${gap} ${containerPad} select-none max-w-full overflow-x-auto`}>
      {matrix.map((row, rIdx) => (
        <div key={rIdx} className={`flex ${gap}`}>
          {row.map((cell, cIdx) => {
            const isEmpty = cell === "・" || cell === "·";
            return (
              <div
                key={cIdx}
                className={`${cellSize} flex items-center justify-center rounded-md transition-all font-black shrink-0 ${
                  isEmpty
                    ? "bg-amber-100/70 dark:bg-[#12121C] border border-stone-400/40 dark:border-white/20 text-stone-500 dark:text-slate-400"
                    : "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border border-stone-900 dark:border-[#CCFF00] shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
                }`}
              >
                {isEmpty ? (
                  <span className={`${dotSize} rounded-full bg-stone-500 dark:bg-white/40 inline-block`} />
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
    <span className="text-[11px] sm:text-xs text-stone-900 dark:text-white leading-tight font-mono font-medium line-clamp-3 break-words">
      {val}
    </span>
  );
};

const renderPrompt = (rawPrompt: string) => {
  if (!rawPrompt) return null;
  const cleaned = rawPrompt
    .replace(/^(【任务类型[：:][^】]+】|\[Task Type[：:][^\]]+\])\s*/gi, "")
    .replace(/·/g, "・");

  const paragraphs = cleaned.split(/\n\s*\n/);

  return (
    <div className="space-y-2.5">
      {paragraphs.map((p, idx) => {
        const rawLines = p.split("\n");
        const cleanLines = rawLines.map(l => l.trim()).filter(Boolean);

        const is2DGrid =
          cleanLines.length >= 2 &&
          cleanLines.every(l => /^[■▲★◆●○□△✦⬡・·\s]+$/.test(l));

        if (is2DGrid) {
          const matrix = cleanLines.map(l => l.split(/\s+/).filter(Boolean));
          const isUniform = matrix.every(r => r.length === matrix[0].length && r.length >= 2);
          if (isUniform) {
            return (
              <div key={idx} className="my-1.5 flex justify-center max-w-full overflow-x-auto">
                {renderSymbolGrid(matrix, false)}
              </div>
            );
          }
        }

        const isStructuredBlock =
          cleanLines.length >= 2 &&
          cleanLines.some(l => /^(\s*第\s*\d+\s*行[:：]|\s*\[(样本|第\d步)[^\]]*\])/.test(l));

        if (isStructuredBlock) {
          return (
            <div
              key={idx}
              className="my-1.5 p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#38BDF8] shadow-[0_2.5px_0_#1c1917] dark:shadow-[2px_2px_0px_#38BDF8] space-y-1.5 max-w-full overflow-x-auto inline-block min-w-full"
            >
              {cleanLines.map((line, lIdx) => (
                <div key={lIdx} className="font-mono text-xs sm:text-sm text-stone-950 dark:text-cyan-300 font-black leading-relaxed tracking-wider break-all">
                  {line}
                </div>
              ))}
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs sm:text-sm text-stone-950 dark:text-white leading-relaxed font-sans font-bold whitespace-pre-line break-words">
            {cleanLines.join("\n")}
          </p>
        );
      })}
    </div>
  );
};

export const MobileAssessmentView: React.FC<MobileAssessmentViewProps> = ({
  trialData,
  totalTrials,
  selectedOption,
  onSelectOption,
  selectedAction,
  onSelectAction,
  unlockedHints,
  hintsCost,
  onBuyHint,
  onSubmitTrial,
  loading,
  errorMsg,
  inAppLayout = false,
}) => {
  const { t, formatMessage } = useLocale();
  const [isHintSheetOpen, setIsHintSheetOpen] = useState(false);

  return (
    <div
      data-testid="mobile-assessment-view"
      className="h-full min-h-0 w-full max-w-full flex flex-col bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white relative overflow-hidden select-none"
    >
      {/* 1. 顶部状态栏：航程进度与线索触发 */}
      <header
        className={`shrink-0 border-b border-stone-200 dark:border-white/10 bg-[#FFFDF8]/95 dark:bg-[#08080C]/95 backdrop-blur-sm z-10 px-3.5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 ${
          inAppLayout ? "pl-14" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* 进度计数器 */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF3C7] dark:bg-[#CCFF00] border border-stone-900 dark:border-black text-stone-950 dark:text-[#08080C] text-xs font-black font-mono shadow-[0_1.5px_0_#1c1917] dark:shadow-none shrink-0">
              <Compass className="w-3.5 h-3.5 text-stone-900 dark:text-[#08080C]" />
              <span>
                {String(trialData.trial_index).padStart(2, "0")} / {totalTrials}
              </span>
            </span>
          </div>

          {/* 灵感线索抽屉唤起按钮 (触控热区 >= 44x44) */}
          <button
            type="button"
            data-testid="mobile-hint-trigger"
            onClick={() => setIsHintSheetOpen(true)}
            aria-label="查看解题线索"
            className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-black border border-stone-900 dark:border-white/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 touch-manipulation ${
              unlockedHints.length > 0
                ? "bg-[#FEF3C7] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] shadow-[0_2px_0_#1c1917] dark:shadow-none"
                : "bg-white dark:bg-[#12121C] text-stone-900 dark:text-white hover:bg-amber-50 dark:hover:bg-white/10 shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-500 dark:text-[#08080C]" />
            <span>
              {unlockedHints.length > 0
                ? `线索 (${unlockedHints.length}/2)`
                : "解题灵感"}
            </span>
          </button>
        </div>

        {/* 顶部进度长条 */}
        <div className="w-full h-2 bg-[#FEF3C7] dark:bg-[#12121C] rounded-full border border-stone-900/30 dark:border-white/20 overflow-hidden mt-2">
          <div
            className="h-full bg-[#10B981] dark:bg-[#CCFF00] transition-all duration-300 rounded-full"
            style={{ width: `${(trialData.trial_index / totalTrials) * 100}%` }}
          />
        </div>
      </header>

      {/* 2. 上部弹性滚动题干内容区 (高清晰度、支持自适应缩放、无左右截断) */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3 space-y-3">
        {/* 核心图形与题干卡片 */}
        <section
          data-testid="mobile-prompt-card"
          className="bg-white dark:bg-[#0E0E16] rounded-2xl p-4 border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] space-y-3"
        >
          {renderPrompt(trialData.payload.prompt)}

          {/* 若已解锁线索，题干下方渲染精巧导流提示 */}
          {unlockedHints.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHintSheetOpen(true)}
              className="w-full text-left p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 text-stone-900 dark:text-white text-xs flex items-center justify-between min-h-[44px] cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  已解锁 {unlockedHints.length}/2 级线索 (已扣 {hintsCost} 分)
                </span>
              </span>
              <span className="text-[11px] font-bold text-amber-700 dark:text-[#CCFF00]">
                查看内容 →
              </span>
            </button>
          )}
        </section>

        {/* 异常提示横幅 */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#FFE4E6] dark:bg-[#FF3366]/20 border-2 border-stone-900 dark:border-[#FF3366] text-rose-700 dark:text-[#FF3366] font-bold text-xs text-center shadow-[0_2px_0_#1c1917] dark:shadow-none">
            {errorMsg}
          </div>
        )}
      </main>

      {/* 3. 底部固定常驻拇指触控操作栏 (Bottom Action Dock) */}
      <footer
        data-testid="bottom-action-dock"
        className="shrink-0 bg-[#FFFDF8]/95 dark:bg-[#0E0E16]/95 backdrop-blur-md border-t-2 border-stone-900 dark:border-white/20 px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(28,25,23,0.12)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.6)] space-y-2 z-20"
      >
        {/* 单选选项矩阵 (2x2 触控大卡片，热区 >= 44x44) */}
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={t.app?.selectOptionWarning || "选项矩阵"}
        >
          {Object.entries(trialData.payload.options).map(([key, rawVal]) => {
            const isSelected = selectedOption === key;
            const badgeColor =
              key === "A"
                ? "bg-[#FBBF24]"
                : key === "B"
                ? "bg-[#FB7185]"
                : key === "C"
                ? "bg-[#34D399]"
                : "bg-[#38BDF8]";

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`mobile-option-${key}`}
                onClick={() => onSelectOption(key)}
                className={`min-h-[50px] p-2 rounded-xl border-2 text-left transition-all flex items-center gap-2 cursor-pointer relative select-none touch-manipulation active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#D1FAE5] dark:bg-[#0E0E16] border-stone-900 dark:border-[#CCFF00] ring-2 ring-emerald-600 dark:ring-0 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]"
                    : "bg-white dark:bg-[#12121C] border-stone-900/30 dark:border-white/20 text-stone-950 dark:text-white shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs font-mono shrink-0 border border-stone-900 dark:border-white/20 ${badgeColor} ${
                    isSelected
                      ? "dark:bg-[#CCFF00] dark:text-[#08080C] dark:border-[#CCFF00]"
                      : "dark:bg-black/60 dark:text-white"
                  } text-stone-950`}
                >
                  {key}
                </span>
                <div className="flex-1 min-w-0 overflow-hidden">
                  {renderOption(rawVal)}
                </div>
              </button>
            );
          })}
        </div>

        {/* 置信度下注控件 (易于单手点选，热区 >= 44x44) */}
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={t.app?.instinctPrompt || "决断本能选择"}
        >
          <button
            type="button"
            role="radio"
            aria-checked={selectedAction === "HIGH_BET"}
            data-testid="mobile-wager-high"
            onClick={() => onSelectAction("HIGH_BET")}
            className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-1 select-none touch-manipulation active:scale-[0.98] ${
              selectedAction === "HIGH_BET"
                ? "bg-[#FFE4E6] dark:bg-[#FF3366] text-stone-950 dark:text-white border-stone-900 dark:border-[#FF3366] shadow-[0_2.5px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]"
                : "bg-white dark:bg-[#12121C] text-stone-800 dark:text-white border-stone-900/30 dark:border-white/20 shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Flame
                className={`w-4 h-4 shrink-0 ${
                  selectedAction === "HIGH_BET"
                    ? "text-rose-600 fill-rose-500 dark:text-white dark:fill-white"
                    : "text-rose-500 fill-rose-400"
                }`}
              />
              <div className="text-left min-w-0">
                <div className="text-xs font-black truncate leading-tight">
                  {formatMessage(t.app?.highBetTitle || "🔥 确信 (+{pos}/-{neg})", {
                    pos: 10 - hintsCost,
                    neg: 10 + hintsCost,
                  })}
                </div>
              </div>
            </div>
            <kbd
              className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold shrink-0 ${
                selectedAction === "HIGH_BET"
                  ? "bg-white/90 dark:bg-black/40 text-stone-950 dark:text-white"
                  : "bg-stone-100 dark:bg-black/60 text-stone-600 dark:text-slate-400"
              }`}
            >
              1
            </kbd>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selectedAction === "SAFE_BET"}
            data-testid="mobile-wager-safe"
            onClick={() => onSelectAction("SAFE_BET")}
            className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-1 select-none touch-manipulation active:scale-[0.98] ${
              selectedAction === "SAFE_BET"
                ? "bg-[#E0F2FE] dark:bg-[#38BDF8] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-[#38BDF8] shadow-[0_2.5px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]"
                : "bg-white dark:bg-[#12121C] text-stone-800 dark:text-white border-stone-900/30 dark:border-white/20 shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Shield
                className={`w-4 h-4 shrink-0 ${
                  selectedAction === "SAFE_BET"
                    ? "text-sky-600 fill-sky-500 dark:text-[#08080C] dark:fill-[#08080C]"
                    : "text-sky-500 fill-sky-400"
                }`}
              />
              <div className="text-left min-w-0">
                <div className="text-xs font-black truncate leading-tight">
                  {formatMessage(t.app?.safeBetTitle || "🛡️ 保底 (+{pos})", {
                    pos: 3 - hintsCost,
                  })}
                </div>
              </div>
            </div>
            <kbd
              className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold shrink-0 ${
                selectedAction === "SAFE_BET"
                  ? "bg-white/90 dark:bg-black/40 text-stone-950 dark:text-[#08080C]"
                  : "bg-stone-100 dark:bg-black/60 text-stone-600 dark:text-slate-400"
              }`}
            >
              2
            </kbd>
          </button>
        </div>

        {/* 提交/切题主操作按钮 (触控热区 >= 48px) */}
        <button
          type="button"
          data-testid="mobile-submit-trial-btn"
          onClick={onSubmitTrial}
          disabled={loading || !selectedOption}
          className={`w-full min-h-[48px] py-3 rounded-2xl font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5 active:shadow-none select-none touch-manipulation ${
            selectedOption && !loading
              ? "bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF]"
              : "bg-[#E7E5E4] dark:bg-[#12121C] text-stone-400 dark:text-slate-600 border-stone-400 dark:border-white/10 shadow-[0_1.5px_0_#1c1917] dark:shadow-none cursor-not-allowed"
          }`}
        >
          {loading ? (
            trialData.trial_index >= totalTrials ? (
              t.app.castingCard
            ) : (
              t.app.recordingImpression
            )
          ) : !selectedOption ? (
            t.app.selectOptionFirst
          ) : trialData.trial_index >= totalTrials ? (
            <>
              <span>{t.app.finishVoyageBtn}</span>
              <Sparkles className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>{t.app.nextTrialBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </footer>

      {/* 4. 滑起式 BottomSheet 抽屉展现解题线索 */}
      <BottomSheet
        isOpen={isHintSheetOpen}
        onClose={() => setIsHintSheetOpen(false)}
        title={
          <span className="flex items-center gap-2 text-stone-950 dark:text-white">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20" />
            <span>解题灵感线索</span>
          </span>
        }
        subtitle="按需阶梯式解锁破局提示，分值直接影响本题结算"
        showDragHandle={true}
        showCloseButton={true}
        desktopMaxWidth="max-w-md"
        className="text-left"
      >
        <div className="space-y-4">
          {/* 提示消耗分值说明 */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 text-xs text-stone-800 dark:text-slate-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>线索分值扣减规则</span>
            </div>
            <p className="leading-relaxed">
              {unlockedHints.length === 0
                ? t.app.hintHint0
                : formatMessage(t.app.hintHintN, { count: unlockedHints.length, cost: hintsCost })}
            </p>
          </div>

          {/* 已解锁或待解锁的线索卡片 */}
          <div className="space-y-3">
            {/* Tier 1 线索 */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 space-y-2 shadow-[0_2px_0_#1c1917] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-stone-900 dark:text-[#CCFF00] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  {t.app.clue1Title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-black/60 border border-stone-900 dark:border-white/20 text-stone-900 dark:text-[#CCFF00] font-mono">
                  {t.app.cost1Pt}
                </span>
              </div>
              {unlockedHints[0] ? (
                <div className="text-xs text-stone-800 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-[#0E0E16] p-2.5 rounded-xl border border-stone-200 dark:border-white/10">
                  {unlockedHints[0]}
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="buy-hint-tier1-btn"
                  onClick={async () => {
                    await onBuyHint();
                  }}
                  disabled={loading}
                  className="w-full min-h-[48px] py-2.5 px-3 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs border border-stone-900 dark:border-black flex items-center justify-center gap-1.5 shadow-[0_2px_0_#1c1917] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t.app.buyClue1Btn}</span>
                </button>
              )}
            </div>

            {/* Tier 2 线索 */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 space-y-2 shadow-[0_2px_0_#1c1917] dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-stone-900 dark:text-[#CCFF00] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  {t.app.clue2Title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-black/60 border border-stone-900 dark:border-white/20 text-stone-900 dark:text-[#CCFF00] font-mono">
                  {t.app.cost2Pt}
                </span>
              </div>
              {unlockedHints[1] ? (
                <div className="text-xs text-stone-800 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-[#0E0E16] p-2.5 rounded-xl border border-stone-200 dark:border-white/10">
                  {unlockedHints[1]}
                </div>
              ) : unlockedHints[0] ? (
                <button
                  type="button"
                  data-testid="buy-hint-tier2-btn"
                  onClick={async () => {
                    await onBuyHint();
                  }}
                  disabled={loading}
                  className="w-full min-h-[48px] py-2.5 px-3 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] font-black text-xs border border-stone-900 dark:border-black flex items-center justify-center gap-1.5 shadow-[0_2px_0_#1c1917] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t.app.buyClue2Btn}</span>
                </button>
              ) : (
                <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1 py-2.5 bg-stone-100 dark:bg-white/5 rounded-xl border border-dashed border-stone-300 dark:border-white/15">
                  <Lock className="w-3.5 h-3.5" />
                  <span>需先解锁第 1 级宏观线索</span>
                </div>
              )}
            </div>
          </div>

          {unlockedHints.length >= 2 && (
            <div className="text-center py-1 text-xs font-black text-emerald-700 dark:text-[#CCFF00] flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>{t.app.cluesAllUnlocked}</span>
            </div>
          )}

          {/* 收起抽屉按钮 */}
          <button
            type="button"
            onClick={() => setIsHintSheetOpen(false)}
            className="w-full min-h-[44px] py-2.5 rounded-xl border-2 border-stone-900 dark:border-white/20 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-stone-900 dark:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            收起抽屉
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
