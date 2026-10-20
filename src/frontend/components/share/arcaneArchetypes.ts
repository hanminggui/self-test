/**
 * Western Arcane Archetypes Configuration (arcaneArchetypes.ts)
 * 
 * Maps 8 Metacognitive Archetypes to Western High-Fantasy Arcane Orders,
 * Celestial Astrolabe Crests, Hermetic Seals, and Astral Gold Aesthetics.
 */

import { CognitiveArchetype } from "../../../backend/models";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";

export interface ArcaneColorScheme {
  primaryGold: string;
  secondaryGold: string;
  accentColor: string;
  bgRadialInner: string;
  bgRadialOuter: string;
  glowColor: string;
  cardBorder: string;
  badgeBg: string;
}

export interface ArcaneSkillItem {
  icon: string;
  type: string;
  name: string;
  desc: string;
}

export interface ArcaneArchetypeConfig {
  archetype: CognitiveArchetype;
  quadrantCode: string;
  roleTitle: string;
  praiseTagline: string;
  orderTitle: string;
  sealText: string;
  crestSymbol: string;
  colorScheme: ArcaneColorScheme;
  strengthTags: string[];
  skills: ArcaneSkillItem[];
  empoweringFeedback: string;
}

export const ARCANE_ARCHETYPES: Record<CognitiveArchetype, ArcaneArchetypeConfig> = {
  [CognitiveArchetype.SOVEREIGN]: {
    archetype: CognitiveArchetype.SOVEREIGN,
    quadrantCode: "Q1-CAL",
    roleTitle: "The Grand Archmage",
    praiseTagline: "Sight Beyond the Veil · Unerring Decree",
    orderTitle: "Order of the Grand Archmage",
    sealText: "AETHER SIGHT",
    crestSymbol: "✦",
    colorScheme: {
      primaryGold: "#a855f7",
      secondaryGold: "#f3e8ff",
      accentColor: "#c084fc",
      bgRadialInner: "#1f1035",
      bgRadialOuter: "#0b0514",
      glowColor: "rgba(168, 85, 247, 0.45)",
      cardBorder: "rgba(168, 85, 247, 0.5)",
      badgeBg: "rgba(168, 85, 247, 0.15)",
    },
    strengthTags: ["Omniscient Insight", "Aether Sight", "Sovereign Coherence", "Flawless Execution"],
    skills: [
      {
        icon: "👁️",
        type: "Passive Trait",
        name: "Eye of Aether",
        desc: "Filters out >90% extraneous noise in complex abstract puzzles, piercing straight to the invariant essence.",
      },
      {
        icon: "🎯",
        type: "Core Aptitude",
        name: "Precision Incantation",
        desc: "Exceptional resolution over internal cognitive states, locking in 100% certainty the instant deduction crystallizes.",
      },
      {
        icon: "⚡",
        type: "Awakened Mastery",
        name: "Arcane Coherence",
        desc: "Flawless resonance between decision strategy and objective reality, maximizing net payoff with effortless poise.",
      },
      {
        icon: "👑",
        type: "Battle Synergy",
        name: "Grand Strategist Bond",
        desc: "High-order architecture breakthroughs, spearheading campaigns across uncharted domains.",
      },
    ],
    empoweringFeedback:
      "You exhibit the supreme poise of the Grand Archmage! Your foundational logic pierces complex veils effortlessly, matched by unmatched second-order awareness of your cognitive horizon.",
  },

  [CognitiveArchetype.ADAPTIVE_LEARNER]: {
    archetype: CognitiveArchetype.ADAPTIVE_LEARNER,
    quadrantCode: "Q2-EVO",
    roleTitle: "The Mystic Alchemist",
    praiseTagline: "The Philosopher's Mirror · Transmuting Doubt into Gold",
    orderTitle: "Order of the Alchemical Flame",
    sealText: "AURUM VITAE",
    crestSymbol: "⚗️",
    colorScheme: {
      primaryGold: "#10b981",
      secondaryGold: "#a7f3d0",
      accentColor: "#34d399",
      bgRadialInner: "#062217",
      bgRadialOuter: "#030e09",
      glowColor: "rgba(16, 185, 129, 0.45)",
      cardBorder: "rgba(16, 185, 129, 0.5)",
      badgeBg: "rgba(16, 185, 129, 0.15)",
    },
    strengthTags: ["Supreme Epistemic Humility", "Boundless Upside", "Transmutation Sight", "Adaptive Mastery"],
    skills: [
      {
        icon: "🪞",
        type: "Passive Trait",
        name: "The Philosopher's Mirror",
        desc: "Acute epistemic clarity: senses instantly where knowledge ends and the uncharted begins with zero self-delusion.",
      },
      {
        icon: "🛡️",
        type: "Core Aptitude",
        name: "Transmutation Ward",
        desc: "Triggers intuitive caution in ambiguous terrain, skillfully transmuting external hints into unshakeable truth.",
      },
      {
        icon: "⚡",
        type: "Awakened Mastery",
        name: "Magnum Opus Breakthrough",
        desc: "Boundless learning bandwidth; every subtle whisper and error is swiftly metabolized into foundational wisdom.",
      },
      {
        icon: "✨",
        type: "Battle Synergy",
        name: "Alchemical Vanguard Bond",
        desc: "Cross-disciplinary innovation, rapid assimilation of novel paradigms, catalyst of transformation.",
      },
    ],
    empoweringFeedback:
      "As above, so below. You possess the rarest gift among scholars—lucid, uncompromising honesty regarding your cognitive frontier, transmuting every whisper into pure gold.",
  },

  [CognitiveArchetype.VIGILANT_SENTINEL]: {
    archetype: CognitiveArchetype.VIGILANT_SENTINEL,
    quadrantCode: "Q3-SEN",
    roleTitle: "The Aegis Paladin",
    praiseTagline: "Unbreakable Bastion · Shield of the Realm",
    orderTitle: "Order of the Iron Aegis",
    sealText: "AEGIS SHIELD",
    crestSymbol: "🛡️",
    colorScheme: {
      primaryGold: "#38bdf8",
      secondaryGold: "#e0f2fe",
      accentColor: "#0ea5e9",
      bgRadialInner: "#06182a",
      bgRadialOuter: "#020a13",
      glowColor: "rgba(56, 189, 248, 0.45)",
      cardBorder: "rgba(56, 189, 248, 0.5)",
      badgeBg: "rgba(56, 189, 248, 0.15)",
    },
    strengthTags: ["Ironclad Bastion", "Zero-Black-Swan", "Discipline of Stone", "Unyielding Vigilance"],
    skills: [
      {
        icon: "🏛️",
        type: "Passive Trait",
        name: "Aegis Bulwark",
        desc: "Exceptional subconscious deduction and defensive floor; immune to panic and rash bluffs in deep mist.",
      },
      {
        icon: "🔍",
        type: "Core Aptitude",
        name: "Vigilant Ward",
        desc: "Uncompromising rigor and verification discipline, eliminating black-swan hazards before they form.",
      },
      {
        icon: "🌊",
        type: "Awakened Mastery",
        name: "Citadel of Calm",
        desc: "When system crises rage, anchors the entire fellowship with tranquil poise and unbreachable defenses.",
      },
      {
        icon: "🛡️",
        type: "Battle Synergy",
        name: "Realm Guardian Bond",
        desc: "Mission-critical reliability, core safety infrastructure gatekeeper, anchor of major milestones.",
      },
    ],
    empoweringFeedback:
      "Your objective bedrock runs infinitely deeper than you imagine! Even when your answers are flawless, you maintain sacred reverence for the unknown.",
  },

  [CognitiveArchetype.AUDACIOUS_PIONEER]: {
    archetype: CognitiveArchetype.AUDACIOUS_PIONEER,
    quadrantCode: "Q4-PIO",
    roleTitle: "The Solar Conqueror",
    praiseTagline: "Crowned in Fire · Fortune Favors the Bold",
    orderTitle: "Order of the Solar Vanguard",
    sealText: "SOLAR CREST",
    crestSymbol: "⚔️",
    colorScheme: {
      primaryGold: "#f97316",
      secondaryGold: "#ffedd5",
      accentColor: "#ea580c",
      bgRadialInner: "#260e05",
      bgRadialOuter: "#0f0502",
      glowColor: "rgba(249, 115, 22, 0.45)",
      cardBorder: "rgba(249, 115, 22, 0.5)",
      badgeBg: "rgba(249, 115, 22, 0.15)",
    },
    strengthTags: ["Searing Breakthrough", "Conqueror's Wrath", "Audacious Conviction", "Fearless Dominion"],
    skills: [
      {
        icon: "🔥",
        type: "Passive Trait",
        name: "Solar Edge",
        desc: "High energy density and ferocious deductive tempo, cleaving through convoluted mazes on pure momentum.",
      },
      {
        icon: "⚔️",
        type: "Core Aptitude",
        name: "Conqueror's Charge",
        desc: "Unwavering conviction in own calculations, striking forward with full-stake pressure to compound victories.",
      },
      {
        icon: "⚡",
        type: "Awakened Mastery",
        name: "Solar Breakthrough",
        desc: "Shatters deadlocks by making the decisive decree when others freeze, rallying the realm out of stagnation.",
      },
      {
        icon: "🚩",
        type: "Battle Synergy",
        name: "Spearhead Vanguard Bond",
        desc: "Pioneering greenfield campaigns, high-stakes battle spearhead, breaking through entrenched impasses.",
      },
    ],
    empoweringFeedback:
      "Crowned in fire! You bring thrilling martial vigor and formidable penetrative logic to every challenge, choosing decisive assault over timidity.",
  },

  [CognitiveArchetype.ANXIOUS_RETREATER]: {
    archetype: CognitiveArchetype.ANXIOUS_RETREATER,
    quadrantCode: "Q5-RET",
    roleTitle: "The Veiled Oracle",
    praiseTagline: "Lantern in the Mist · Untouched by Chaos",
    orderTitle: "Order of the Veiled Lantern",
    sealText: "VEILED TRUTH",
    crestSymbol: "🕯️",
    colorScheme: {
      primaryGold: "#94a3b8",
      secondaryGold: "#f1f5f9",
      accentColor: "#64748b",
      bgRadialInner: "#131a26",
      bgRadialOuter: "#070b10",
      glowColor: "rgba(148, 163, 184, 0.45)",
      cardBorder: "rgba(148, 163, 184, 0.5)",
      badgeBg: "rgba(148, 163, 184, 0.15)",
    },
    strengthTags: ["Serene Restraint", "Danger Clairvoyance", "Prudent Vigilance", "Unshakeable Sanctuary"],
    skills: [
      {
        icon: "🤫",
        type: "Passive Trait",
        name: "Silent Sanctuary",
        desc: "Natural immunity to emotional frenzy or false lures; keeps core reserves completely untouched by chaos.",
      },
      {
        icon: "📡",
        type: "Core Aptitude",
        name: "Danger Divination",
        desc: "Supreme sensitivity to subtle trap frequencies, swiftly locking down perimeters upon sensing ambiguity.",
      },
      {
        icon: "🏔️",
        type: "Awakened Mastery",
        name: "Veiled Shield",
        desc: "Strict adherence to preservation protocols under severe volatility, safeguarding the flame through long winters.",
      },
      {
        icon: "🛡️",
        type: "Battle Synergy",
        name: "Sanctuary Guardian Bond",
        desc: "Risk & compliance audits, high-availability survivability oversight, protective firewall architect.",
      },
    ],
    empoweringFeedback:
      "Deep tranquility and profound restraint. In an arena flooded with frantic bets, you never risk core vitality for fleeting mirages.",
  },

  [CognitiveArchetype.BLIND_GAMBLER]: {
    archetype: CognitiveArchetype.BLIND_GAMBLER,
    quadrantCode: "Q6-GAM",
    roleTitle: "The Stormborne Maverick",
    praiseTagline: "All In Against Fate · Forged in Reckless Glory",
    orderTitle: "Order of the Tempest Vanguard",
    sealText: "DEFY FATE",
    crestSymbol: "⚡",
    colorScheme: {
      primaryGold: "#eab308",
      secondaryGold: "#fef9c3",
      accentColor: "#ca8a04",
      bgRadialInner: "#231804",
      bgRadialOuter: "#0e0901",
      glowColor: "rgba(234, 179, 8, 0.45)",
      cardBorder: "rgba(234, 179, 8, 0.5)",
      badgeBg: "rgba(234, 179, 8, 0.15)",
    },
    strengthTags: ["Undaunted Audacity", "Frontier Pioneer", "Indomitable Grit", "Trial by Lightning"],
    skills: [
      {
        icon: "🚩",
        type: "Passive Trait",
        name: "Tempest Heart",
        desc: "Unbreakable mental resilience; zero paralysis in the face of the unknown, always charging with blazing spirits.",
      },
      {
        icon: "⚡",
        type: "Core Aptitude",
        name: "All-In Blitz",
        desc: "Dares to stake all across unfamiliar territories, brute-forcing breakthroughs where timid minds stall.",
      },
      {
        icon: "🛡️",
        type: "Awakened Mastery",
        name: "Defy the Odds",
        desc: "Stares straight into the abyss; each collision and scar tempers an indestructible spiritual core.",
      },
      {
        icon: "💥",
        type: "Battle Synergy",
        name: "High-Entropy Shocktroop",
        desc: "Rapid recon missions, zero-to-one uncharted explorations, mine-clearing explosive vanguard.",
      },
    ],
    empoweringFeedback:
      "Forward is the tempest, backward is the abyss—you leap toward the stars! You embody pure, unadulterated pioneering audacity.",
  },

  [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
    archetype: CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
    quadrantCode: "Q7-ARB",
    roleTitle: "The Fate Weaver",
    praiseTagline: "Master of Whispers · Tipping the Scales of Destiny",
    orderTitle: "Order of the Whispering Scales",
    sealText: "FATE WEAVE",
    crestSymbol: "⚖️",
    colorScheme: {
      primaryGold: "#f43f5e",
      secondaryGold: "#ffe4e6",
      accentColor: "#e11d48",
      bgRadialInner: "#250711",
      bgRadialOuter: "#0f0206",
      glowColor: "rgba(244, 63, 94, 0.45)",
      cardBorder: "rgba(244, 63, 94, 0.5)",
      badgeBg: "rgba(244, 63, 94, 0.15)",
    },
    strengthTags: ["Destiny Arbitrage", "Information Leverage", "Mathematical Grace", "Payoff Optimization"],
    skills: [
      {
        icon: "🧮",
        type: "Passive Trait",
        name: "Whispering Scales",
        desc: "Instant discernment of marginal information value; leverages micro-clues into asymmetric payout surges.",
      },
      {
        icon: "🏹",
        type: "Core Aptitude",
        name: "Calculated Arbitrage",
        desc: "Calibrates expected payoff balance at every second; strikes hard on certainty, hedged on doubt.",
      },
      {
        icon: "📜",
        type: "Awakened Mastery",
        name: "Master of Winds",
        desc: "Flows with dynamic chaos, using featherweight leverage to tip the cosmic scales and harvest peak yield.",
      },
      {
        icon: "👑",
        type: "Battle Synergy",
        name: "Grand Chancellor Bond",
        desc: "Resource-constrained optimization, strategic negotiation architect, payoff maximization mastermind.",
      },
    ],
    empoweringFeedback:
      "A mastermind of mathematical expectation! You never clash head-on, but weave external whispers into undeniable victory with supreme elegance.",
  },

  [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
    archetype: CognitiveArchetype.STOCHASTIC_DRIFTER,
    quadrantCode: "Q8-DRI",
    roleTitle: "The Astral Wanderer",
    praiseTagline: "Unbound by Mortal Laws · Dancing on Starlight",
    orderTitle: "Order of the Starlight Drift",
    sealText: "ASTRAL DRIFT",
    crestSymbol: "🌌",
    colorScheme: {
      primaryGold: "#818cf8",
      secondaryGold: "#e0e7ff",
      accentColor: "#6366f1",
      bgRadialInner: "#131432",
      bgRadialOuter: "#060614",
      glowColor: "rgba(129, 140, 248, 0.45)",
      cardBorder: "rgba(129, 140, 248, 0.5)",
      badgeBg: "rgba(129, 140, 248, 0.15)",
    },
    strengthTags: ["Astral Freedom", "Unbound Intuition", "Starlight Leap", "Nonlinear Spark"],
    skills: [
      {
        icon: "🌌",
        type: "Passive Trait",
        name: "Astral Freedom",
        desc: "Thinking is utterly unbound by dogma or rigid linear molds, roaming freely across conceptual expanses.",
      },
      {
        icon: "✨",
        type: "Core Aptitude",
        name: "Starlight Spark",
        desc: "Sudden cross-dimensional lightning sparks, revealing unexpected exits where conventional logic dead-ends.",
      },
      {
        icon: "🚀",
        type: "Awakened Mastery",
        name: "Cosmic Drift",
        desc: "Maintains serene emotional detachment under pressure, floating gracefully across multi-dimensional state spaces.",
      },
      {
        icon: "🌟",
        type: "Battle Synergy",
        name: "Unorthodox Catalyst Bond",
        desc: "Disruptive brainstorming, shattering dogmatic inertia, boundless avant-garde inspiration fountain.",
      },
    ],
    empoweringFeedback:
      "Dancing on starlight! Your mind floats serenely past mortal frameworks, sparking sudden transcendent leaps when dogmatic paths hit stone walls.",
  },
};

export function getArcaneArchetype(identifier: CognitiveArchetype | string): ArcaneArchetypeConfig {
  if (!identifier) {
    return ARCANE_ARCHETYPES[CognitiveArchetype.SOVEREIGN];
  }

  if (ARCANE_ARCHETYPES[identifier as CognitiveArchetype]) {
    return ARCANE_ARCHETYPES[identifier as CognitiveArchetype];
  }

  const str = String(identifier).trim().toUpperCase();

  for (const item of Object.values(ARCANE_ARCHETYPES)) {
    if (item.quadrantCode.toUpperCase() === str || item.quadrantCode.toUpperCase().startsWith(str)) {
      return item;
    }
  }

  for (const item of Object.values(ARCANE_ARCHETYPES)) {
    if (
      item.roleTitle.toUpperCase() === str ||
      str.includes(item.roleTitle.toUpperCase()) ||
      item.orderTitle.toUpperCase().includes(str)
    ) {
      return item;
    }
  }

  // Also match Chinese role titles to English Arcane configs
  const zhDef = getArchetypeDefinition(identifier as any, "zh-CN");
  if (zhDef && ARCANE_ARCHETYPES[zhDef.archetype]) {
    return ARCANE_ARCHETYPES[zhDef.archetype];
  }

  return ARCANE_ARCHETYPES[CognitiveArchetype.SOVEREIGN];
}
