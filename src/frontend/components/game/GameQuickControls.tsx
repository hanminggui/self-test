import React from "react";
import { Volume2, VolumeX, Sparkles, EyeOff } from "lucide-react";
import { useGameEffects } from "../../contexts/GameEffectsContext";
import { useLocale } from "../../contexts/LocaleContext";

export interface GameQuickControlsProps {
  className?: string;
  compact?: boolean;
}

export const GameQuickControls: React.FC<GameQuickControlsProps> = ({
  className = "",
  compact = false,
}) => {
  const { soundMode, motionMode, toggleSound, toggleMotion, playSound } =
    useGameEffects();
  const { t } = useLocale();

  const isMuted = soundMode === "muted";
  const isReduced = motionMode === "reduced";

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-white/95 dark:bg-white/[0.04] border border-stone-900/15 dark:border-white/10 shadow-sm dark:shadow-none ${className}`}
    >
      {/* Sound Toggle Button */}
      <button
        type="button"
        onClick={() => {
          toggleSound();
          if (isMuted) {
            playSound("tap");
          }
        }}
        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
          isMuted
            ? "text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5"
            : "text-amber-900 bg-amber-100 border border-amber-500/45 hover:bg-amber-200/75 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 dark:hover:bg-amber-500/25"
        }`}
        title={t.gameEffects?.toggleSoundQuick || "Toggle sound"}
        aria-label={t.gameEffects?.toggleSoundQuick || "Toggle sound"}
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        {!compact && (
          <span className="text-[10px] font-mono hidden md:inline">
            {isMuted ? "MUTE" : "AUDIO"}
          </span>
        )}
      </button>

      {/* Motion Level Toggle Button */}
      <button
        type="button"
        onClick={() => {
          toggleMotion();
          playSound("tap");
        }}
        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
          isReduced
            ? "text-cyan-900 bg-cyan-100 border border-cyan-600/40 hover:bg-cyan-200/70 dark:text-cyan-300 dark:bg-cyan-500/15 dark:border-cyan-500/30"
            : "text-stone-800 hover:text-stone-950 hover:bg-stone-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
        }`}
        title={t.gameEffects?.toggleMotionQuick || "Toggle motion"}
        aria-label={t.gameEffects?.toggleMotionQuick || "Toggle motion"}
      >
        {isReduced ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-[#CCFF00]" />
        )}
        {!compact && (
          <span className="text-[10px] font-mono hidden md:inline">
            {isReduced ? "REDUCED" : "MOTION"}
          </span>
        )}
      </button>
    </div>
  );
};
