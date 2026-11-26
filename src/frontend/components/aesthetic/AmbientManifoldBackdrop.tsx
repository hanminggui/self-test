import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { SimplexNoise } from "../../utils/simplexNoise";
import {
  pointsToSmoothCubicPath,
  computeAestheticParameters,
  reportToAestheticSession,
  AestheticSessionData,
} from "../../utils/aestheticEngine";

interface AmbientManifoldBackdropProps {
  /** Optional report or aesthetic session to personalize the backdrop hue & harmonics */
  report?: any;
  session?: AestheticSessionData | null;
  /** Subtle intensity variant: "subtle" for dense UIs/tests, "rich" for landing/report */
  intensity?: "subtle" | "rich";
  className?: string;
}

/**
 * AmbientManifoldBackdrop
 *
 * Low-contrast, computationally generated topographic & harmonic backdrop.
 * Designed strictly as an atmospheric surface that preserves >=4.5:1 foreground legibility
 * across both Light (Editorial Parchment) and Dark (Obsidian Cyber) themes.
 */
export const AmbientManifoldBackdrop: React.FC<AmbientManifoldBackdropProps> = ({
  report,
  session,
  intensity = "subtle",
  className = "",
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? "dark" : "light";

  const activeSession = useMemo(() => {
    if (session) return session;
    if (report) return reportToAestheticSession(report);
    return null;
  }, [session, report]);

  const visual = useMemo(() => {
    const W = 1440;
    const H = 900;

    if (activeSession) {
      const p = computeAestheticParameters(activeSession, W, H, {
        theme,
        surface: "ambient",
        showHud: false,
      });
      return {
        primary: p.primaryColor,
        secondary: p.secondaryColor,
        aura: p.auraColor,
        muted: p.mutedInkColor,
        wavePaths: p.waveLayers.map((w) => w.strokeD),
        waveFills: p.waveLayers.map((w) => w.d),
        waveFillColors: p.waveLayers.map((w) => w.fill),
        resonancePaths: p.resonancePaths,
        stars: p.ambientStars,
      };
    }

    // Default serene harmonic field (for Landing / Welcome / Testing)
    const noise = new SimplexNoise(42);
    const wavePaths: string[] = [];
    const waveFills: string[] = [];
    const waveFillColors: string[] = [];

    const ribbonCount = 5;
    for (let w = 0; w < ribbonCount; w++) {
      const baseY = H * (0.34 + w * 0.145);
      const pts: Array<[number, number]> = [];
      for (let c = 0; c <= 24; c++) {
        const px = (W * c) / 24;
        const nVal = noise.noise2D([px * 0.0018 + w * 0.9, w * 1.4]);
        const py = baseY + Math.sin(px * 0.0042 + w * 1.1) * 34 + nVal * 46;
        pts.push([px, py]);
      }
      const strokeD = pointsToSmoothCubicPath(pts, false, 0.5);
      wavePaths.push(strokeD);
      waveFills.push(`${strokeD} L ${W} ${H} L 0 ${H} Z`);
      waveFillColors.push(
        isDark
          ? w % 2 === 0
            ? "#CCFF00"
            : "#38BDF8"
          : w % 2 === 0
          ? "#F59E0B"
          : "#10B981"
      );
    }

    // Subtle polar astrolabe resonance arcs centered top-right
    const cx = W * 0.82;
    const cy = H * 0.22;
    const resonancePaths: string[] = [];
    for (let rIdx = 0; rIdx < 2; rIdx++) {
      const pts: Array<[number, number]> = [];
      const baseR = 170 + rIdx * 95;
      for (let s = 0; s < 72; s++) {
        const theta = (2 * Math.PI * s) / 72;
        const rad = baseR + Math.cos(5 * theta + rIdx) * 14 + Math.sin(7 * theta) * 7;
        pts.push([cx + rad * Math.cos(theta), cy + rad * Math.sin(theta)]);
      }
      resonancePaths.push(pointsToSmoothCubicPath(pts, true, 0.5));
    }

    return {
      primary: isDark ? "#CCFF00" : "#D97706",
      secondary: isDark ? "#38BDF8" : "#059669",
      aura: isDark ? "#38BDF8" : "#FBBF24",
      muted: isDark ? "#94A3B8" : "#78716C",
      wavePaths,
      waveFills,
      waveFillColors,
      resonancePaths,
      stars: [],
    };
  }, [activeSession, theme, isDark]);

  const strokeOpacity =
    intensity === "rich"
      ? isDark
        ? 0.14
        : 0.11
      : isDark
      ? 0.085
      : 0.075;

  const fillOpacity =
    intensity === "rich"
      ? isDark
        ? 0.045
        : 0.04
      : isDark
      ? 0.025
      : 0.024;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 select-none ${className}`}
    >
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="ambient-top-aura" cx="82%" cy="16%" r="52%">
            <stop
              offset="0%"
              stopColor={visual.primary}
              stopOpacity={isDark ? (intensity === "rich" ? 0.13 : 0.08) : (intensity === "rich" ? 0.11 : 0.07)}
            />
            <stop
              offset="60%"
              stopColor={visual.secondary}
              stopOpacity={isDark ? 0.035 : 0.03}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ambient-bottom-aura" cx="16%" cy="84%" r="50%">
            <stop
              offset="0%"
              stopColor={visual.secondary}
              stopOpacity={isDark ? (intensity === "rich" ? 0.11 : 0.06) : (intensity === "rich" ? 0.09 : 0.055)}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft Ambient Atmospheric Blooms */}
        <rect width="1440" height="900" fill="url(#ambient-top-aura)" />
        <rect width="1440" height="900" fill="url(#ambient-bottom-aura)" />

        {/* Harmonic Topographic Ribbons */}
        <g>
          {visual.waveFills.map((d, idx) => (
            <path
              key={`fill-${idx}`}
              d={d}
              fill={visual.waveFillColors[idx]}
              opacity={fillOpacity * (0.7 + idx * 0.18)}
            />
          ))}
          {visual.wavePaths.map((d, idx) => (
            <path
              key={`stroke-${idx}`}
              d={d}
              fill="none"
              stroke={idx % 2 === 0 ? visual.primary : visual.secondary}
              strokeWidth={1.1}
              opacity={strokeOpacity * (0.85 + idx * 0.1)}
            />
          ))}
        </g>

        {/* Subtle Harmonic Resonance Contours */}
        <g>
          {visual.resonancePaths.map((d, idx) => (
            <path
              key={`res-${idx}`}
              d={d}
              fill="none"
              stroke={idx === 0 ? visual.primary : visual.secondary}
              strokeWidth={1}
              strokeDasharray={idx === 1 ? "4 6" : undefined}
              opacity={strokeOpacity * 1.15}
            />
          ))}
        </g>

        {/* Subtle Coordinate Hairlines */}
        <g stroke={visual.muted} opacity={isDark ? 0.055 : 0.05} strokeWidth="0.8">
          <line x1="0" y1="450" x2="1440" y2="450" strokeDasharray="3 8" />
          <line x1="720" y1="0" x2="720" y2="900" strokeDasharray="3 8" />
        </g>

        {/* Ambient Dust */}
        {visual.stars.map((s, i) => (
          <circle
            key={`star-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.color}
            opacity={s.opacity * 0.65}
          />
        ))}
      </svg>
    </div>
  );
};

export default AmbientManifoldBackdrop;
