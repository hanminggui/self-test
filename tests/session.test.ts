import { describe, test, expect } from "bun:test";
import { TaskGenerator } from "../src/backend/task_generator";
import { StaircaseController } from "../src/backend/staircase";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction } from "../src/backend/models";

describe("TaskGenerator", () => {
  test("generates 8 distinct task types with strictly 4 unique options", () => {
    const gen = new TaskGenerator(12345);
    for (let i = 1; i <= 16; i++) {
      const task = gen.generate(i, 0.5);
      expect(task.options).toBeDefined();
      const keys = Object.keys(task.options);
      expect(keys.length).toBe(4);
      expect(keys).toEqual(["A", "B", "C", "D"]);

      // Assert zero duplicate options
      const values = Object.values(task.options);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(4);

      // Assert correct option is inside keys
      expect(keys).toContain(task.correct_option);

      // Assert signal type is valid
      expect(["S1", "S2"]).toContain(task.signal_type);

      // Safe payload has no answer leakage
      const safe = task.toSafePayload();
      expect((safe as any).correct_option).toBeUndefined();
      expect((safe as any).signal_type).toBeUndefined();
    }
  });
});

describe("StaircaseController", () => {
  test("implements 2-up-1-down rule", () => {
    const sc = new StaircaseController(0.50, 0.08);

    // 1 correct: no change
    sc.update(true);
    expect(sc.getCurrentDelta()).toBe(0.50);

    // 2 consecutive correct: gets harder (delta decreases)
    sc.update(true);
    expect(sc.getCurrentDelta()).toBeLessThan(0.50);

    // 1 incorrect: gets easier (delta increases)
    const deltaBefore = sc.getCurrentDelta();
    sc.update(false);
    expect(sc.getCurrentDelta()).toBeGreaterThan(deltaBefore);
  });
});

describe("SessionManager", () => {
  test("completes a full lifecycle and computes report with custom role title", () => {
    const sm = new SessionManager(":memory:");
    const session = sm.createSession({
      totalTrials: 12,
      warmupTrials: 4,
      subjectName: "测试员张三",
    });

    for (let i = 1; i <= 12; i++) {
      const req = sm.getTrialRequest(session.sessionId);
      expect(req.trial_index).toBe(i);

      // Phase 1
      sm.submitPhase1(session.sessionId, "A");

      // Phase 2
      const stepRes = sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET);
      if (i < 12) {
        expect(stepRes.is_completed).toBe(false);
      } else {
        expect(stepRes.is_completed).toBe(true);
      }
    }

    const report = sm.getReport(session.sessionId);
    expect(report.session_id).toBe(session.sessionId);
    expect(report.subject_name).toBe("测试员张三");
    expect(report.summary.total_trials).toBe(12);

    // Profile must be one of the 8 v2 custom titles
    const allowedTitles = [
      "人形外挂",
      "灵窍天开",
      "定海神针",
      "飞龙在天",
      "潜龙勿用",
      "无畏先锋",
      "长袖善舞",
      "暮光星灵",
    ];
    expect(allowedTitles).toContain(report.diagnostic_profile.role_title);
    expect(report.diagnostic_profile.skills.length).toBe(4);
    expect(report.diagnostic_profile.clinical_summary).toBeDefined();
  });
});
