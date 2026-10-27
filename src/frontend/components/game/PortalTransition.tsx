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
      ? "w-48 h-48 sm:w-60 sm:h-60"
      : "w-32 h-32 sm:w-40 sm:h-40";

  const spinClass = isReducedMotion
    ? ""
    : "animate-spin [animation-duration:8s]";
  const reverseSpinClass = isReducedMotion
    ? ""
    : "animate-spin [animation-duration:12s] [animation-direction:reverse]";
  const pulseClass = isReducedMotion ? "" : "animate-pulse";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}
    >
      {/* Outer Glow Halo (suppressed or toned down in eco mode) */}
      {!isEcoMode && (
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-indigo-600/25 to-cyan-500/20 blur-xl ${pulseClass}`}
        />
      )}

      {/* Outer Portal Ring: Celestial Runic Ring */}
      <div
        className={`portal-ring absolute inset-0 rounded-full border-2 border-dashed border-amber-400/35 ${spinClass}`}
        style={{
          boxShadow: isEcoMode
            ? "none"
            : "0 0 25px rgba(245, 158, 11, 0.25), inset 0 0 20px rgba(99, 102, 241, 0.2)",
        }}
      >
        {/* Runic Cardinal Markers */}
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-400 shadow-sm" />
        <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
        <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-sm" />
      </div>

      {/* Middle Concentric Orbit */}
      <div
        className={`absolute inset-3 sm:inset-4 rounded-full border border-indigo-400/30 ${reverseSpinClass}`}
      >
        <span className="absolute top-1/4 right-0 w-1.5 h-1.5 rounded-full bg-amber-300" />
        <span className="absolute bottom-1/4 left-0 w-1.5 h-1.5 rounded-full bg-cyan-300" />
      </div>

      {/* Portal Singularity Core */}
      <div
        className={`portal-core relative z-10 rounded-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-amber-950 border border-amber-400/60 flex items-center justify-center shadow-xl shadow-indigo-950/60 ${
          size === "sm"
            ? "w-8 h-8"
            : size === "lg"
            ? "w-24 h-24 sm:w-28 sm:h-28"
            : "w-16 h-16 sm:w-20 sm:h-20"
        }`}
      >
        <Compass
          className={`text-amber-300 ${
            size === "sm" ? "w-4 h-4" : size === "lg" ? "w-12 h-12" : "w-8 h-8"
          } ${isReducedMotion ? "" : "animate-pulse"}`}
        />
        {!isEcoMode && (
          <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-ping [animation-duration:2s]" />
        )}
      </div>
    </div>
  );
};
