import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChineseMythicPoster } from "../src/frontend/components/share/ChineseMythicPoster";
import { PosterModal } from "../src/frontend/components/share/PosterModal";
import { CognitiveArchetype } from "../src/backend/models";

describe("Chinese Oriental Mythic Share Poster: Component Rendering", () => {
  const sampleReport: any = {
    session_id: "sess_test_12345",
    subject_name: "探索者·伏羲042",
    metacognitive_metrics: {
      d_prime: 2.45,
      meta_d_prime: 2.15,
      m_ratio: 0.88,
      calibration_bias: -0.05,
      d_star: 0.82,
      info_buying_efficiency: 0.74,
      cognitive_manifold_vector: [0.82, 0.88, -0.05, 0.74],
    },
    diagnostic_profile: {
      archetype: CognitiveArchetype.SOVEREIGN,
      quadrant_code: "Q1-CAL",
      role_title: "人形外挂",
      praise_tagline: "你开了 · 诗人握持",
      strength_tags: ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"],
      empowering_feedback: "您展现出令人叹为观止的‘人形外挂’级顶尖素养！",
      growth_advice: "具备全维度的战略全局观与决策定力。",
      skills: [],
      clinical_summary: "高一元·高二元·知行自洽。",
    },
  };

  it("ChineseMythicPoster 成功渲染 4D 指标、心理流派称号、八卦卦象与东方印章", () => {
    const html = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: sampleReport,
        entryUrl: "http://localhost:8000/",
      })
    );

    // 核心流派与称号
    expect(html).toContain("人形外挂");
    expect(html).toContain("Q1-CAL");
    expect(html).toContain("你开了 · 诗人握持");
    expect(html).toContain("探索者·伏羲042");

    // 八卦符号与图腾
    expect(html).toContain("☰");
    expect(html).toContain("乾");
    expect(html).toContain("应龙");

    // 4D 认知流形指标
    expect(html).toContain("2.45"); // d'
    expect(html).toContain("2.15"); // Meta-d'
    expect(html).toContain("0.88"); // M_ratio
    expect(html).toContain("-0.05"); // Bias

    // 专属标签
    expect(html).toContain("#高维逻辑底蕴");
    expect(html).toContain("#算力降维压制");

    // 易经卦辞箴言
    expect(html).toContain("乃统天");

    // 操作按钮
    expect(html).toContain("下载高清海报");
    expect(html).toContain("复制海报到剪贴板");
  });

  it("ChineseMythicPoster 能无缝支持全部 8 大认知画像的独立宣发渲染", () => {
    const archetypes = [
      CognitiveArchetype.SOVEREIGN,
      CognitiveArchetype.ADAPTIVE_LEARNER,
      CognitiveArchetype.VIGILANT_SENTINEL,
      CognitiveArchetype.AUDACIOUS_PIONEER,
      CognitiveArchetype.ANXIOUS_RETREATER,
      CognitiveArchetype.BLIND_GAMBLER,
      CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
      CognitiveArchetype.STOCHASTIC_DRIFTER,
    ];

    for (const arch of archetypes) {
      const customReport = {
        ...sampleReport,
        diagnostic_profile: {
          ...sampleReport.diagnostic_profile,
          archetype: arch,
          role_title: arch,
        },
      };

      const html = renderToString(
        React.createElement(ChineseMythicPoster, {
          report: customReport,
          entryUrl: "http://localhost:8000/",
        })
      );

      expect(html.length).toBeGreaterThan(500);
      expect(html).toContain("data-share-poster");
    }
  });

  it("PosterModal 包含完整弹窗封装与关闭机制", () => {
    const modalHtml = renderToString(
      React.createElement(PosterModal, {
        isOpen: true,
        report: sampleReport,
        onClose: () => {},
      })
    );

    expect(modalHtml).toContain("东方认知流形");
    expect(modalHtml).toContain("人形外挂");
    expect(modalHtml).toContain("关闭");
  });
});
