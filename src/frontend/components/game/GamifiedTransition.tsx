import React, { useEffect } from "react";
import {
  Compass,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Cpu,
  Layers,
} from "lucide-react";
import { PortalTransition } from "./PortalTransition";
import { useGameEffects } from "../../contexts/GameEffectsContext";
import { useLocale } from "../../contexts/LocaleContext";

export type TransitionVariant =
  | "portal"
  | "charge"
  | "settlement"
  | "level_shift";

export interface GamifiedTransitionProps {
  active: boolean;
  variant?: TransitionVariant;
  title?: string;
  subtitle?: string;
  steps?: string[];
  currentStepIndex?: number;
  progress?: number;
  direction?: "up" | "down";
  level?: number;
  fullScreen?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export const GamifiedTransition: React.FC<GamifiedTransitionProps> = ({
  active,
  variant = "portal",
  title,
  subtitle,
  steps,
  currentStepIndex = 0,
  progress,
  direction = "up",
  level = 1,
  fullScreen = true,
  onComplete,
  onSkip,
  className = "",
}) => {
  const { isReducedMotion, isEcoMode, triggerHaptic } = useGameEffects();
  const { locale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  useEffect(() => {
    if (active) {
      triggerHaptic("light");
      if (onComplete) {
        onComplete();
      }
    }
  }, [active, triggerHaptic, onComplete]);

  if (!active) return null;

  // 1. Level Shift Variant (Lightweight floating HUD badge)
  if (variant === "level_shift") {
    const isUp = direction === "up";
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          isReducedMotion ? "opacity-100" : "animate-in fade-in zoom-in-95 duration-200"
        } ${className}`}
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            isUp
              ? "bg-amber-950/85 border-amber-400/50 text-amber-200 shadow-amber-500/25"
              : "bg-cyan-950/85 border-cyan-400/50 text-cyan-200 shadow-cyan-500/25"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isUp ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>
                {isUp
                  ? t.gameEffects?.levelShiftUpTitle || "难度跃迁"
                  : t.gameEffects?.levelShiftDownTitle || "阶梯自适应校准"}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10">
                Lv.{level}
              </span>
            </div>
            <p className="text-[10px] opacity-80">
              {isUp
                ? t.gameEffects?.levelShiftUpDesc || "根据一阶高准度表现，系统已自动提升认知难度梯度"
                : t.gameEffects?.levelShiftDownDesc || "正在调整探测步长，持续定位您的认知敏锐边界"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fullscreen or Inline Overlay Containers for Portal / Charge / Settlement / Warp
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070912]/92 backdrop-blur-2xl px-6 select-none"
    : "relative w-full py-12 flex flex-col items-center justify-center bg-[#070912]/80 backdrop-blur-lg rounded-3xl border border-white/10 px-6 select-none";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${containerClasses} ${className} ${
        isReducedMotion ? "" : "animate-in fade-in duration-300"
      }`}
    >
      {/* Background Ambient Cosmic Fog */}
      {!isEcoMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-32 right-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px]" />
        </div>
      )}

      {/* Main Core Visual */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-6">
        {variant === "portal" && <PortalTransition size={fullScreen ? "lg" : "md"} />}

        {variant === "charge" && (
          <div className="relative flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36">
            {!isEcoMode && (
              <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
            )}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-slate-900 to-indigo-500/20 border border-amber-400/40 flex items-center justify-center shadow-2xl">
              <Zap
                className={`w-10 h-10 text-amber-300 ${
                  isReducedMotion ? "" : "animate-bounce"
                }`}
              />
            </div>
          </div>
        )}

        {variant === "settlement" && (
          <div className="relative flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36">
            {!isEcoMode && (
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
            )}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-400/50 flex items-center justify-center shadow-2xl shadow-indigo-950/60">
              <Cpu
                className={`w-12 h-12 text-indigo-300 ${
                  isReducedMotion ? "" : "animate-pulse"
                }`}
              />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-300 animate-spin [animation-duration:6s]" />
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="space-y-2">
          {title && (
            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-white tracking-wide">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stepped Deduction Checklist for Settlement */}
        {variant === "settlement" && steps && steps.length > 0 && (
          <div className="w-full space-y-2.5 pt-2 text-left">
            {steps.map((stepText, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-amber-500/15 border-amber-400/50 text-amber-200 shadow-md shadow-amber-950/40"
                      : isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 opacity-90"
                      : "bg-slate-900/40 border-white/5 text-slate-500 opacity-50"
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Compass
                        className={`w-4 h-4 text-amber-400 ${
                          isReducedMotion ? "" : "animate-spin"
                        }`}
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-600 block text-[9px] text-center leading-3.5">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold tracking-wide flex-1 truncate">
                    {stepText}
                  </span>
                </div>
              );
            })}

            {onSkip && (
              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-4 py-1.5 rounded-full text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  {isEn ? "Skip deduction · View report →" : "跳过推演 · 直接查看报告 →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Progress Bar (if provided or charging) */}
        {typeof progress === "number" && (
          <div className="w-full space-y-1.5 pt-2">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400 text-right">
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
