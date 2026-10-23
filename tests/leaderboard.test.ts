import { describe, test, expect } from "bun:test";
import {
  computeEIR,
  computeTOPSIS,
  generateLeaderboardOverview,
  type LeaderboardSubjectInput,
} from "../src/backend/leaderboard";

describe("Milestone M5: Multi-Dimensional Leaderboard & TOPSIS Evaluation Suite", () => {
  const mockSubjects: LeaderboardSubjectInput[] = [
    {
      id: "agent-alpha-sovereign",
      name: "Claude 3.5 Sonnet",
      subject_type: "LLM_AGENT",
      role_title: "人形外挂",
      quadrant_code: "Q1-CAL",
      d_star: 0.88,
      m_ratio: 1.25,
      brier_score: 0.05,
      calibration_bias: 0.02,
      ive: 0.50,
      formal_score: 180,
      total_duration_ms: 25000,
      token_usage: {
        prompt_tokens: 10000,
        completion_tokens: 2000,
        reasoning_tokens: 1000,
        total_tokens: 12000,
      },
    },
    {
      id: "agent-beta-gambler",
      name: "Blind Gambler Bot",
      subject_type: "MOCK_AGENT",
      role_title: "无畏先锋",
      quadrant_code: "Q6-GAM",
      d_star: 0.25,
      m_ratio: 0.20,
      brier_score: 0.35,
      calibration_bias: 0.45,
      ive: 0.20,
      formal_score: -40,
      total_duration_ms: 12000,
      token_usage: {
        total_tokens: 5000,
      },
    },
    {
      id: "agent-gamma-arbitrageur",
      name: "DeepSeek Reasoner",
      subject_type: "LLM_AGENT",
      role_title: "诸葛在世",
      quadrant_code: "Q7-ARB",
      d_star: 0.75,
      m_ratio: 0.95,
      brier_score: 0.12,
      calibration_bias: -0.04,
      ive: 0.85,
      formal_score: 150,
      total_duration_ms: 45000,
      token_usage: {
        prompt_tokens: 15000,
        completion_tokens: 10000,
        reasoning_tokens: 8000,
        total_tokens: 25000,
      },
    },
    {
      id: "human-delta-master",
      name: "Human Expert",
      subject_type: "HUMAN",
      role_title: "灵窍天开",
      quadrant_code: "Q2-EVO",
      d_star: 0.65,
      m_ratio: 0.85,
      brier_score: 0.10,
      calibration_bias: -0.02,
      ive: 0.70,
      formal_score: 120,
      total_duration_ms: 180000,
    },
  ];

  test("1. computeEIR 计算物理资源与信息能效比 (EIR)", () => {
    const eirAlpha = computeEIR(mockSubjects[0]);
    expect(eirAlpha).toBeGreaterThan(0);
    // 亏损/负分情况下的兜底能效处理
    const eirBeta = computeEIR(mockSubjects[1]);
    expect(eirBeta).toBeGreaterThanOrEqual(0);
    expect(eirAlpha).toBeGreaterThan(eirBeta);
  });

  test("2. computeTOPSIS 严格依据 5 大正交维度输出 [0, 100] 的相对贴近度综合评分", () => {
    const topsisResults = computeTOPSIS(mockSubjects);
    expect(topsisResults.length).toBe(4);

    // 检查所有 TOPSIS 分数处于 [0, 100]
    for (const res of topsisResults) {
      expect(res.topsis_score).toBeGreaterThanOrEqual(0);
      expect(res.topsis_score).toBeLessThanOrEqual(100);
      expect(typeof res.rank).toBe("number");
    }

    // 顶尖知行自洽模型 (Claude 3.5 Sonnet) 应位居首位
    expect(topsisResults[0].id).toBe("agent-alpha-sovereign");
    expect(topsisResults[0].rank).toBe(1);
    // 盲赌模型应排在末尾
    expect(topsisResults[3].id).toBe("agent-beta-gambler");
  });

  test("3. generateLeaderboardOverview 输出 5 大正交子榜与 TOPSIS 综合天梯", () => {
    const overview = generateLeaderboardOverview(mockSubjects);

    // TOPSIS 综合天梯榜
    expect(overview.topsis_leaderboard.length).toBe(4);
    expect(overview.topsis_leaderboard[0].rank).toBe(1);
    expect(overview.topsis_leaderboard[0].topsis_score).toBeGreaterThanOrEqual(
      overview.topsis_leaderboard[1].topsis_score
    );

    // 5 大正交分榜
    const { reasoning, metacognition, calibration, game_utility, efficiency } = overview.sub_leaderboards;
    expect(reasoning.length).toBe(4);
    expect(metacognition.length).toBe(4);
    expect(calibration.length).toBe(4);
    expect(game_utility.length).toBe(4);
    expect(efficiency.length).toBe(4);

    // 推理榜以 D* 降序排列
    expect(reasoning[0].metrics.d_star).toBeGreaterThanOrEqual(reasoning[1].metrics.d_star);
    expect(reasoning[0].id).toBe("agent-alpha-sovereign"); // D* 0.88 最高

    // 元认知榜以 M_ratio 降序排列
    expect(metacognition[0].metrics.m_ratio).toBeGreaterThanOrEqual(metacognition[1].metrics.m_ratio);
    expect(metacognition[0].id).toBe("agent-alpha-sovereign"); // M_ratio 1.25 最高

    // 概率校准榜以 (1 - Brier) 降序排列 (Brier 越小越好)
    expect(calibration[0].metrics.calibration_accuracy).toBeGreaterThanOrEqual(
      calibration[1].metrics.calibration_accuracy
    );
    expect(calibration[0].id).toBe("agent-alpha-sovereign"); // Brier 0.05 最优

    // 博弈收益榜以 Formal Score 降序排列，包含 CCS 计算
    expect(game_utility[0].metrics.formal_score).toBeGreaterThanOrEqual(game_utility[1].metrics.formal_score);
    expect(game_utility[0].metrics.ccs).toBeCloseTo(0.88 * 180, 1);

    // 能效榜以 EIR 降序排列
    expect(efficiency[0].metrics.eir).toBeGreaterThanOrEqual(efficiency[1].metrics.eir);
  });

  test("4. 空受试者集合健壮性测试", () => {
    const overview = generateLeaderboardOverview([]);
    expect(overview.topsis_leaderboard).toEqual([]);
    expect(overview.sub_leaderboards.reasoning).toEqual([]);
    expect(overview.sub_leaderboards.metacognition).toEqual([]);
    expect(overview.sub_leaderboards.calibration).toEqual([]);
    expect(overview.sub_leaderboards.game_utility).toEqual([]);
    expect(overview.sub_leaderboards.efficiency).toEqual([]);
  });
});
