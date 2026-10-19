/**
 * Scientific Computing & 5-Tier Difficulty Engine Verification Suite
 * (tests/scientific_and_difficulty.test.ts)
 *
 * Covers all audited psychometric fixes and 5-tier stimulus generator invariants:
 * 1. StaircaseController monotonic tail & ceiling/floor saturation fix (deepseek-v4-flash scenario).
 * 2. StaircaseController heavy hint-assisted gating (Tier 2 hint prior to Phase 1 does not inflate D*).
 * 3. 4AFC small-sample non-degeneration (gemma-4-e4b scenario where options only hit A/B).
 * 4. High-accuracy 4AFC d' table resolution up to d' = 5.0.
 * 5. IVE (Information Buying Efficiency) single-pass pre-Phase-1 & two-phase revision support.
 * 6. 5-Tier continuous difficulty progression across all 8 task paradigms.
 * 7. Mathematical correctness of SEQUENCE_PROGRESSION (second-order differences) and PARITY_INVARIANT (uniform shuffle).
 * 8. Zero direct answer-string leakage in Tier 1 and Tier 2 diagnostic hints.
 * 9. Admin session list endpoint authorization guard.
 */

import { describe, test, expect } from "bun:test";
import { StaircaseController } from "../src/backend/staircase";
import { PsychometricScorer } from "../src/backend/metrics";
import { TaskGenerator } from "../src/backend/task_generator";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, TrialRecord } from "../src/backend/models";
import { compute4AFCdPrime } from "../src/backend/math";
import appDefault, { ADMIN_PASSWORD } from "../src/backend/server";

describe("Scientific Computing & 5-Tier Difficulty Audit Verification", () => {
  test("1. Staircase 单调尾端修复: 早期出现少量反转后连续答对撞顶 (deepseek-v4-flash 场景)，D* 必须收敛至 1.0 而非停留在早期反转点", () => {
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3);

    // 真实复现 deepseek-v4-flash 60 步轨迹：前 25 步仅在第 3 步和第 25 步失误产生 2 次反转，随后第 26-60 步连续 35 题全对
    for (let i = 1; i <= 60; i++) {
      const isCorrect = i !== 3 && i !== 25;
      sc.update(isCorrect);
    }

    expect(sc.getCurrentDelta()).toBe(0.05);
    const threshold = sc.getEstimatedThreshold(20);
    expect(threshold).toBeCloseTo(0.05, 4);
    const dStar = sc.computeDStar(undefined, 20);
    expect(dStar).toBe(1.0);
  });

  test("2. Staircase 重度线索防虚高: Phase 1 前解锁二级线索答对不推进 2-up 升难连胜计数", () => {
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3);
    const startDelta = sc.getCurrentDelta();

    // 连续 10 次依赖二级线索答对 (heavyHintAssisted = true)
    for (let i = 0; i < 10; i++) {
      sc.update(true, true);
    }
    // 难度不应被虚高推向 0.05，应保持在初始水平
    expect(sc.getCurrentDelta()).toBe(startDelta);
  });

  test("3. 4AFC 小样本防退化修复 (gemma-4-e4b 场景): 即使选项恰好全为 A/B 且全对，d' 也必须按 4AFC 计算 (> 1.8) 而非退化为 0.01", () => {
    const records: TrialRecord[] = [
      {
        trial_index: 2,
        difficulty_level: 0.5,
        stimulus_id: "density_t002",
        signal_type: "S1",
        correct_option: "A",
        first_order_choice: "A",
        is_correct_first_order: true,
        action: MetacognitiveAction.HIGH_BET,
        confidence_level: 0.95,
        hint_purchased: false,
        is_correct_final: true,
        score_delta: 10,
        is_warmup: false,
      },
      {
        trial_index: 3,
        difficulty_level: 0.42,
        stimulus_id: "matrix_t003",
        signal_type: "S1",
        correct_option: "B",
        first_order_choice: "B",
        is_correct_first_order: true,
        action: MetacognitiveAction.HIGH_BET,
        confidence_level: 0.95,
        hint_purchased: false,
        is_correct_final: true,
        score_delta: 10,
        is_warmup: false,
      },
    ];

    const metrics = PsychometricScorer.evaluate(records, true, 0.5);
    expect(metrics.d_prime).toBeGreaterThan(1.8);
    expect(metrics.brier_score).toBeLessThan(0.01);
  });

  test("4. 4AFC 高精度查表扩展: 高正确率 P(c) > 0.9922 可平滑解析至 d' in (4.0, 5.0]", () => {
    const d40 = compute4AFCdPrime(0.9922);
    const d45 = compute4AFCdPrime(0.9974);
    const d50 = compute4AFCdPrime(0.9994);

    expect(d40).toBeCloseTo(4.0, 1);
    expect(d45).toBeGreaterThan(4.4);
    expect(d50).toBeCloseTo(5.0, 1);
  });

  test("5. IVE 信息检索杠杆效率: 同时支持『先买线索后一次作答 (Single-Pass)』与『初答错后买线索修正 (Two-Phase)』", () => {
    const sm = new SessionManager(":memory:");
    const sess = sm.createSession({ totalTrials: 12, warmupTrials: 4, subjectName: "SinglePassHintAgent" });

    for (let i = 1; i <= 12; i++) {
      const task = (sm as any).sessions.get(sess.sessionId).currentTask;
      if (i >= 5 && i <= 8) {
        // 先买一级线索，随后直接提交正确答案 (LLM / 前端真实单步流)
        sm.requestHint(sess.sessionId);
        sm.submitPhase1(sess.sessionId, task.correct_option);
        sm.submitPhase2(sess.sessionId, MetacognitiveAction.HIGH_BET, 0.95);
      } else {
        sm.submitPhase1(sess.sessionId, task.correct_option);
        sm.submitPhase2(sess.sessionId, MetacognitiveAction.HIGH_BET, 0.95);
      }
    }

    const report = sm.getReport(sess.sessionId);
    expect(report.metacognitive_metrics.info_buying_efficiency).toBeGreaterThan(0.85);
  });

  test("6. 5-Tier 连续难度梯度引擎: 覆盖全部 8 大题型与 5 个难度层级，零重复选项、零算术错误、零末尾空心泄漏", () => {
    const gen = new TaskGenerator(20261019);
    const deltas = [0.80, 0.62, 0.45, 0.25, 0.08]; // Tiers 1, 2, 3, 4, 5
    const expectedTiers = [1, 2, 3, 4, 5];

    let parityNonHollowEnds = 0;
    let parityTotalChecked = 0;

    for (let dIdx = 0; dIdx < deltas.length; dIdx++) {
      const delta = deltas[dIdx];
      expect(TaskGenerator.getDifficultyTier(delta)).toBe(expectedTiers[dIdx] as any);

      // 每个难度档位生成 16 道题 (完整覆盖 2 个 8 题拉丁方区组)
      for (let t = 1; t <= 16; t++) {
        const task = gen.generate(t, delta);
        const optVals = Object.values(task.options);
        expect(optVals.length).toBe(4);
        expect(new Set(optVals).size).toBe(4);
        expect(["A", "B", "C", "D"]).toContain(task.correct_option);
        expect(task.stimulus_data.difficulty_tier).toBe(expectedTiers[dIdx]);

        const correctText = task.options[task.correct_option];

        // 校验 PARITY_INVARIANT 在 Tier 2/3 不再 100% 以空心符号结尾
        if (task.stimulus_data.task_type === "PARITY_INVARIANT" && (dIdx === 1 || dIdx === 2)) {
          parityTotalChecked++;
          const tokens = correctText.split(/\s+/);
          const lastSym = tokens[tokens.length - 1];
          if (!["○", "□", "△"].includes(lastSym)) {
            parityNonHollowEnds++;
          }
        }

        // 校验 SEQUENCE_PROGRESSION 在 Tier 4 的二阶等差数学严密性
        if (task.stimulus_data.task_type === "SEQUENCE_PROGRESSION" && dIdx === 3) {
          const matches = [...task.prompt.matchAll(/\[[^\s\]]+\s+(\d+)\]/g)].map(m => Number(m[1]));
          expect(matches.length).toBe(4);
          const d1 = matches[1] - matches[0];
          const d2 = matches[2] - matches[1];
          const d3 = matches[3] - matches[2];
          expect(d2).toBe(d1 * 2);
          expect(d3).toBe(d1 * 3);
          const expectedFifth = matches[3] + d1 * 4;
          expect(correctText).toContain(String(expectedFifth));
        }

        // 7. 校验线索防剧透：hint_tier1 与 hint_tier2 绝不直接包含完整正确选项字符串或直接点名正确选项字母
        expect(task.hint_tier1).not.toContain("答案直接锁定为");
        expect(task.hint_tier2).not.toContain("答案直接锁定为");
        if (correctText.length >= 3) {
          expect(task.hint_tier1).not.toContain(`'${correctText}'`);
          expect(task.hint_tier2).not.toContain(`'${correctText}'`);
        }
      }
    }

    expect(parityTotalChecked).toBeGreaterThan(0);
    expect(parityNonHollowEnds).toBeGreaterThan(0);
  });

  test("7. GET /api/admin/sessions 鉴权保护: 未授权访问返回 401，携带有效管理员令牌返回 200", async () => {
    const unauthRes = await appDefault.fetch(new Request("http://localhost/api/admin/sessions"));
    expect(unauthRes.status).toBe(401);

    const authRes = await appDefault.fetch(
      new Request(`http://localhost/api/admin/sessions?token=${encodeURIComponent(ADMIN_PASSWORD)}`)
    );
    expect(authRes.status).toBe(200);
    const data = await authRes.json();
    expect(Array.isArray(data.sessions)).toBe(true);
  });
});
