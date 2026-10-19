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
      "大音希声",
      "无畏先锋",
      "诸葛在世",
      "暮光星灵",
    ];
    expect(allowedTitles).toContain(report.diagnostic_profile.role_title);
    expect(report.diagnostic_profile.skills.length).toBe(4);
    expect(report.diagnostic_profile.clinical_summary).toBeDefined();

    // Verify session deletion
    const deleted = sm.deleteSession(session.sessionId);
    expect(deleted).toBe(true);
    expect(() => sm.getReport(session.sessionId)).toThrow();
  });

  test("SessionManager tracks and persists execution metadata and per-trial step metrics", () => {
    const sm = new SessionManager(":memory:");
    const session = sm.createSession({
      subjectName: "Model_Qwen-2.5-72B",
      totalTrials: 3,
      warmupTrials: 1,
      persona: "严谨的逻辑学家",
      thinkingEffort: "medium",
      metadata: {
        model_name: "qwen-2.5-72b",
      },
    });

    expect(session.metadata?.persona).toBe("严谨的逻辑学家");
    expect(session.metadata?.thinking_effort).toBe("medium");

    // Trial 1
    sm.submitPhase1(session.sessionId, "A");
    sm.submitPhase2(
      session.sessionId,
      MetacognitiveAction.HIGH_BET,
      0.90,
      undefined,
      {
        duration_ms: 1250,
        token_usage: {
          prompt_tokens: 350,
          completion_tokens: 60,
          cached_tokens: 200,
          reasoning_tokens: 40,
          total_tokens: 410,
        },
        operations: [
          { step: "HINT_TIER1", action: "DECIDE" },
          { step: "FIRST_ORDER_CHOICE", action: "A" },
          { step: "SECOND_ORDER_BET", action: "HIGH_BET", details: { confidence: 0.90 } },
        ],
      }
    );

    // Trial 2
    sm.submitPhase1(session.sessionId, "B");
    sm.submitPhase2(
      session.sessionId,
      MetacognitiveAction.SAFE_BET,
      0.55,
      undefined,
      {
        duration_ms: 980,
        token_usage: {
          prompt_tokens: 360,
          completion_tokens: 30,
          cached_tokens: 300,
          reasoning_tokens: 0,
          total_tokens: 390,
        },
      }
    );

    // Trial 3 (Finish)
    sm.submitPhase1(session.sessionId, "C");
    sm.submitPhase2(
      session.sessionId,
      MetacognitiveAction.HIGH_BET,
      0.85,
      undefined,
      {
        duration_ms: 1100,
        token_usage: {
          prompt_tokens: 370,
          completion_tokens: 50,
          cached_tokens: 350,
          reasoning_tokens: 20,
          total_tokens: 420,
        },
      }
    );

    const report = sm.getReport(session.sessionId);
    expect(report.metadata).toBeDefined();
    expect(report.metadata?.model_name).toBe("qwen-2.5-72b");
    expect(report.metadata?.persona).toBe("严谨的逻辑学家");
    expect(report.metadata?.thinking_effort).toBe("medium");
    expect(report.metadata?.completed_trials).toBe(3);
    expect(report.metadata?.total_trials).toBe(3);
    expect(report.metadata?.total_duration_ms).toBeGreaterThanOrEqual(0);

    // Token aggregation
    expect(report.metadata?.token_usage?.prompt_tokens).toBe(350 + 360 + 370);
    expect(report.metadata?.token_usage?.completion_tokens).toBe(60 + 30 + 50);
    expect(report.metadata?.token_usage?.cached_tokens).toBe(200 + 300 + 350);
    expect(report.metadata?.token_usage?.reasoning_tokens).toBe(40 + 0 + 20);
    expect(report.metadata?.token_usage?.total_tokens).toBe(410 + 390 + 420);

    // Records verification
    expect(report.records).toBeDefined();
    expect(report.records?.length).toBe(3);
    const r1 = report.records![0];
    expect(r1.duration_ms).toBe(1250);
    expect(r1.token_usage?.prompt_tokens).toBe(350);
    expect(r1.token_usage?.cached_tokens).toBe(200);
    expect(r1.operations?.length).toBe(3);
    expect(r1.operations![0].step).toBe("HINT_TIER1");

    // Test updateSessionMetadata API
    sm.updateSessionMetadata(session.sessionId, {
      formatted_duration: "3.3s",
      persona: "严谨的逻辑学家 (已强化)",
    });

    const updatedRep = sm.getReport(session.sessionId);
    expect(updatedRep.metadata?.formatted_duration).toBe("3.3s");
    expect(updatedRep.metadata?.persona).toBe("严谨的逻辑学家 (已强化)");
  });
});
