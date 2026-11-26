import { CognitiveArchetype } from "../../../backend/models";

export interface PosterSurfacePalette {
  isLight: boolean;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  dustDotColor: string;
  dustOpacity: string;
  headerBg: string;
  headerBorder: string;
  subtitleColor: string;
  avatarBg: string;
  avatarShadow: string;
  avatarRingColor: string;
  ribbonBg: string;
  ribbonText: string;
  titleColor: string;
  titleShadow: string;
  taglineColor: string;
  tagBg: string;
  tagBorder: string;
  tagText: string;
  skillCardBg: string;
  skillCardBorder: string;
  skillTitleColor: string;
  skillBadgeBg: string;
  skillBadgeBorder: string;
  skillBadgeText: string;
  skillDescColor: string;
  insightBg: string;
  insightBorder: string;
  insightLabelColor: string;
  insightTextColor: string;
  qrPanelBg: string;
  qrPanelBorder: string;
  qrTitleColor: string;
  qrSubColor: string;
  qrFrameBorder: string;
  footerBg: string;
  footerBorder: string;
  footerTextColor: string;
  actionPrimaryBg: string;
  actionPrimaryText: string;
  actionPrimaryShadow: string;
  actionSecondaryClass: string;
  actionIconColor: string;
}

interface LightInkSpec {
  accentInk: string;
  accentDeep: string;
  tintSoft: string;
  tintBorder: string;
  paperInner: string;
  paperOuter: string;
  glowSoft: string;
  dotColor: string;
}

const LIGHT_SPECS: Record<string, LightInkSpec> = {
  [CognitiveArchetype.SOVEREIGN]: {
    accentInk: "#b45309",
    accentDeep: "#78350f",
    tintSoft: "rgba(217, 119, 6, 0.08)",
    tintBorder: "rgba(180, 83, 9, 0.24)",
    paperInner: "#FFFDF7",
    paperOuter: "#F9F1DF",
    glowSoft: "rgba(217, 119, 6, 0.14)",
    dotColor: "#d97706",
  },
  [CognitiveArchetype.ADAPTIVE_LEARNER]: {
    accentInk: "#047857",
    accentDeep: "#064e3b",
    tintSoft: "rgba(5, 150, 105, 0.08)",
    tintBorder: "rgba(4, 120, 87, 0.24)",
    paperInner: "#FCFEFC",
    paperOuter: "#EFF7F2",
    glowSoft: "rgba(16, 185, 129, 0.14)",
    dotColor: "#059669",
  },
  [CognitiveArchetype.VIGILANT_SENTINEL]: {
    accentInk: "#0369a1",
    accentDeep: "#0c4a6e",
    tintSoft: "rgba(2, 132, 199, 0.08)",
    tintBorder: "rgba(3, 105, 161, 0.24)",
    paperInner: "#FCFDFE",
    paperOuter: "#EDF5FA",
    glowSoft: "rgba(14, 165, 233, 0.14)",
    dotColor: "#0284c7",
  },
  [CognitiveArchetype.AUDACIOUS_PIONEER]: {
    accentInk: "#c2410c",
    accentDeep: "#7c2d12",
    tintSoft: "rgba(234, 88, 12, 0.08)",
    tintBorder: "rgba(194, 65, 12, 0.24)",
    paperInner: "#FFFDFB",
    paperOuter: "#FAF0E8",
    glowSoft: "rgba(249, 115, 22, 0.14)",
    dotColor: "#ea580c",
  },
  [CognitiveArchetype.ANXIOUS_RETREATER]: {
    accentInk: "#334155",
    accentDeep: "#0f172a",
    tintSoft: "rgba(71, 85, 105, 0.08)",
    tintBorder: "rgba(51, 65, 85, 0.24)",
    paperInner: "#FCFDFE",
    paperOuter: "#EFF2F6",
    glowSoft: "rgba(100, 116, 139, 0.14)",
    dotColor: "#64748b",
  },
  [CognitiveArchetype.BLIND_GAMBLER]: {
    accentInk: "#a16207",
    accentDeep: "#713f12",
    tintSoft: "rgba(202, 138, 4, 0.09)",
    tintBorder: "rgba(161, 98, 7, 0.26)",
    paperInner: "#FFFDF6",
    paperOuter: "#FBF3DC",
    glowSoft: "rgba(234, 179, 8, 0.15)",
    dotColor: "#ca8a04",
  },
  [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
    accentInk: "#be123c",
    accentDeep: "#881337",
    tintSoft: "rgba(190, 18, 60, 0.07)",
    tintBorder: "rgba(190, 18, 60, 0.22)",
    paperInner: "#FFFDFB",
    paperOuter: "#FAF0EE",
    glowSoft: "rgba(225, 29, 72, 0.13)",
    dotColor: "#e11d48",
  },
  [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
    accentInk: "#6d28d9",
    accentDeep: "#4c1d95",
    tintSoft: "rgba(109, 40, 217, 0.08)",
    tintBorder: "rgba(109, 40, 217, 0.24)",
    paperInner: "#FDFCFF",
    paperOuter: "#F3EFFB",
    glowSoft: "rgba(139, 92, 246, 0.14)",
    dotColor: "#7c3aed",
  },
};

export interface DarkColorSchemeLike {
  primaryGold: string;
  secondaryGold: string;
  accentColor: string;
  bgRadialInner: string;
  bgRadialOuter: string;
  glowColor: string;
  cardBorder: string;
  badgeBg: string;
}

export function resolvePosterSurfacePalette(
  archetype: CognitiveArchetype | string,
  darkColors: DarkColorSchemeLike,
  isLight: boolean,
  variant: "mythic" | "arcane"
): PosterSurfacePalette {
  if (!isLight) {
    return {
      isLight: false,
      cardBg: `radial-gradient(circle at 50% 25%, ${darkColors.bgRadialInner} 0%, ${darkColors.bgRadialOuter} 65%, #050608 100%)`,
      cardBorder: darkColors.cardBorder,
      cardShadow: `0 25px 60px -15px ${darkColors.glowColor}, 0 0 40px -10px ${darkColors.primaryGold}33`,
      dustDotColor: variant === "mythic" ? "#fef08a" : "#c084fc",
      dustOpacity: "opacity-40",
      headerBg: "rgba(0, 0, 0, 0.20)",
      headerBorder: "rgba(255, 255, 255, 0.10)",
      subtitleColor: "#94a3b8",
      avatarBg: "rgba(0, 0, 0, 0.55)",
      avatarShadow: `0 0 24px ${darkColors.glowColor}, inset 0 0 12px rgba(0, 0, 0, 0.6)`,
      avatarRingColor: darkColors.primaryGold,
      ribbonBg: "rgba(0, 0, 0, 0.75)",
      ribbonText: darkColors.secondaryGold,
      titleColor: darkColors.secondaryGold,
      titleShadow: `0 0 20px ${darkColors.glowColor}`,
      taglineColor: variant === "mythic" ? "#fef3c7" : "#f3e8ff",
      tagBg: darkColors.badgeBg,
      tagBorder: `${darkColors.primaryGold}66`,
      tagText: darkColors.secondaryGold,
      skillCardBg: "rgba(0, 0, 0, 0.60)",
      skillCardBorder: "rgba(255, 255, 255, 0.10)",
      skillTitleColor: darkColors.secondaryGold,
      skillBadgeBg: darkColors.badgeBg,
      skillBadgeBorder: `${darkColors.primaryGold}44`,
      skillBadgeText: darkColors.secondaryGold,
      skillDescColor: "#cbd5e1",
      insightBg: "rgba(0, 0, 0, 0.40)",
      insightBorder: "rgba(255, 255, 255, 0.10)",
      insightLabelColor: darkColors.secondaryGold,
      insightTextColor: "#cbd5e1",
      qrPanelBg: "rgba(0, 0, 0, 0.60)",
      qrPanelBorder: "rgba(255, 255, 255, 0.10)",
      qrTitleColor: "#ffffff",
      qrSubColor: "#94a3b8",
      qrFrameBorder: `${darkColors.primaryGold}66`,
      footerBg: "rgba(0, 0, 0, 0.40)",
      footerBorder: "rgba(255, 255, 255, 0.06)",
      footerTextColor: "#64748b",
      actionPrimaryBg: darkColors.primaryGold,
      actionPrimaryText: variant === "mythic" ? "#080709" : "#ffffff",
      actionPrimaryShadow: `0 4px 14px ${darkColors.glowColor}`,
      actionSecondaryClass:
        "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 shadow-md",
      actionIconColor: darkColors.primaryGold,
    };
  }

  const spec = LIGHT_SPECS[archetype] || LIGHT_SPECS[CognitiveArchetype.SOVEREIGN];

  return {
    isLight: true,
    cardBg: `radial-gradient(circle at 50% 18%, ${spec.paperInner} 0%, ${spec.paperOuter} 100%)`,
    cardBorder: spec.tintBorder,
    cardShadow: "0 18px 42px -18px rgba(28, 25, 23, 0.16), 0 4px 12px -4px rgba(28, 25, 23, 0.06)",
    dustDotColor: spec.dotColor,
    dustOpacity: "opacity-[0.14]",
    headerBg: "rgba(255, 253, 248, 0.65)",
    headerBorder: "rgba(28, 25, 23, 0.08)",
    subtitleColor: "#78716c",
    avatarBg: "#FFFFFF",
    avatarShadow: `0 10px 26px -10px ${spec.glowSoft}, inset 0 0 0 1px rgba(28,25,23,0.04)`,
    avatarRingColor: spec.accentInk,
    ribbonBg: "#1c1917",
    ribbonText: "#FFFDF8",
    titleColor: spec.accentDeep,
    titleShadow: "none",
    taglineColor: "#44403c",
    tagBg: spec.tintSoft,
    tagBorder: spec.tintBorder,
    tagText: spec.accentDeep,
    skillCardBg: "rgba(255, 255, 255, 0.84)",
    skillCardBorder: "rgba(28, 25, 23, 0.09)",
    skillTitleColor: "#1c1917",
    skillBadgeBg: spec.tintSoft,
    skillBadgeBorder: spec.tintBorder,
    skillBadgeText: spec.accentDeep,
    skillDescColor: "#44403c",
    insightBg: "rgba(255, 255, 255, 0.72)",
    insightBorder: "rgba(28, 25, 23, 0.09)",
    insightLabelColor: spec.accentInk,
    insightTextColor: "#292524",
    qrPanelBg: "rgba(255, 255, 255, 0.9)",
    qrPanelBorder: "rgba(28, 25, 23, 0.09)",
    qrTitleColor: "#1c1917",
    qrSubColor: "#57534e",
    qrFrameBorder: "rgba(28, 25, 23, 0.14)",
    footerBg: "rgba(28, 25, 23, 0.03)",
    footerBorder: "rgba(28, 25, 23, 0.08)",
    footerTextColor: "#78716c",
    actionPrimaryBg: "#1c1917",
    actionPrimaryText: "#FFFDF8",
    actionPrimaryShadow: "0 8px 20px -8px rgba(28, 25, 23, 0.35)",
    actionSecondaryClass:
      "bg-white/95 hover:bg-stone-50 text-stone-800 border border-stone-900/12 shadow-sm",
    actionIconColor: spec.accentInk,
  };
}
