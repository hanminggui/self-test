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

  // 1. Level Shift Variant (Playful Neo-brutalist Floating Badge)
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
          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] ${
            isUp
              ? "bg-[#FEF3C7] dark:bg-[#0E0E16] text-stone-900 dark:text-white"
              : "bg-[#E0F2FE] dark:bg-[#0E0E16] text-stone-900 dark:text-white"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl border-2 border-stone-900 dark:border-black flex items-center justify-center shrink-0 shadow-[0_2px_0_#1c1917] dark:shadow-none ${
              isUp
                ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-900 dark:text-[#08080C]"
                : "bg-[#38BDF8] dark:bg-[#38BDF8] text-stone-900 dark:text-[#08080C]"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <TrendingDown className="w-4 h-4 stroke-[2.5]" />
            )}
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>
                {isUp
                  ? t.gameEffects?.levelShiftUpTitle || "难度跃迁"
                  : t.gameEffects?.levelShiftDownTitle || "阶梯自适应校准"}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#12121C] border border-stone-900 dark:border-[#CCFF00] text-stone-900 dark:text-[#CCFF00]">
                Lv.{level}
              </span>
            </div>
            <p className="text-[11px] text-stone-700 dark:text-slate-300 font-medium">
              {isUp
                ? t.gameEffects?.levelShiftUpDesc || "根据一阶高准度表现，系统已自动提升认知难度梯度"
                : t.gameEffects?.levelShiftDownDesc || "正在调整探测步长，持续定位您的认知敏锐边界"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fullscreen or Inline Overlay Containers: Scheme C (Light) & Scheme B (Dark)
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFFDF8]/95 dark:bg-[#08080C]/96 backdrop-blur-md px-6 select-none"
    : "relative w-full py-12 flex flex-col items-center justify-center bg-white dark:bg-[#0E0E16] rounded-3xl border-2 border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] px-6 select-none";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${containerClasses} ${className} ${
        isReducedMotion ? "" : "animate-in fade-in duration-300"
      }`}
    >
      {/* Background Dopamine Floating Dots / Cyber Neon Glow */}
      {!isEcoMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-[#FBBF24] dark:bg-[#CCFF00] blur-2xl" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-[#FB7185] dark:bg-[#FF3366] blur-2xl" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-[#34D399] dark:bg-[#38BDF8] blur-2xl" />
        </div>
      )}

      {/* Main Tactile Card Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full bg-white dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-white/20 rounded-[28px] shadow-[0_8px_0_#1c1917] dark:shadow-[6px_6px_0px_#CCFF00] p-8 space-y-6">
        {variant === "portal" && <PortalTransition size={fullScreen ? "lg" : "md"} />}

        {variant === "charge" && (
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="w-20 h-20 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] flex items-center justify-center">
              <Zap className="w-10 h-10 text-stone-900 dark:text-[#CCFF00] fill-[#FBBF24] dark:fill-[#CCFF00]" />
            </div>
          </div>
        )}

        {variant === "settlement" && (
          <div className="relative flex items-center justify-center w-24 h-24">
            <div className="w-20 h-20 rounded-2xl bg-[#E0F2FE] dark:bg-[#12121C] border-[2.5px] border-stone-900 dark:border-[#38BDF8] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#38BDF8] flex items-center justify-center relative">
              <Cpu className="w-10 h-10 text-stone-900 dark:text-[#38BDF8]" />
              <span className="absolute -top-2 -right-2 text-xl">✨</span>
            </div>
          </div>
        )}

        {/* Text Area */}
        <div className="space-y-2">
          {title && (
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stepped Deduction Checklist for Settlement */}
        {variant === "settlement" && steps && steps.length > 0 && (
          <div className="w-full space-y-2.5 pt-1 text-left">
            {steps.map((stepText, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                    isCurrent
                      ? "bg-[#FEF3C7] dark:bg-[#CCFF00] text-stone-900 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-none scale-[1.02]"
                      : isDone
                      ? "bg-[#D1FAE5] dark:bg-[#12121C] text-stone-900 dark:text-[#CCFF00] border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-none"
                      : "bg-[#FFFDF8] dark:bg-[#12121C]/50 text-stone-400 dark:text-slate-500 border-stone-300 dark:border-white/10 opacity-60"
                  }`}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-[#CCFF00] fill-emerald-100 dark:fill-transparent" />
                    ) : isCurrent ? (
                      <Compass
                        className={`w-5 h-5 text-amber-600 dark:text-[#08080C] ${
                          isReducedMotion ? "" : "animate-spin"
                        }`}
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-stone-400 dark:border-white/20 font-bold block text-[10px] text-center leading-4 text-stone-500 dark:text-slate-500">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold tracking-wide flex-1 truncate">
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
                  className="px-5 py-2 rounded-full text-xs font-bold text-stone-800 dark:text-white bg-[#FFFBEB] dark:bg-[#12121C] hover:bg-[#FEF3C7] dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  {isEn ? "Skip deduction · View report →" : "跳过推演 · 直接查看报告 →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Progress Bar */}
        {typeof progress === "number" && (
          <div className="w-full space-y-1.5 pt-2">
            <div className="w-full h-3 bg-amber-100 dark:bg-[#12121C] rounded-full overflow-hidden border-2 border-stone-900 dark:border-white/20">
              <div
                className="h-full bg-[#10B981] dark:bg-[#CCFF00] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="text-[11px] font-mono font-bold text-stone-700 dark:text-[#CCFF00] text-right">
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
