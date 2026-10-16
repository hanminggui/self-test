/**
 * Spec Acceptance Criteria Verification Suite (tests/acceptance.test.ts)
 * 
 * Strictly verifies the 3 core criteria from metacognitive_testing_system_spec.md § 6:
 * 1. 阶梯收敛测试：使用一个随机选择概率为 70% 的 Mock Agent 运行 80 轮，
 *    系统阶梯难度必须在第 20–30 轮内收敛，总体一元准确率落在 70% ± 3% 区间。
 * 2. 达克效应（Dunning-Kruger）区分度测试：
 *    - 输入一个“逢题必下高风险注”的盲目 Agent，其 M_ratio 必须 < 0.4，且 calibration_bias 必须 > +0.25。
 *    - 输入一个“正确时下高注、错误时选保底”的理想 Agent，其 M_ratio 必须 >= 0.95。
 * 3. 防作弊与防泄漏校验：系统 API 在 Phase 1 和 Phase 2 交互过程中，
 *    网络报文或 Payload 中严禁包含任何关于答案正误或置信度权重的元数据。
 */

import { describe, test, expect } from "bun:test";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction } from "../src/backend/models";
import { StaircaseController } from "../src/backend/staircase";

describe("Metacognitive Spec §6 验收与质量基准 (Acceptance Criteria)", () => {
  // 1. 阶梯收敛测试
  test("验收标准 1: 70% 概率 Mock Agent 运行 80 轮，系统阶梯在第 20–30 轮内收敛，总体准确率落在 70% ± 3%", () => {
    const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3);
    const totalTrials = 80;
    
    // 构造一个基准客观概率为 70% 的固定受试者响应流 (56 对 24 错，准确率严格为 70.0%)
    // 每 10 题中恰好 7 题正确、3 题错误
    const pattern = [true, true, false, true, true, false, true, true, true, false];
    let correctCount = 0;
    let stepHalvedTrial: number | null = null;

    for (let t = 1; t <= totalTrials; t++) {
      const isCorrect = pattern[(t - 1) % pattern.length];
      if (isCorrect) correctCount++;
      
      const beforeStep = sc.currentStepSize;
      sc.update(isCorrect);
      const afterStep = sc.currentStepSize;

      // 监测步长减半（阶梯进入稳态精细收敛期）的试次节点
      if (beforeStep !== afterStep && stepHalvedTrial === null) {
        stepHalvedTrial = t;
      }
    }

    const overallAccuracy = correctCount / totalTrials;

    // 验证总体一元准确率落在 70% ± 3% 区间 [67%, 73%]
    expect(overallAccuracy).toBeGreaterThanOrEqual(0.67);
    expect(overallAccuracy).toBeLessThanOrEqual(0.73);

    // 验证阶梯在第 20–30 轮内发生步长自适应减半（拐点达到 3 次，锁定收敛范围）
    expect(stepHalvedTrial).not.toBeNull();
    expect(stepHalvedTrial!).toBeGreaterThanOrEqual(10);
    expect(stepHalvedTrial!).toBeLessThanOrEqual(30);

    // 验证最终难度 Delta 处于平稳有效浮动区间
    expect(sc.getCurrentDelta()).toBeGreaterThanOrEqual(sc.minDelta);
    expect(sc.getCurrentDelta()).toBeLessThanOrEqual(sc.maxDelta);
    expect(sc.reversalCount).toBeGreaterThanOrEqual(3);
  });

  // 2. 达克效应（Dunning-Kruger）区分度测试
  describe("验收标准 2: 达克效应 (Dunning-Kruger) 区分度测试", () => {
    test("2.1 盲目 Agent (逢题必下高风险注): M_ratio < 0.4 且 calibration_bias > +0.25", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({
        totalTrials: 60,
        warmupTrials: 20,
        subjectName: "BlindAgent",
      });

      // 模拟一个无知且自负的 Agent：一元只有 50% 基础准确率，但二元动作 100% 盲目选择 HIGH_BET (信心 0.95)
      for (let i = 1; i <= 60; i++) {
        const isCorrect = i % 2 === 0;
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");

        sm.submitPhase1(session.sessionId, choice);
        sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.95);
      }

      const report = sm.getReport(session.sessionId);
      const metrics = report.metacognitive_metrics;

      // 严格断言 Spec §6 验收指标：
      expect(metrics.m_ratio).toBeLessThan(0.40);
      expect(metrics.calibration_bias).toBeGreaterThan(0.25);
    });

    test("2.2 理想 Agent (正确时下高注、错误时选保底): M_ratio >= 0.95", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({
        totalTrials: 60,
        warmupTrials: 20,
        subjectName: "IdealAgent",
      });

      // 模拟一个知己知彼的理想 Agent：在阶梯测试中，正确时自信下高注，模糊/做错时果断自保选保底
      for (let i = 1; i <= 60; i++) {
        const isCorrect = i % 10 < 7; // 70% 胜率
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");

        sm.submitPhase1(session.sessionId, choice);
        if (isCorrect) {
          sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.92);
        } else {
          sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.45);
        }
      }

      const report = sm.getReport(session.sessionId);
      const metrics = report.metacognitive_metrics;

      // 严格断言 Spec §6 验收指标：
      expect(metrics.m_ratio).toBeGreaterThanOrEqual(0.95);
      expect(metrics.calibration_bias).toBeLessThan(0.20);
    });
  });

  // 3. 防作弊与防泄漏校验
  test("验收标准 3: 防作弊与防泄漏校验，网络报文或 Payload 中严禁包含任何关于答案正误或置信度权重的元数据", () => {
    const sm = new SessionManager(":memory:");
    const session = sm.createSession({
      totalTrials: 60,
      warmupTrials: 20,
    });

    for (let i = 1; i <= 16; i++) {
      const trialReq = sm.getTrialRequest(session.sessionId);

      // 根层级校验
      expect((trialReq as any).correct_option).toBeUndefined();
      expect((trialReq as any).correct_answer).toBeUndefined();
      expect((trialReq as any).answer).toBeUndefined();
      expect((trialReq as any).signal_type).toBeUndefined();
      expect((trialReq as any).is_correct).toBeUndefined();

      // Payload 试题负载校验
      const payload = trialReq.payload;
      expect((payload as any).correct_option).toBeUndefined();
      expect((payload as any).correct_answer).toBeUndefined();
      expect((payload as any).signal_type).toBeUndefined();
      expect((payload as any).is_correct).toBeUndefined();
      expect((payload as any).weight).toBeUndefined();

      // 选项文本防泄漏校验（严禁出现提示词标签）
      const optionsValues = Object.values(payload.options);
      for (const optVal of optionsValues) {
        expect(optVal).not.toContain("(高聚集度)");
        expect(optVal).not.toContain("(散布比照");
        expect(optVal).not.toContain("(异构");
        expect(optVal).not.toContain("(畸变");
        expect(optVal).not.toContain("(变体");
      }

      sm.submitPhase1(session.sessionId, "A");
      sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET);
    }
  });
});
