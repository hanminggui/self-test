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
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 ${className}`}
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
        className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
          isMuted
            ? "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            : "text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25"
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
        className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
          isReduced
            ? "text-cyan-300 bg-cyan-500/15 border border-cyan-500/30"
            : "text-slate-300 hover:text-white hover:bg-white/5"
        }`}
        title={t.gameEffects?.toggleMotionQuick || "Toggle motion"}
        aria-label={t.gameEffects?.toggleMotionQuick || "Toggle motion"}
      >
        {isReduced ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
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
