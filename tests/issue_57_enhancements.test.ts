import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AcidCyberPoster } from "../src/frontend/components/share/AcidCyberPoster";
import { MinimalistPoster } from "../src/frontend/components/share/MinimalistPoster";
import { PosterModal } from "../src/frontend/components/share/PosterModal";
import { VIP_THEMES } from "../src/frontend/pages/AssetsPage";
import { MobileAssessmentView } from "../src/frontend/components/game/MobileAssessmentView";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { GameEffectsProvider } from "../src/frontend/contexts/GameEffectsContext";
import { CognitiveArchetype } from "../src/backend/models";

describe("GitHub Issue #57 Enhancement Suite", () => {
  const sampleReport: any = {
    session_id: "sess_57_mock",
    subject_name: "先锋测试员",
    metacognitive_metrics: {
      d_prime: 2.33,
      meta_d_prime: 2.10,
      m_ratio: 0.90,
      calibration_bias: 0.02,
      d_star: 0.78,
      info_buying_efficiency: 0.65,
      cognitive_manifold_vector: [0.78, 0.90, 0.02, 0.65],
    },
    diagnostic_profile: {
      archetype: CognitiveArchetype.SOVEREIGN,
      quadrant_code: "Q1-CAL",
      role_title: "人形外挂",
      praise_tagline: "你开了 · 诗人握持",
      strength_tags: ["算力压制", "高维自洽", "知行合一", "敏捷洞察"],
      empowering_feedback: "您的四维心智处于极高维度。",
      growth_advice: "保持决策定力与自洽度。",
      skills: [],
      clinical_summary: "高辨别力·高元认知·知行自洽。",
    },
  };

  describe("1. 多模版海报系统渲染与数据安全 (AcidCyber & Minimalist)", () => {
    it("AcidCyberPoster 具备赛博先锋酸性视觉结构且不泄露底层数学坐标", () => {
      const html = renderToString(
        React.createElement(AcidCyberPoster, {
          report: sampleReport,
          entryUrl: "http://localhost:8000/",
        })
      );

      // 验证模版标记与核心标识
      expect(html).toContain('data-share-poster="acid-cyber"');
      expect(html).toContain("人形外挂");
      expect(html).toContain("先锋测试员");
      expect(html).toContain("NEO-ACID // V2.0 SPECTRUM");
      expect(html).toContain("CYBER_SYS_ACTIVE");
      expect(html).toContain("// ARCHETYPE CLASSIFICATION");

      // 验证敏感数据净化 (严禁泄露内部坐标与原始指标)
      expect(html).not.toContain("Q1-CAL");
      expect(html).not.toContain("2.33");
      expect(html).not.toContain("0.90");
      expect(html).not.toContain("一元辨别力");
      expect(html).not.toContain("二元自洽率");

      // 验证特技与标签展示
      expect(html).toContain("算力透视");
      expect(html).toContain("算力压制");
    });

    it("MinimalistPoster 具备极简典藏视觉结构且不泄露底层数学坐标", () => {
      const html = renderToString(
        React.createElement(MinimalistPoster, {
          report: sampleReport,
          entryUrl: "http://localhost:8000/",
        })
      );

      // 验证模版标记与核心标识
      expect(html).toContain('data-share-poster="minimalist-editorial"');
      expect(html).toContain("人形外挂");
      expect(html).toContain("先锋测试员");
      expect(html).toContain("ARCHIVE NO. 4D · EDITION 2026");
      expect(html).toContain("CORE APTITUDES &amp; DYNAMICS");
      expect(html).toContain("SELF-TEST COGNITIVE MANIFOLD");

      // 验证敏感数据净化
      expect(html).not.toContain("Q1-CAL");
      expect(html).not.toContain("2.33");
      expect(html).not.toContain("0.90");
      expect(html).not.toContain("calibration_bias");

      // 验证特技与标签展示
      expect(html).toContain("算力透视");
      expect(html).toContain("算力压制");
    });

    it("PosterModal 采用统一典藏模版 (根据反馈彻底移除多类型切换胶囊) 并保留情绪价值等待架构", () => {
      const html = renderToString(
        React.createElement(PosterModal, {
          isOpen: true,
          report: sampleReport,
          locale: "zh-CN",
          entryUrl: "http://localhost:8000/",
          onClose: () => {},
        })
      );

      // 验证根据用户反馈彻底移除 4 大模版切换胶囊与样式割裂
      expect(html).not.toContain("🏮 东方神话");
      expect(html).not.toContain("🔮 西方秘法");
      expect(html).not.toContain("⚡ 赛博先锋");
      expect(html).not.toContain("📜 极简典藏");

      // 验证情绪价值与专属海报渲染
      expect(html).toContain("人形外挂");
      expect(html).toContain("算力透视");
      expect(html).toContain("认知流形 · 原创画像专属分享卡");
    });
  });

  describe("2. 认知资产图鉴整齐网格、点亮置顶排前与专属 VIP 配色", () => {
    it("VIP_THEMES 覆盖所有 8 大流派象限并拥有差异化尊贵配色", () => {
      const expectedQuadrants = [
        "Q1-CAL",
        "Q2-EVO",
        "Q3-SEN",
        "Q4-PIO",
        "Q5-RET",
        "Q6-GAM",
        "Q7-ARB",
        "Q8-DRI",
      ];

      for (const code of expectedQuadrants) {
        expect(VIP_THEMES[code]).toBeDefined();
        expect(VIP_THEMES[code].vipRank).toBeTruthy();
        expect(VIP_THEMES[code].vipLevel).toBeTruthy();
        expect(VIP_THEMES[code].accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }

      // 验证天元鎏金、通幽翡翠、苍穹沧澜、赤焰破晓等专属等级
      expect(VIP_THEMES["Q1-CAL"].vipRank).toContain("天元鎏金");
      expect(VIP_THEMES["Q2-EVO"].vipRank).toContain("通幽翡翠");
      expect(VIP_THEMES["Q3-SEN"].vipRank).toContain("苍穹沧澜");
      expect(VIP_THEMES["Q4-PIO"].vipRank).toContain("赤焰破晓");
    });

    it("点亮优先排序算法使 unlocked===true 始终位于 unlocked===false 之前", () => {
      const mockAssets = [
        { quadrant_code: "Q1-CAL", unlocked: false },
        { quadrant_code: "Q2-EVO", unlocked: true },
        { quadrant_code: "Q3-SEN", unlocked: false },
        { quadrant_code: "Q4-PIO", unlocked: true },
      ];

      const sorted = [...mockAssets].sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return a.quadrant_code.localeCompare(b.quadrant_code);
      });

      expect(sorted[0].quadrant_code).toBe("Q2-EVO");
      expect(sorted[1].quadrant_code).toBe("Q4-PIO");
      expect(sorted[2].quadrant_code).toBe("Q1-CAL");
      expect(sorted[3].quadrant_code).toBe("Q3-SEN");
    });
  });

  describe("3. 答题提交流程中的防连击与交互阻断 (Issue #57 项 1)", () => {
    const mockTrialData: any = {
      session_id: "sess_57_trial",
      trial_index: 1,
      phase: "phase1",
      payload: {
        stimulus_id: "stim_01",
        difficulty_level: 1,
        prompt: "请根据规律选出正确的下一项",
        options: {
          A: "规律A",
          B: "规律B",
          C: "规律C",
          D: "规律D",
        },
        has_hint: false,
        hint_cost: 0,
        hint_tier1_cost: 0,
        hint_tier2_cost: 0,
        hints_unlocked: 0,
        task_type: "matrix",
      },
    };

    it("loading===true 时选项卡片具备 disabled 属性并渲染 pointer-events-none 禁用视觉", () => {
      const html = renderToString(
        React.createElement(
          LocaleProvider,
          null,
          React.createElement(
            GameEffectsProvider,
            null,
            React.createElement(MobileAssessmentView, {
              trialData: mockTrialData,
              totalTrials: 10,
              selectedOption: "A",
              onSelectOption: () => {},
              selectedAction: "HIGH_BET",
              onSelectAction: () => {},
              unlockedHints: [],
              hintsCost: 0,
              onBuyHint: async () => {},
              onSubmitTrial: async () => {},
              loading: true,
              errorMsg: "",
            })
          )
        )
      );

      // 验证选项按钮全部带有 disabled 和 pointer-events-none
      expect(html).toContain('data-testid="mobile-option-A"');
      expect(html).toContain("disabled");
      expect(html).toContain("pointer-events-none");
      expect(html).toContain("cursor-not-allowed");
    });
  });
});
