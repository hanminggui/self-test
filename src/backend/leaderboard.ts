/**
 * Multi-Dimensional Leaderboards & TOPSIS Recalibration Engine (leaderboard.ts)
 * 
 * Spec v2.3 / ADR 0003:
 * Implements 5 orthogonal sub-dimension leaderboards:
 *   1. Reasoning Breakthrough (推理突破榜): governed strictly by D* in [0, 1]
 *   2. Metacognitive Fidelity (二阶元认知榜): governed by M_ratio with cognitive bandwidth clamping
 *   3. Calibration Accuracy (概率校准榜): governed by (1 - Brier Score)
 *   4. Game Utility Payoff (博弈战绩榜): governed by pure Formal Score (with Composite Cognitive Score CCS = D* * Formal Score)
 *   5. Cognitive Energy Efficiency (能效与信息杠杆榜): governed by Economic Information Ratio (EIR)
 * 
 * Unified Decision Analysis:
 *   MCDA Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)
 */

import { SubjectDataPoint } from "./models";

export interface LeaderboardSubjectInput {
  id: string;
  name: string;
  subject_type: string;
  locale?: string;
  quadrant_code: string;
  role_title?: string;
  d_star: number;
  m_ratio: number;
  brier_score: number;
  calibration_bias: number;
  ive: number;
  formal_score: number;
  composite_cognitive_score?: number;
  ccs?: number;
  total_duration_ms?: number;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    reasoning_tokens?: number;
    total_tokens?: number;
  };
}

export interface LeaderboardMetrics {
  d_star: number;
  m_ratio: number;
  calibration_accuracy: number;
  brier_score: number;
  calibration_bias: number;
  ive: number;
  formal_score: number;
  composite_cognitive_score: number;
  ccs: number;
  eir: number;
  total_duration_ms?: number;
  total_tokens?: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  subject_type: string;
  role_title: string;
  quadrant_code: string;
  score: number;
  metrics: LeaderboardMetrics;
}

export interface TOPSISLeaderboardEntry extends LeaderboardEntry {
  topsis_score: number;
}

export interface LeaderboardOverviewResponse {
  topsis_leaderboard: TOPSISLeaderboardEntry[];
  sub_leaderboards: {
    reasoning: LeaderboardEntry[];
    metacognition: LeaderboardEntry[];
    calibration: LeaderboardEntry[];
    game_utility: LeaderboardEntry[];
    efficiency: LeaderboardEntry[];
  };
}

/**
 * Computes Economic Information Ratio (EIR) / Cognitive Energy Efficiency.
 * Normalized ratio representing net payoff & information leverage generated per unit of physical compute or duration.
 */
export function computeEIR(subject: LeaderboardSubjectInput): number {
  const formalScore = subject.formal_score ?? 0;
  const ive = subject.ive ?? 0.50;
  const effectivePayoff = Math.max(0, formalScore) + 1.0;
  const leverageMod = 1.0 + Math.max(0.0, Math.min(1.0, ive));

  const totalTokens = subject.token_usage?.total_tokens ?? 0;
  if (totalTokens > 0) {
    // LLM Agent compute-constrained regime: tokens in thousands
    const kTokens = Math.max(0.2, totalTokens / 1000);
    const rawEir = (effectivePayoff / kTokens) * leverageMod;
    return Math.round(rawEir * 100) / 100;
  }

  // Human / time-constrained regime: latency in seconds
  const totalDurationMs = subject.total_duration_ms ?? 30000;
  const sec = Math.max(1.0, totalDurationMs / 1000);
  const rawEir = (effectivePayoff / (sec / 10.0)) * leverageMod;
  return Math.round(rawEir * 100) / 100;
}

/**
 * Computes TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
 * across 5 orthogonal cognitive dimensions:
 *   1. Reasoning: D*
 *   2. Metacognition: M_ratio
 *   3. Calibration: 1 - Brier Score
 *   4. Game Utility: Formal Score (or CCS)
 *   5. Energy Efficiency: EIR
 */
export function computeTOPSIS(subjects: LeaderboardSubjectInput[]): TOPSISLeaderboardEntry[] {
  if (!subjects || subjects.length === 0) return [];

  const m = subjects.length;
  const criteriaData = subjects.map((s) => {
    const dStar = Math.max(0.0, Math.min(1.0, s.d_star ?? 0.5));
    const mRatio = Math.max(0.01, Math.min(2.0, s.m_ratio ?? 0.9));
    const brier = Math.max(0.0, Math.min(1.0, s.brier_score ?? 0.20));
    const calibAcc = Math.max(0.0, Math.min(1.0, 1.0 - brier));
    const formalScore = Math.max(0, s.formal_score ?? 0);
    const eir = computeEIR(s);

    return {
      subject: s,
      raw: [dStar, mRatio, calibAcc, formalScore, eir],
    };
  });

  // Vector normalization norms for 5 criteria
  const norms = [0, 0, 0, 0, 0];
  for (let j = 0; j < 5; j++) {
    let sumSq = 0;
    for (let i = 0; i < m; i++) {
      sumSq += criteriaData[i].raw[j] * criteriaData[i].raw[j];
    }
    norms[j] = Math.sqrt(sumSq);
  }

  // Equal weights w_j = 0.2 for 5 orthogonal dimensions
  const weights = [0.2, 0.2, 0.2, 0.2, 0.2];

  // Normalized weighted matrix V
  const V: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < 5; j++) {
      const r_ij = norms[j] > 0 ? criteriaData[i].raw[j] / norms[j] : 0;
      row.push(r_ij * weights[j]);
    }
    V.push(row);
  }

  // Determine positive ideal solution (A+) and negative ideal solution (A-)
  const idealBest = [0, 0, 0, 0, 0];
  const idealWorst = [0, 0, 0, 0, 0];
  for (let j = 0; j < 5; j++) {
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < m; i++) {
      if (V[i][j] > maxVal) maxVal = V[i][j];
      if (V[i][j] < minVal) minVal = V[i][j];
    }
    idealBest[j] = maxVal;
    idealWorst[j] = minVal;
  }

  // Calculate Euclidean distances S+ and S-
  const scores: { subject: LeaderboardSubjectInput; topsisScore: number }[] = [];
  for (let i = 0; i < m; i++) {
    let dPlusSq = 0;
    let dMinusSq = 0;
    for (let j = 0; j < 5; j++) {
      dPlusSq += Math.pow(V[i][j] - idealBest[j], 2);
      dMinusSq += Math.pow(V[i][j] - idealWorst[j], 2);
    }
    const sPlus = Math.sqrt(dPlusSq);
    const sMinus = Math.sqrt(dMinusSq);

    let c_i: number;
    if (sPlus + sMinus === 0) {
      c_i = 100.0;
    } else {
      c_i = (sMinus / (sPlus + sMinus)) * 100.0;
    }
    scores.push({
      subject: criteriaData[i].subject,
      topsisScore: Math.round(c_i * 100) / 100,
    });
  }

  // Rank by topsisScore descending
  scores.sort((a, b) => b.topsisScore - a.topsisScore);

  return scores.map((item, idx) => {
    const s = item.subject;
    const formalScore = s.formal_score ?? 0;
    const dStar = s.d_star ?? 0.50;
    const ccs = s.composite_cognitive_score ?? s.ccs ?? Math.round(dStar * formalScore * 100) / 100;
    const brier = s.brier_score ?? 0.20;
    const eir = computeEIR(s);

    const metrics: LeaderboardMetrics = {
      d_star: dStar,
      m_ratio: s.m_ratio ?? 0.9,
      calibration_accuracy: Math.round((1.0 - brier) * 10000) / 10000,
      brier_score: brier,
      calibration_bias: s.calibration_bias ?? 0.0,
      ive: s.ive ?? 0.50,
      formal_score: formalScore,
      composite_cognitive_score: ccs,
      ccs,
      eir,
      total_duration_ms: s.total_duration_ms,
      total_tokens: s.token_usage?.total_tokens,
    };

    return {
      rank: idx + 1,
      id: s.id,
      name: s.name,
      subject_type: s.subject_type,
      role_title: s.role_title || "人形外挂",
      quadrant_code: s.quadrant_code || "Q1-CAL",
      score: item.topsisScore,
      topsis_score: item.topsisScore,
      metrics,
    };
  });
}

/**
 * Builds the complete Leaderboard Overview including:
 *   - Unified TOPSIS Ranking
 *   - 5 Orthogonal Sub-Dimension Leaderboards
 */
export function generateLeaderboardOverview(subjects: LeaderboardSubjectInput[]): LeaderboardOverviewResponse {
  if (!subjects || subjects.length === 0) {
    return {
      topsis_leaderboard: [],
      sub_leaderboards: {
        reasoning: [],
        metacognition: [],
        calibration: [],
        game_utility: [],
        efficiency: [],
      },
    };
  }

  const topsisLeaderboard = computeTOPSIS(subjects);

  // Helper to format an entry for a specific metric
  const formatEntries = (
    sorted: LeaderboardSubjectInput[],
    scoreExtractor: (s: LeaderboardSubjectInput) => number
  ): LeaderboardEntry[] => {
    return sorted.map((s, idx) => {
      const formalScore = s.formal_score ?? 0;
      const dStar = s.d_star ?? 0.50;
      const ccs = s.composite_cognitive_score ?? s.ccs ?? Math.round(dStar * formalScore * 100) / 100;
      const brier = s.brier_score ?? 0.20;
      const eir = computeEIR(s);

      const metrics: LeaderboardMetrics = {
        d_star: dStar,
        m_ratio: s.m_ratio ?? 0.9,
        calibration_accuracy: Math.round((1.0 - brier) * 10000) / 10000,
        brier_score: brier,
        calibration_bias: s.calibration_bias ?? 0.0,
        ive: s.ive ?? 0.50,
        formal_score: formalScore,
        composite_cognitive_score: ccs,
        ccs,
        eir,
        total_duration_ms: s.total_duration_ms,
        total_tokens: s.token_usage?.total_tokens,
      };

      const primaryScore = Math.round(scoreExtractor(s) * 100) / 100;

      return {
        rank: idx + 1,
        id: s.id,
        name: s.name,
        subject_type: s.subject_type,
        role_title: s.role_title || "人形外挂",
        quadrant_code: s.quadrant_code || "Q1-CAL",
        score: primaryScore,
        metrics,
      };
    });
  };

  // 1. Reasoning Sub-Dimension (D* desc)
  const reasoningSorted = [...subjects].sort((a, b) => (b.d_star ?? 0) - (a.d_star ?? 0));
  const reasoningLeaderboard = formatEntries(reasoningSorted, (s) => s.d_star ?? 0);

  // 2. Metacognition Sub-Dimension (M_ratio desc)
  const metacognitionSorted = [...subjects].sort((a, b) => (b.m_ratio ?? 0) - (a.m_ratio ?? 0));
  const metacognitionLeaderboard = formatEntries(metacognitionSorted, (s) => s.m_ratio ?? 0);

  // 3. Calibration Accuracy Sub-Dimension (1 - Brier Score desc)
  const calibrationSorted = [...subjects].sort(
    (a, b) => (1.0 - (a.brier_score ?? 0.25)) - (1.0 - (b.brier_score ?? 0.25))
  ).reverse();
  const calibrationLeaderboard = formatEntries(calibrationSorted, (s) => 1.0 - (s.brier_score ?? 0.25));

  // 4. Game Utility Payoff (Formal Score desc)
  const gameUtilitySorted = [...subjects].sort((a, b) => (b.formal_score ?? 0) - (a.formal_score ?? 0));
  const gameUtilityLeaderboard = formatEntries(gameUtilitySorted, (s) => s.formal_score ?? 0);

  // 5. Energy Efficiency (EIR desc)
  const efficiencySorted = [...subjects].sort((a, b) => computeEIR(b) - computeEIR(a));
  const efficiencyLeaderboard = formatEntries(efficiencySorted, (s) => computeEIR(s));

  return {
    topsis_leaderboard: topsisLeaderboard,
    sub_leaderboards: {
      reasoning: reasoningLeaderboard,
      metacognition: metacognitionLeaderboard,
      calibration: calibrationLeaderboard,
      game_utility: gameUtilityLeaderboard,
      efficiency: efficiencyLeaderboard,
    },
  };
}

/**
 * Converts stored SubjectDataPoint into LeaderboardSubjectInput.
 */
export function subjectDataPointToLeaderboardInput(sub: SubjectDataPoint): LeaderboardSubjectInput {
  const formalScore = sub.formal_score ?? sub.metrics?.formal_score ?? sub.final_score ?? 0;
  const dStar = sub.d_star ?? sub.metrics?.d_star ?? 0.50;
  const ccs = sub.composite_cognitive_score ?? sub.ccs ?? sub.metrics?.composite_cognitive_score ?? Math.round(dStar * formalScore * 100) / 100;

  return {
    id: sub.id,
    name: sub.name,
    subject_type: sub.subject_type,
    locale: sub.locale,
    quadrant_code: sub.quadrant_code || "Q1-CAL",
    role_title: sub.role_title,
    d_star: dStar,
    m_ratio: sub.m_ratio ?? sub.metrics?.m_ratio ?? 0.9,
    brier_score: sub.brier_score ?? sub.metrics?.brier_score ?? 0.20,
    calibration_bias: sub.calibration_bias ?? sub.metrics?.calibration_bias ?? 0.0,
    ive: sub.ive ?? sub.metrics?.ive ?? 0.50,
    formal_score: formalScore,
    composite_cognitive_score: ccs,
    ccs,
    total_duration_ms: sub.total_duration_ms,
    token_usage: sub.agent_metadata?.token_usage,
  };
}
