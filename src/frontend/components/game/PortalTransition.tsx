import React from "react";
import { Sparkles, Compass } from "lucide-react";
import { useGameEffects } from "../../contexts/GameEffectsContext";

export interface PortalTransitionProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PortalTransition: React.FC<PortalTransitionProps> = ({
  size = "md",
  className = "",
}) => {
  const { isReducedMotion, isEcoMode } = useGameEffects();

  const dimensions =
    size === "sm"
      ? "w-16 h-16"
      : size === "lg"
      ? "w-44 h-44 sm:w-52 sm:h-52"
      : "w-28 h-28 sm:w-36 sm:h-36";

  const spinClass = isReducedMotion
    ? ""
    : "animate-spin [animation-duration:8s]";
  const reverseSpinClass = isReducedMotion
    ? ""
    : "animate-spin [animation-duration:12s] [animation-direction:reverse]";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}
    >
      {/* Outer Halo */}
      {!isEcoMode && (
        <div
          className="absolute inset-0 rounded-full bg-[#FBBF24]/20 dark:bg-[#CCFF00]/15 blur-xl"
        />
      )}

      {/* Outer Portal Ring: Playful dashed Dopamine Ring (Light) / Cyber Acid Ring (Dark) */}
      <div
        className={`portal-ring absolute inset-0 rounded-full border-[2.5px] border-dashed border-stone-900 dark:border-[#CCFF00]/60 ${spinClass}`}
      >
        {/* Cardinal Markers */}
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FB7185] dark:bg-[#FF3366] border-2 border-stone-900 dark:border-black shadow-sm" />
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#10B981] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black shadow-sm" />
        <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#38BDF8] dark:bg-[#38BDF8] border-2 border-stone-900 dark:border-black shadow-sm" />
        <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FBBF24] dark:bg-[#FFFFFF] border-2 border-stone-900 dark:border-black shadow-sm" />
      </div>

      {/* Middle Concentric Orbit */}
      <div
        className={`absolute inset-3 sm:inset-4 rounded-full border-2 border-stone-900/40 dark:border-white/20 ${reverseSpinClass}`}
      >
        <span className="absolute top-1/4 right-0 w-2.5 h-2.5 rounded-full bg-[#FBBF24] dark:bg-[#CCFF00] border border-stone-900 dark:border-black" />
        <span className="absolute bottom-1/4 left-0 w-2.5 h-2.5 rounded-full bg-[#38BDF8] dark:bg-[#38BDF8] border border-stone-900 dark:border-black" />
      </div>

      {/* Portal Singularity Core */}
      <div
        className={`portal-core relative z-10 rounded-full bg-[#FFFBEB] dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] ${
          size === "sm"
            ? "w-8 h-8"
            : size === "lg"
            ? "w-20 h-20 sm:w-24 sm:h-24"
            : "w-14 h-14 sm:w-16 sm:h-16"
        }`}
      >
        <Compass
          className={`text-stone-900 dark:text-[#CCFF00] ${
            size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-7 h-7"
          }`}
        />
        {!isEcoMode && !isReducedMotion && (
          <span className="absolute -top-1 -right-1 text-sm">✨</span>
        )}
      </div>
    </div>
  );
};
