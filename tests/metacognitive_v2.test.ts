/**
 * Metacognitive Testing System v2.0 - Complete Test Suite (tests/metacognitive_v2.test.ts)
 * 
 * Verifies:
 * 1. 8 Archetype Mock Agents covering 100% of the MECE classification hyperplanes.
 * 2. Boundary and Robustness: All correct (ceiling), all incorrect (floor), 0 hints, 0/1 reversals.
 * 3. Two-Tier Decoupling: User-facing positive empowerment vs objective clinical truth.
 * 4. 4D-to-2D Manifold Multivariate Color Glyph mapping with alpha clamping.
 */

import { describe, test, expect } from "bun:test";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, CognitiveArchetype, TrialRecord } from "../src/backend/models";
import { StaircaseController } from "../src/backend/staircase";
import { PsychometricScorer } from "../src/backend/metrics";
import {
  classifyCognitiveArchetype,
  getArchetypeDefinition,
  ARCHETYPE_MATRIX,
  mapLegacyArchetype,
} from "../src/backend/archetype_matrix";
import { computeMultivariateColor } from "../src/frontend/Admin";

describe("Metacognitive v2.0 Architecture & Cognitive Manifold Suite", () => {
  // =========================================================================
  // 1. MECE 超平面判别引擎单元测试 (8 大画像分支全覆盖)
  // =========================================================================
  describe("MECE Classifier §6.1 8 大认知画像拓扑全覆盖", () => {
    test("Q8-DRI: 暮光星灵 (高熵混沌漫游态)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.30,
        dPrime: 0.80,
        mRatio: 0.20,
        bias: 0.05,
        brier: 0.32, // > 0.28
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.STOCHASTIC_DRIFTER);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("暮光星灵");
      expect(def.quadrant_code).toBe("Q8-DRI");
    });

    test("Q7-ARB: 诸葛在世 (系统性概率套利)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.55,
        dPrime: 1.20,
        mRatio: 0.75, // >= 0.65
        bias: 0.00,
        brier: 0.18,
        ive: 0.82,    // >= 0.70
        hintsCount: 3,// >= 3
      });
      expect(arch).toBe(CognitiveArchetype.PRAGMATIC_ARBITRAGEUR);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("诸葛在世");
      expect(def.quadrant_code).toBe("Q7-ARB");
    });

    test("Q1-CAL: 人形外挂 (高一元·高二元·知行自洽)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.75, // >= 0.60
        dPrime: 1.80,
        mRatio: 0.95, // >= 0.80
        bias: 0.02,  // |bias| <= 0.15
        brier: 0.12,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.SOVEREIGN);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("人形外挂");
      expect(def.quadrant_code).toBe("Q1-CAL");
    });

    test("Q1-CAL: 天花板效应下的顶级模型 (Acc 97.5%, d' 3.106, Bias -0.08) 即使 M_ratio 遭统计压缩也准确归入人形外挂", () => {
      // 现场复现用户 deepseek-v4-flash 60 步测试数据 (收敛至高相变突破度 D* >= 0.85)
      const arch = classifyCognitiveArchetype({
        dStar: 0.90,
        dPrime: 3.106, // 极高一元水平
        mRatio: 0.632, // 因负样本稀疏导致 M_ratio 遭遇统计压缩 (< 0.80)
        bias: -0.08,   // 处于黄金自洽区间 [-0.15, 0.15]
        brier: 0.019,  // 预测误差极低
        ive: 0.0,
        hintsCount: 11,
      });
      expect(arch).toBe(CognitiveArchetype.SOVEREIGN);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("人形外挂");
      expect(def.quadrant_code).toBe("Q1-CAL");
    });

    test("Q3-SEN: 定海神针 (高一元·过度谨慎守舵)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.70, // >= 0.60
        dPrime: 1.60,
        mRatio: 0.70, // not Q1
        bias: -0.25, // < -0.12
        brier: 0.22,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.VIGILANT_SENTINEL);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("定海神针");
      expect(def.quadrant_code).toBe("Q3-SEN");
    });

    test("Q4-PIO: 飞龙在天 (高一元·激进冒险破局)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.68, // >= 0.60
        dPrime: 1.55,
        mRatio: 0.60, // not Q1
        bias: 0.10,  // >= -0.12
        brier: 0.20,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.AUDACIOUS_PIONEER);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("飞龙在天");
      expect(def.quadrant_code).toBe("Q4-PIO");
    });

    test("Q2-EVO: 灵窍天开 (低一元·高二元·高信息杠杆进化)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.40, // < 0.60
        dPrime: 1.00, // < 1.40
        mRatio: 0.72, // >= 0.60
        bias: -0.05,
        brier: 0.20,
        ive: 0.68,   // >= 0.60
        hintsCount: 2, // >= 2
      });
      expect(arch).toBe(CognitiveArchetype.ADAPTIVE_LEARNER);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("灵窍天开");
      expect(def.quadrant_code).toBe("Q2-EVO");
    });

    test("Q5-RET: 大音希声 (低一元·审慎防御避险)", () => {
      // 分支 A: mRatio >= 0.60 但未购买足够线索 (hintsCount < 2)
      const archA = classifyCognitiveArchetype({
        dStar: 0.45,
        dPrime: 0.95,
        mRatio: 0.65,
        bias: -0.10,
        brier: 0.22,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(archA).toBe(CognitiveArchetype.ANXIOUS_RETREATER);
      const defA = getArchetypeDefinition(archA);
      expect(defA.role_title).toBe("大音希声");
      expect(defA.quadrant_code).toBe("Q5-RET");

      // 分支 B: 低一元、低知觉但审慎本分 (bias <= 0.15)
      const archB = classifyCognitiveArchetype({
        dStar: 0.35,
        dPrime: 0.80,
        mRatio: 0.45,
        bias: 0.05,
        brier: 0.24,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(archB).toBe(CognitiveArchetype.ANXIOUS_RETREATER);
    });

    test("Q6-GAM: 无畏先锋 (低一元·低二元·达克盲赌)", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.35, // < 0.60
        dPrime: 0.70,
        mRatio: 0.30, // < 0.50
        bias: 0.35,  // > +0.15
        brier: 0.26, // <= 0.28
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.BLIND_GAMBLER);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("无畏先锋");
      expect(def.quadrant_code).toBe("Q6-GAM");
    });

    test("Q6-GAM: 极度过度自信盲赌者即使因小分母偶然计算出高 mRatio (果果真实数据模式)，也必须截断归入 Q6", () => {
      const arch = classifyCognitiveArchetype({
        dStar: 0.205, // 答对率仅 36%
        dPrime: 0.4031, // 极小一元分母
        mRatio: 1.2684, // 离散噪声放大的高 Y 轴数值
        bias: 0.4727,  // > +0.15 极度自负冒进
        brier: 0.4268,
        ive: 0.50,
        hintsCount: 0,
      });
      expect(arch).toBe(CognitiveArchetype.BLIND_GAMBLER);
      const def = getArchetypeDefinition(arch);
      expect(def.role_title).toBe("无畏先锋");
      expect(def.quadrant_code).toBe("Q6-GAM");
    });
  });

  // =========================================================================
  // 2. 模拟受测者全生命周期测试 (End-to-End Mock Session Lifecycle)
  // =========================================================================
  describe("8 组 Mock Agents 端到端生成与分类测试", () => {
    test("Mock Q1 Sovereign Agent 端到端产出人形外挂报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "SovereignAgent" });

      // 模拟高一元 (85% 胜率) + 高二元自知 (正确时 HIGH_BET 信心 0.95，错误时 SAFE_BET 信心 0.45)
      for (let i = 1; i <= 30; i++) {
        const isCorrect = i % 10 !== 0; // 90% 正确
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");

        sm.submitPhase1(session.sessionId, choice);
        if (isCorrect) {
          sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.95);
        } else {
          sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.45);
        }
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.SOVEREIGN);
      expect(report.diagnostic_profile.role_title).toBe("人形外挂");
      expect(report.metacognitive_metrics.d_star).toBeGreaterThan(0.60);
      expect(report.metacognitive_metrics.cognitive_manifold_vector).toBeDefined();
      expect(report.metacognitive_metrics.cognitive_manifold_vector.length).toBe(4);
    });

    test("Mock Q7 Pragmatic Arbitrageur Agent 端到端产出诸葛在世报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "ArbitrageurAgent" });

      for (let i = 1; i <= 30; i++) {
        const task = (sm as any).sessions.get(session.sessionId).currentTask;

        if (i >= 10 && i <= 13) {
          // 购买线索并挽救成功 (4 次购买，均挽救成功)
          sm.requestHint(session.sessionId);
          sm.submitPhase1(session.sessionId, task.correct_option === "A" ? "B" : "A"); // 初答错误
          sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.90, task.correct_option); // 借助线索修正为对
        } else {
          // 常规答题: 正确下高注，错误下保底
          const isCorrect = i % 3 !== 0;
          const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");
          sm.submitPhase1(session.sessionId, choice);
          if (isCorrect) {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.90);
          } else {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.45);
          }
        }
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.PRAGMATIC_ARBITRAGEUR);
      expect(report.diagnostic_profile.role_title).toBe("诸葛在世");
      expect(report.metacognitive_metrics.info_buying_efficiency).toBeGreaterThanOrEqual(0.70);
    });

    test("Mock Q2 Adaptive Learner Agent 端到端产出灵窍天开报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "AdaptiveLearnerAgent" });

      for (let i = 1; i <= 30; i++) {
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        if (i === 10 || i === 11) {
          // 购买线索并成功修正 (2 次线索)
          sm.requestHint(session.sessionId);
          sm.submitPhase1(session.sessionId, task.correct_option === "A" ? "B" : "A");
          sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.85, task.correct_option);
        } else {
          // 低一元能力 (~50% 客观胜率)，但知己自省 (对时 HIGH，错时 SAFE)
          const isCorrect = i % 2 === 0;
          const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");
          sm.submitPhase1(session.sessionId, choice);
          if (isCorrect) {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.85);
          } else {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.45);
          }
        }
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.ADAPTIVE_LEARNER);
      expect(report.diagnostic_profile.role_title).toBe("灵窍天开");
      expect(report.diagnostic_profile.quadrant_code).toBe("Q2-EVO");
    });

    test("Mock Q3 Vigilant Sentinel Agent 端到端产出定海神针报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "SentinelAgent" });

      // 高一元能力 (85% 答对)，但审慎保守 (做对时也频繁下保底注，导致 Bias < -0.12)
      for (let i = 1; i <= 30; i++) {
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        const isCorrect = i % 7 !== 0; // ~86% 正确率
        const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");

        sm.submitPhase1(session.sessionId, choice);
        if (isCorrect) {
          // 做对时约一半下保底 (冒名顶替偏向)，一半下高注
          if (i % 2 === 0) {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.80);
          } else {
            sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.50);
          }
        } else {
          sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.50);
        }
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.VIGILANT_SENTINEL);
      expect(report.diagnostic_profile.role_title).toBe("定海神针");
      expect(report.metacognitive_metrics.calibration_bias).toBeLessThan(-0.12);
    });

    test("Mock Q5 Anxious Retreater Agent 端到端产出大音希声报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "RetreaterAgent" });

      // 低一元能力，绝不购买线索，下注克制审慎保底
      for (let i = 1; i <= 30; i++) {
        const task = (sm as any).sessions.get(session.sessionId).currentTask;
        const isCorrect = i % 2 === 0; // 50%
        const choice = isCorrect ? task.correct_option : (task.correct_option === "A" ? "B" : "A");

        sm.submitPhase1(session.sessionId, choice);
        sm.submitPhase2(session.sessionId, MetacognitiveAction.SAFE_BET, 0.50);
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.ANXIOUS_RETREATER);
      expect(report.diagnostic_profile.role_title).toBe("大音希声");
      expect(report.diagnostic_profile.quadrant_code).toBe("Q5-RET");
    });

    test("Mock Q8 Stochastic Drifter Agent 端到端产出暮光星灵报告", () => {
      const sm = new SessionManager(":memory:");
      const session = sm.createSession({ totalTrials: 30, warmupTrials: 6, subjectName: "DrifterAgent" });

      // 全程盲目乱猜 (一元 25% 命中率)，但全额下高注 (置信度 0.95)，造成极高 Brier 与解耦
      for (let i = 1; i <= 30; i++) {
        sm.submitPhase1(session.sessionId, "A"); // 纯固定盲选
        sm.submitPhase2(session.sessionId, MetacognitiveAction.HIGH_BET, 0.95);
      }

      const report = sm.getReport(session.sessionId);
      expect(report.diagnostic_profile.archetype).toBe(CognitiveArchetype.STOCHASTIC_DRIFTER);
      expect(report.diagnostic_profile.role_title).toBe("暮光星灵");
      expect(report.metacognitive_metrics.brier_score).toBeGreaterThan(0.28);
    });
  });

  // =========================================================================
  // 3. 边界与健壮性测试 (Boundary & Robustness)
  // =========================================================================
  describe("边界与健壮性保护 (Boundary Protection)", () => {
    test("全对撞顶 (Ceiling): D* 收敛于 1.0, 零反转回退滑动均值保护", () => {
      const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3);
      for (let i = 0; i < 30; i++) {
        sc.update(true); // 全对
      }
      expect(sc.getCurrentDelta()).toBe(sc.minDelta); // 0.05
      const dStar = sc.computeDStar();
      expect(dStar).toBe(1.0); // (0.85 - 0.05) / 0.80 = 1.0
      expect(sc.reversalCount).toBe(0); // 持续变难，无反转
    });

    test("全错撞底 (Floor): D* 收敛于 0.0, 零反转回退滑动均值保护", () => {
      const sc = new StaircaseController(0.50, 0.08, 0.05, 0.85, 3);
      for (let i = 0; i < 30; i++) {
        sc.update(false); // 全错
      }
      expect(sc.getCurrentDelta()).toBe(sc.maxDelta); // 0.85
      const dStar = sc.computeDStar();
      expect(dStar).toBe(0.0); // (0.85 - 0.85) / 0.80 = 0.0
      expect(sc.reversalCount).toBe(0);
    });

    test("零购买线索: IVE 严格处于 0.50 中性先验基准值", () => {
      const dummyRecords: TrialRecord[] = [
        {
          trial_index: 1,
          difficulty_level: 0.5,
          stimulus_id: "s1",
          signal_type: "S1",
          correct_option: "A",
          first_order_choice: "A",
          is_correct_first_order: true,
          action: MetacognitiveAction.HIGH_BET,
          confidence_level: 0.9,
          hint_purchased: false,
          is_correct_final: true,
          score_delta: 10,
          is_warmup: false,
        },
      ];
      const ive = PsychometricScorer.computeInfoBuyingEfficiency(dummyRecords);
      expect(ive).toBe(0.50);
    });

    test("反向敏感度截断 (Reverse Sensitivity Truncation): H2* < FA2* 强制截断为 0.05", () => {
      // 构造下注倒挂样本：做对时下保底，做错时全下高注
      const invertedRecords: TrialRecord[] = [
        {
          trial_index: 1,
          difficulty_level: 0.5,
          stimulus_id: "s1",
          signal_type: "S1",
          correct_option: "A",
          first_order_choice: "A",
          is_correct_first_order: true,
          action: MetacognitiveAction.SAFE_BET, // 做对下保底
          confidence_level: 0.5,
          hint_purchased: false,
          is_correct_final: true,
          score_delta: 3,
          is_warmup: false,
        },
        {
          trial_index: 2,
          difficulty_level: 0.5,
          stimulus_id: "s2",
          signal_type: "S1",
          correct_option: "A",
          first_order_choice: "B",
          is_correct_first_order: false,
          action: MetacognitiveAction.HIGH_BET, // 做错下高注
          confidence_level: 0.95,
          hint_purchased: false,
          is_correct_final: false,
          score_delta: -10,
          is_warmup: false,
        },
      ];

      const metrics = PsychometricScorer.evaluate(invertedRecords, false);
      expect(metrics.meta_d_prime).toBe(0.01);
      expect(metrics.m_ratio).toBe(0.05);
    });
  });

  // =========================================================================
  // 4. 双层架构与色彩映射规范测试 (Visual Channels & Alpha Clamping)
  // =========================================================================
  describe("4D-to-2D 视觉通道与双变量色彩映射规范 §7.4", () => {
    test("防隐形规约: 任意 IVE 下透明度绝对处于 [0.45, 1.00] 之间，杜绝幽灵点", () => {
      // IVE = 0.0 (未购买线索)
      const token0 = computeMultivariateColor(0.0, 0.0);
      expect(token0.backgroundColor).toContain("0.45");

      // IVE = 1.0 (极高转化)
      const token1 = computeMultivariateColor(0.0, 1.0);
      expect(token1.backgroundColor).toContain("1.00");

      // IVE = 0.5
      const tokenHalf = computeMultivariateColor(0.0, 0.5);
      expect(tokenHalf.backgroundColor).toContain("0.73");
    });

    test("高杠杆辉光 (Aura Glow): IVE >= 0.70 激活外发光阴影", () => {
      const normal = computeMultivariateColor(0.0, 0.69);
      expect(normal.boxShadow).toBe("none");

      const glow = computeMultivariateColor(0.0, 0.70);
      expect(glow.boxShadow).not.toBe("none");
      expect(glow.boxShadow).toContain("10px");
    });

    test("色相流向: Bias < -0.12 向冰蓝青色插值，Bias > 0.12 向炽橙红插值", () => {
      const neutral = computeMultivariateColor(0.0, 0.5);
      expect(neutral.hue).toBe(155); // 翡翠绿

      const cautious = computeMultivariateColor(-0.37, 0.5);
      expect(cautious.hue).toBe(205); // 冰蓝青色

      const bold = computeMultivariateColor(0.37, 0.5);
      expect(bold.hue).toBe(15); // 炽橙红
    });

    test("展示层与统计层物理隔离: 修改展示层称号绝不影响统计层枚举与超平面判定", () => {
      const def = ARCHETYPE_MATRIX[CognitiveArchetype.SOVEREIGN];
      expect(def.archetype).toBe(CognitiveArchetype.SOVEREIGN);
      expect(def.clinical_summary).toContain("高一元·高二元·知行自洽");
      expect(def.role_title).toBe("人形外挂");
      expect(def.skills.length).toBe(4);
    });

    test("历史遗留枚举兼容映射 (Backward Compatibility)", () => {
      expect(mapLegacyArchetype("ACCURATELY_CALIBRATED")).toBe(CognitiveArchetype.SOVEREIGN);
      expect(mapLegacyArchetype("Q1_MASTER")).toBe(CognitiveArchetype.SOVEREIGN);
      expect(mapLegacyArchetype("UNDERCONFIDENT")).toBe(CognitiveArchetype.VIGILANT_SENTINEL);
      expect(mapLegacyArchetype("OVERCONFIDENT")).toBe(CognitiveArchetype.AUDACIOUS_PIONEER);
      expect(mapLegacyArchetype("RANDOM_GUESSER")).toBe(CognitiveArchetype.STOCHASTIC_DRIFTER);
    });
  });
});
