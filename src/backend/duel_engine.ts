/**
 * Cognitive Twin Duel Comparison Engine (src/backend/duel_engine.ts)
 * 
 * Computes 4D manifold Euclidean distance, cognitive alignment score (similarity percentage),
 * and complementary archetype pairing dynamics between two assessment sessions.
 */

import { CognitiveArchetype } from "./models";
import { resolveArchetype } from "./archetype_matrix";
import { getLocale, type SupportedLocale } from "../i18n";

export interface ArchetypePairingResult {
  synergyTitle: string;
  complementaryIndex: number;
  pairingDynamics: string;
  mutualStrengths: string[];
  mutualDifferences: string[];
}

export interface DimensionDeltas {
  d_star: number;
  m_ratio: number;
  bias: number;
  ive: number;
}

export interface DuelComparisonResult {
  euclidean_distance: number;
  similarity_percentage: number;
  cognitive_alignment_score: number;
  complementary_index: number;
  synergy_title: string;
  pairing_dynamics: string;
  mutual_strengths: string[];
  mutual_differences: string[];
  manifold_comparison: {
    vectorA: [number, number, number, number];
    vectorB: [number, number, number, number];
    dimensionDeltas: DimensionDeltas;
  };
}

/**
 * Normalizes raw metrics into 4D unit manifold vector: [D*, M-ratio, Bias, IVE] in [0, 1]^4
 */
export function normalizeManifoldVector(metrics: any = {}): [number, number, number, number] {
  const rawDStar = metrics.d_star ?? metrics.dStar ?? 0.5;
  const rawMRatio = metrics.m_ratio ?? metrics.mRatio ?? 1.0;
  const rawBias = metrics.calibration_bias ?? metrics.calibrationBias ?? 0.0;
  const rawIve = metrics.ive ?? metrics.info_buying_efficiency ?? metrics.infoBuyingEfficiency ?? 0.5;

  // D*: [0, 1]
  const dStarNorm = Math.max(0.0, Math.min(1.0, Number.isFinite(rawDStar) ? rawDStar : 0.5));

  // M-ratio: [0, 2] -> normalized by dividing by 2.0
  const mRatioClamped = Math.max(0.0, Math.min(2.0, Number.isFinite(rawMRatio) ? rawMRatio : 1.0));
  const mRatioNorm = mRatioClamped / 2.0;

  // Bias: [-1, 1] -> normalized by (bias + 1.0) / 2.0
  const biasClamped = Math.max(-1.0, Math.min(1.0, Number.isFinite(rawBias) ? rawBias : 0.0));
  const biasNorm = (biasClamped + 1.0) / 2.0;

  // IVE: [0, 1]
  const iveNorm = Math.max(0.0, Math.min(1.0, Number.isFinite(rawIve) ? rawIve : 0.5));

  return [
    Math.round(dStarNorm * 10000) / 10000,
    Math.round(mRatioNorm * 10000) / 10000,
    Math.round(biasNorm * 10000) / 10000,
    Math.round(iveNorm * 10000) / 10000,
  ];
}

/**
 * Computes 4D Euclidean distance between two normalized manifold vectors.
 * Since each coordinate is in [0, 1], theoretical maximum distance in [0, 1]^4 is sqrt(4) = 2.0.
 */
export function compute4DEuclideanDistance(
  vecA: [number, number, number, number],
  vecB: [number, number, number, number]
): number {
  const sumSquares =
    Math.pow(vecA[0] - vecB[0], 2) +
    Math.pow(vecA[1] - vecB[1], 2) +
    Math.pow(vecA[2] - vecB[2], 2) +
    Math.pow(vecA[3] - vecB[3], 2);

  const rawDist = Math.sqrt(sumSquares);
  return Math.round(rawDist * 1000) / 1000;
}

/**
 * Computes cognitive alignment score (0 - 100) from Euclidean distance.
 */
export function computeCognitiveAlignmentScore(distance: number): number {
  // Clamped in [0, 2]
  const clampedDist = Math.max(0, Math.min(2.0, distance));
  const score = Math.round((1.0 - clampedDist / 2.0) * 100);
  return Math.max(0, Math.min(100, score));
}

interface PairingMeta {
  complementaryIndex: number;
  zh: {
    synergyTitle: string;
    pairingDynamics: string;
    mutualStrengths: string[];
    mutualDifferences: string[];
  };
  en: {
    synergyTitle: string;
    pairingDynamics: string;
    mutualStrengths: string[];
    mutualDifferences: string[];
  };
}

/**
 * Pre-calibrated pairing metadata for key cognitive pairings
 */
const PAIRING_CATALOG: Record<string, PairingMeta> = {
  // 1. Same-Archetype Symmetric Pairings
  [`${CognitiveArchetype.SOVEREIGN}__${CognitiveArchetype.SOVEREIGN}`]: {
    complementaryIndex: 95,
    zh: {
      synergyTitle: "天元双璧 · 算力共振",
      pairingDynamics: "双核人形外挂同时参战，逻辑推演深度与元认知自省边界高度同频，构成无懈可击的高维思维力场。",
      mutualStrengths: ["极致推演底蕴与知行绝对自洽", "胜券在握时百发百中，疑难陷阱中绝不盲动"],
      mutualDifferences: ["推演风格细微偏好：宏观结构 vs 细节穿透"],
    },
    en: {
      synergyTitle: "Dual Sovereigns · Aether Resonance",
      pairingDynamics: "Twin Sovereigns operating in harmony; flawless alignment of sensory depth and metacognitive calibration.",
      mutualStrengths: ["Peerless deduction depth and self-consistency", "Laser-guided certainty under high ambiguity"],
      mutualDifferences: ["Subtle focal priority: Structural topology vs granular detail"],
    },
  },
  [`${CognitiveArchetype.ADAPTIVE_LEARNER}__${CognitiveArchetype.ADAPTIVE_LEARNER}`]: {
    complementaryIndex: 92,
    zh: {
      synergyTitle: "灵境共鸣 · 顿悟双星",
      pairingDynamics: "极高悟性与谦逊自省者的相逢，双方皆能敏锐感知盲区并借助线索极速跃迁，学习吸收效率倍增。",
      mutualStrengths: ["极高成长进化上限与纠错速度", "对未知盲区保持绝对清醒与探索灵觉"],
      mutualDifferences: ["破局节奏的探索路径差异"],
    },
    en: {
      synergyTitle: "Twin Seekers · Resonant Dawn",
      pairingDynamics: "Rapid evolutionary synergy between two profound self-observers with infinite growth potential.",
      mutualStrengths: ["Infinite evolutionary ceiling and rapid error correction", "Acute awareness of cognitive horizons"],
      mutualDifferences: ["Divergent exploratory trajectories during early trials"],
    },
  },
  [`${CognitiveArchetype.VIGILANT_SENTINEL}__${CognitiveArchetype.VIGILANT_SENTINEL}`]: {
    complementaryIndex: 88,
    zh: {
      synergyTitle: "双岳磐石 · 永恒秩序",
      pairingDynamics: "双重极度严谨守序组合，零失误率与审慎对冲策略构筑起坚不可摧的防线。",
      mutualStrengths: ["高准确率与极致风险控制", "在任何复杂扰动下始终守住安全基石"],
      mutualDifferences: ["对边际线索安全系数的微调偏好"],
    },
    en: {
      synergyTitle: "Twin Bastions · Eternal Aegis",
      pairingDynamics: "Absolute defensive precision and risk aversion forging an impenetrable bulwark of certainty.",
      mutualStrengths: ["Near-zero unforced error rate and prudent hedging", "Ironclad baseline stability"],
      mutualDifferences: ["Marginal safety threshold calibration differences"],
    },
  },
  [`${CognitiveArchetype.AUDACIOUS_PIONEER}__${CognitiveArchetype.AUDACIOUS_PIONEER}`]: {
    complementaryIndex: 85,
    zh: {
      synergyTitle: "双龙破晓 · 烈火燎原",
      pairingDynamics: "双高魄力开拓者并肩冲锋，敢于在未知荒原发起雷霆决断，破局爆发力冠绝全场。",
      mutualStrengths: ["高能量直觉决断与极速突围能力", "在逆境与模糊迷局中率先斩开生路"],
      mutualDifferences: ["进攻突击方向与先机博弈时机"],
    },
    en: {
      synergyTitle: "Blazing Comets · Vanguard Surge",
      pairingDynamics: "High-octane vanguard offensive breaking frontier deadlocks with bold intuitive strikes.",
      mutualStrengths: ["Fierce tactical momentum and decisive initiative", "Rapid breakthrough in unstructured territory"],
      mutualDifferences: ["Divergent vector targeting during pioneer advances"],
    },
  },

  // 2. High Complementarity Pairs
  [`${CognitiveArchetype.AUDACIOUS_PIONEER}__${CognitiveArchetype.VIGILANT_SENTINEL}`]: {
    complementaryIndex: 98,
    zh: {
      synergyTitle: "智勇乾坤 · 攻守天平",
      pairingDynamics: "一人如飞龙开天辟地，一人如定海神针固若金汤；冒险魄力与审慎风控天作之合，攻守兼备无可匹敌。",
      mutualStrengths: ["先锋破局冲劲与稳健底盘风控完美互补", "既不失破晓战机，亦绝不倾覆翻车"],
      mutualDifferences: ["先锋敢于高杠杆出击，神针习惯稳步守底"],
    },
    en: {
      synergyTitle: "Shield & Spear · Cosmic Balance",
      pairingDynamics: "The ultimate archetype synthesis: bold frontier exploration harnessed by rock-solid defensive prudence.",
      mutualStrengths: ["Aggressive vanguard expansion balanced by infallible containment", "Maximum upside with zero systemic collapse"],
      mutualDifferences: ["Pioneer wagers on instinct while Sentinel safeguards variance"],
    },
  },
  [`${CognitiveArchetype.ADAPTIVE_LEARNER}__${CognitiveArchetype.SOVEREIGN}`]: {
    complementaryIndex: 96,
    zh: {
      synergyTitle: "宗师火种 · 灵感飞跃",
      pairingDynamics: "人形外挂的顶层推演构架与灵窍天开的高速吸收悟性完美结合，形成良性思维传导与共进闭环。",
      mutualStrengths: ["顶级算力指引与敏锐悟性吸收的无缝咬合", "深邃逻辑框架与机敏纠错反应同频共振"],
      mutualDifferences: ["外挂倚重既有逻辑严密性，灵窍重在动态吸收进化"],
    },
    en: {
      synergyTitle: "Archmage & Luminary · Ascendant Leap",
      pairingDynamics: "High deductive architecture meets infinite evolutionary receptivity, catalyzing reciprocal breakthroughs.",
      mutualStrengths: ["Masterful tactical guidance merged with acute self-learning", "Cohesive synergy of deep logic and rapid adaptation"],
      mutualDifferences: ["The Sovereign relies on axiomatic depth; the Learner evolves dynamically"],
    },
  },
  [`${CognitiveArchetype.PRAGMATIC_ARBITRAGEUR}__${CognitiveArchetype.SOVEREIGN}`]: {
    complementaryIndex: 95,
    zh: {
      synergyTitle: "谋算双绝 · 帝王棋局",
      pairingDynamics: "信息价值极度杠杆化专家与顶层逻辑主宰的智谋同盟，兵行诡道与绝对算力交相辉映。",
      mutualStrengths: ["信息觅食高转化率与降维逻辑推演深度", "洞悉规则漏洞与精准制导决策"],
      mutualDifferences: ["诸葛善于借力借势，外挂侧重以力破巧"],
    },
    en: {
      synergyTitle: "Grand Strategists · Royal Gambit",
      pairingDynamics: "Maximum information foraging efficiency combined with unerring logical mastery.",
      mutualStrengths: ["Elite information harvesting and axiomatic reduction", "Flawless game-theoretic maneuverability"],
      mutualDifferences: ["Arbitrageur optimizes leverage; Sovereign exercises intrinsic command"],
    },
  },
  [`${CognitiveArchetype.BLIND_GAMBLER}__${CognitiveArchetype.PRAGMATIC_ARBITRAGEUR}`]: {
    complementaryIndex: 93,
    zh: {
      synergyTitle: "奇正相生 · 谋勇同盟",
      pairingDynamics: "信息智囊执棋策划，无畏先锋雷霆破阵；算无遗策与血性突击紧密协作，出奇制胜。",
      mutualStrengths: ["智囊提供精准线索与破局方向，先锋果断执行重拳出击", "以巧破千斤的战术敏锐性与压制力"],
      mutualDifferences: ["诸葛精密核算风险成本，先锋依赖直觉无畏博弈"],
    },
    en: {
      synergyTitle: "Strategist & Vanguard · Arcane Coup",
      pairingDynamics: "Calculated intelligence reconnaissance paired with fearless decisive execution.",
      mutualStrengths: ["Optimal clue exploitation powering high-conviction blitzes", "High tactical adaptability under pressure"],
      mutualDifferences: ["Strategist hedges information; Vanguard wagers on fearless intuition"],
    },
  },
  [`${CognitiveArchetype.ADAPTIVE_LEARNER}__${CognitiveArchetype.VIGILANT_SENTINEL}`]: {
    complementaryIndex: 91,
    zh: {
      synergyTitle: "静水流深 · 厚积薄发",
      pairingDynamics: "心怀自省的求真者与稳扎稳打的定海基石，不急功近利，在长期推演博弈中胜率持续复利攀升。",
      mutualStrengths: ["超凡纠错反思能力与零低级失误的审慎风控", "步步为营、稳步扩张的持久作战耐力"],
      mutualDifferences: ["灵窍善于借线索破局，神针更依赖自身底气严守"],
    },
    en: {
      synergyTitle: "Serene Guardians · Compounding Fortitude",
      pairingDynamics: "Humble self-awareness anchored by unshakable consistency, compounding accuracy over trials.",
      mutualStrengths: ["Peerless reflective recalibration coupled with meticulous defense", "Immunity to impulsive tilt or high-variance traps"],
      mutualDifferences: ["Learner actively buys clues; Sentinel relies on disciplined verification"],
    },
  },
  [`${CognitiveArchetype.ANXIOUS_RETREATER}__${CognitiveArchetype.AUDACIOUS_PIONEER}`]: {
    complementaryIndex: 89,
    zh: {
      synergyTitle: "阴阳调和 · 互为照见",
      pairingDynamics: "深邃内敛的幽微洞察者与大刀阔斧的先锋探索者，一阴一阳，互补认知盲点。",
      mutualStrengths: ["洞察幽微陷阱与勇猛向前突击有机融合", "在过度冒进与过度退避之间达成自然均衡"],
      mutualDifferences: ["一方极度敬畏风险，一方勇于拥抱不确定性"],
    },
    en: {
      synergyTitle: "Shadow & Radiance · Complementary Sight",
      pairingDynamics: "Introspective sensitivity harmonizing with high-energy pioneering, balancing caution and momentum.",
      mutualStrengths: ["Subtle trap detection shielding bold forward breakthroughs", "Dynamic equilibrium between risk and reward"],
      mutualDifferences: ["Retreater perceives hidden pitfalls; Pioneer surges past hesitation"],
    },
  },
  [`${CognitiveArchetype.SOVEREIGN}__${CognitiveArchetype.VIGILANT_SENTINEL}`]: {
    complementaryIndex: 94,
    zh: {
      synergyTitle: "泰山北斗 · 宗师基石",
      pairingDynamics: "算力巅峰领航者与秩序定海神针汇聚，掌控力与自控力兼具，形成压倒性的稳定性与统治力。",
      mutualStrengths: ["高难度复杂推演统治力与极低失误率", "决策从容自信，防御坚不可摧"],
      mutualDifferences: ["外挂自信出手果断，神针偏好谦逊保守防御"],
    },
    en: {
      synergyTitle: "Twin Bastions · Grand Imperium",
      pairingDynamics: "Sovereign cognitive breadth anchored by Sentinel precision, delivering unmatched domain authority.",
      mutualStrengths: ["Mastery of high-order difficulty combined with zero defensive cracks", "Unerring poise and unshakeable confidence"],
      mutualDifferences: ["Sovereign strikes aggressively when certain; Sentinel hedges conservatively"],
    },
  },
};

/**
 * Gets pairing metadata or generates a procedural pairing based on archetypes
 */
export function computeArchetypePairingDynamics(
  rawArchetypeA: CognitiveArchetype | string,
  rawArchetypeB: CognitiveArchetype | string,
  locale?: SupportedLocale
): ArchetypePairingResult {
  const archA = resolveArchetype(rawArchetypeA);
  const archB = resolveArchetype(rawArchetypeB);
  const targetLocale = (locale || getLocale()).toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
  const isEn = targetLocale === "en-US";

  // Symmetric key sort
  const sorted = [archA, archB].sort();
  const pairKey = `${sorted[0]}__${sorted[1]}`;

  const catalogEntry = PAIRING_CATALOG[pairKey];
  if (catalogEntry) {
    const langData = isEn ? catalogEntry.en : catalogEntry.zh;
    return {
      synergyTitle: langData.synergyTitle,
      complementaryIndex: catalogEntry.complementaryIndex,
      pairingDynamics: langData.pairingDynamics,
      mutualStrengths: langData.mutualStrengths,
      mutualDifferences: langData.mutualDifferences,
    };
  }

  // Procedural fallback for other combinations
  const isSame = archA === archB;
  const compIndex = isSame ? 88 : 82;

  if (isEn) {
    return {
      synergyTitle: isSame ? "Resonant Twin Stars" : "Complementary Mind Matrix",
      complementaryIndex: compIndex,
      pairingDynamics: `A unique duel interaction between ${archA} and ${archB}, revealing dynamic divergence in sensory perception and confidence calibration.`,
      mutualStrengths: [
        "Complementary perspectives across the 4D cognitive manifold",
        "Adaptive synergy under high-difficulty trial conditions",
      ],
      mutualDifferences: [
        "Contrasting metacognitive confidence thresholds",
        "Different tactical approaches to clue acquisition",
      ],
    };
  }

  return {
    synergyTitle: isSame ? "双星同辉 · 认知共振" : "双星并峙 · 乾坤互济",
    complementaryIndex: compIndex,
    pairingDynamics: `两位受测者在认知流形上展现出鲜明的特质碰撞，推演习惯与决策信心相互辉映，构成独特的思维对照面。`,
    mutualStrengths: [
      "四维认知相空间中各展所长，优势互补",
      "面对复杂抽象推演时拥有截然不同的解题与破局视角",
    ],
    mutualDifferences: [
      "决策自信度与冒险偏好各有侧重",
      "外界线索利用与自主推演权衡方式不同",
    ],
  };
}

/**
 * Comprehensive Duel Comparison function
 */
export function computeDuelComparison(
  reportA: any,
  reportB: any,
  locale?: SupportedLocale
): DuelComparisonResult {
  const metricsA = reportA?.metrics || reportA?.metacognitive_metrics || {};
  const metricsB = reportB?.metrics || reportB?.metacognitive_metrics || {};

  const vectorA = normalizeManifoldVector(metricsA);
  const vectorB = normalizeManifoldVector(metricsB);

  const euclideanDistance = compute4DEuclideanDistance(vectorA, vectorB);
  const similarityPercentage = computeCognitiveAlignmentScore(euclideanDistance);

  const archetypeA = reportA?.archetype || reportA?.diagnostic_profile?.archetype || "SOVEREIGN";
  const archetypeB = reportB?.archetype || reportB?.diagnostic_profile?.archetype || "SOVEREIGN";

  const pairing = computeArchetypePairingDynamics(archetypeA, archetypeB, locale);

  const dimensionDeltas: DimensionDeltas = {
    d_star: Math.round(Math.abs(vectorA[0] - vectorB[0]) * 1000) / 1000,
    m_ratio: Math.round(Math.abs(vectorA[1] - vectorB[1]) * 1000) / 1000,
    bias: Math.round(Math.abs(vectorA[2] - vectorB[2]) * 1000) / 1000,
    ive: Math.round(Math.abs(vectorA[3] - vectorB[3]) * 1000) / 1000,
  };

  return {
    euclidean_distance: euclideanDistance,
    similarity_percentage: similarityPercentage,
    cognitive_alignment_score: similarityPercentage,
    complementary_index: pairing.complementaryIndex,
    synergy_title: pairing.synergyTitle,
    pairing_dynamics: pairing.pairingDynamics,
    mutual_strengths: pairing.mutualStrengths,
    mutual_differences: pairing.mutualDifferences,
    manifold_comparison: {
      vectorA,
      vectorB,
      dimensionDeltas,
    },
  };
}
