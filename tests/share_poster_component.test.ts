import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChineseMythicPoster } from "../src/frontend/components/share/ChineseMythicPoster";
import { WesternArcanePoster } from "../src/frontend/components/share/WesternArcanePoster";
import { PosterModal } from "../src/frontend/components/share/PosterModal";
import { CognitiveArchetype } from "../src/backend/models";

describe("Unified Share Suite: Component Rendering & Data Sanitization", () => {
  const sampleReport: any = {
    session_id: "sess_test_12345",
    subject_name: "伏羲042",
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

  it("Issue #25: 敏感数据彻底隐藏、去卦象化、用户真实昵称与 4 项原创正向认知特技置换", () => {
    const html = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: sampleReport,
        entryUrl: "http://localhost:8000/",
      })
    );

    // 1. 核心流派与称号
    expect(html).toContain("人形外挂");
    expect(html).toContain("你开了 · 诗人握持");

    // 2. 敏感数据净化：严禁泄露内部象限代码与 4D 原始数学指标
    expect(html).not.toContain("Q1-CAL");
    expect(html).not.toContain("2.45"); // d'
    expect(html).not.toContain("2.15"); // Meta-d'
    expect(html).not.toContain("0.88"); // M_ratio
    expect(html).not.toContain("-0.05"); // Bias
    expect(html).not.toContain("一元辨别力");
    expect(html).not.toContain("二元觉察力");
    expect(html).not.toContain("二元自洽率");
    expect(html).not.toContain("校准偏置");

    // 3. 结构去卦象化：彻底剥离周易八卦符号、三爻线与易经卦辞
    expect(html).not.toContain("☰");
    expect(html).not.toContain("☷");
    expect(html).not.toContain("乾为天");
    expect(html).not.toContain("坎为水");
    expect(html).not.toContain("乃统天");
    expect(html).not.toContain("周易 · 象辞");

    // 4. 头像框下方长条徽带展示用户真实昵称 (彻底移除写死的“探索者 · ”前缀)
    expect(html).toContain("伏羲042");
    expect(html).not.toContain("探索者 · 伏羲042");

    // 5. 原 4 个指标数据块区域替换为展示 4 项原创正向专属认知特技 (图标 + 名称 + 描述)
    expect(html).toContain("算力透视");
    expect(html).toContain("精准制导");
    expect(html).toContain("知行律动");
    expect(html).toContain("核心战略指挥官");
    expect(html).toContain("被动特技");
    expect(html).toContain("核心特技");
    expect(html).toContain("觉醒绝技");
    expect(html).toContain("战场羁绊");

    // 6. 严禁出现英文括号后缀 (去英文杂质)
    expect(html).not.toContain("Mental Aimbot");
    expect(html).not.toContain("Precision Lock");
    expect(html).not.toContain("Sovereign Execution");

    // 7. 专属标签与朱砂吉印
    expect(html).toContain("#高维逻辑底蕴");
    expect(html).toContain("#算力降维压制");
    expect(html).toContain("天元");
    expect(html).toContain("统御");

    // 8. 原创正向赋能描述与去“东方”开头
    expect(html).toContain("认知心智 · 赋能启示");
    expect(html).toContain("您展现出令人叹为观止的‘人形外挂’级顶尖素养");
    expect(html).toContain("认知流形 · 心智图谱");
    expect(html).not.toContain("东方认知流形");

    // 9. 一键操作按钮
    expect(html).toContain("下载高清海报 (PNG)");
    expect(html).toContain("复制海报到剪贴板");
    expect(html).toContain("复制分享文案");
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
      expect(html).toContain("data-share-poster=\"chinese-mythic\"");
      // 均无敏感数据泄露
      expect(html).not.toMatch(/Q[1-8]-[A-Z]{3}/);
      expect(html).not.toContain("d'");
      expect(html).not.toContain("Meta-d'");
      expect(html).not.toContain("☰");
    }
  });

  it("Issue #27: WesternArcanePoster 专为英文定制西方秘法秩序与纯英文专属特技", () => {
    const customReport = {
      ...sampleReport,
      subject_name: "Arthur042",
      diagnostic_profile: {
        ...sampleReport.diagnostic_profile,
        archetype: CognitiveArchetype.SOVEREIGN,
        role_title: "The Grand Archmage",
        praise_tagline: "Sight Beyond the Veil · Unerring Decree",
      },
    };

    const html = renderToString(
      React.createElement(WesternArcanePoster, {
        report: customReport,
        entryUrl: "http://localhost:8000/",
      })
    );

    expect(html).toContain("The Grand Archmage");
    expect(html).toContain("Sight Beyond the Veil · Unerring Decree");
    expect(html).toContain("Arthur042");
    expect(html).not.toContain("Explorer · Arthur042");

    // 4 项纯正英文秘法特技
    expect(html).toContain("Eye of Aether");
    expect(html).toContain("Precision Incantation");
    expect(html).toContain("Arcane Coherence");
    expect(html).toContain("Grand Strategist Bond");
    expect(html).toContain("Passive Trait");
    expect(html).toContain("Core Aptitude");
    expect(html).toContain("Awakened Mastery");
    expect(html).toContain("Battle Synergy");

    // 秘法印章与纯英文标签
    expect(html).toContain("AETHER SIGHT");
    expect(html).toContain("#OmniscientInsight");
    expect(html).toContain("Download HD Poster (PNG)");
    expect(html).toContain("Copy Poster to Clipboard");
    expect(html).toContain("Copy Share Text");

    // 绝无中文遗留、敏感指标与“WESTERN”开头
    expect(html).not.toContain("人形外挂");
    expect(html).not.toContain("Q1-CAL");
    expect(html).not.toContain("2.45");
    expect(html).toContain("ARCANE ORDER · COGNITIVE SPECTRUM");
    expect(html).not.toContain("WESTERN ARCANE ORDER");
  });

  it("Issue #27: PosterModal 单入口多语言自适应分流，且分享卡文本绝对不以‘东方’‘西方’开头", () => {
    // 1. 中文状态分流至神话画像分享卡
    const modalHtmlZh = renderToString(
      React.createElement(PosterModal, {
        isOpen: true,
        report: sampleReport,
        locale: "zh-CN",
        onClose: () => {},
      })
    );

    expect(modalHtmlZh).toContain("认知流形 · 原创画像专属分享卡");
    expect(modalHtmlZh).not.toContain("东方认知流形");
    expect(modalHtmlZh).toContain("data-share-poster=\"chinese-mythic\"");
    expect(modalHtmlZh).toContain("人形外挂");
    expect(modalHtmlZh).toContain("算力透视");

    // 2. 英文状态自适应分流至秘法秩序分享卡
    const modalHtmlEn = renderToString(
      React.createElement(PosterModal, {
        isOpen: true,
        report: {
          ...sampleReport,
          subject_name: "Arthur042",
        },
        locale: "en-US",
        onClose: () => {},
      })
    );

    expect(modalHtmlEn).toContain("Arcane Order · Cognitive Archetype Seal");
    expect(modalHtmlEn).not.toContain("Western Arcane Order");
    expect(modalHtmlEn).toContain("data-share-poster=\"western-arcane\"");
    expect(modalHtmlEn).toContain("The Grand Archmage");
    expect(modalHtmlEn).toContain("Eye of Aether");
  });

  it("Issue #39: 移除‘探索者 · ’硬编码前缀并渲染真实用户头像与优雅降级", () => {
    // 1. 当携带 avatar_url 时，海报视图渲染具备圆形裁切与边框光效的真实头像 <img>
    const reportWithAvatar = {
      ...sampleReport,
      subject_name: "女娲999",
      avatar_url: "https://example.com/avatar_nuwa.png",
    };

    const htmlWithAvatar = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: reportWithAvatar,
      })
    );

    // 验证昵称直接展示且绝无“探索者 · ”前缀
    expect(htmlWithAvatar).toContain("女娲999");
    expect(htmlWithAvatar).not.toContain("探索者 · 女娲999");
    // 验证头像图片元素、跨域属性与圆形裁切徽章
    expect(htmlWithAvatar).toContain('src="https://example.com/avatar_nuwa.png"');
    expect(htmlWithAvatar).toContain('crossorigin="anonymous"');
    expect(htmlWithAvatar).toContain('data-avatar-badge="true"');

    // 2. 支持通过 props.avatar_url 单独传入
    const htmlWithPropAvatar = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: sampleReport,
        avatar_url: "https://example.com/prop_avatar.png",
      })
    );
    expect(htmlWithPropAvatar).toContain('src="https://example.com/prop_avatar.png"');

    // 3. 当无 avatar_url 时，优雅降级为图腾或用户首字母
    const reportWithoutAvatar = {
      ...sampleReport,
      subject_name: "伏羲042",
      avatar_url: undefined,
    };

    const htmlWithoutAvatar = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: reportWithoutAvatar,
      })
    );
    expect(htmlWithoutAvatar).toContain("伏羲042");
    expect(htmlWithoutAvatar).not.toContain("探索者 · 伏羲042");
    expect(htmlWithoutAvatar).not.toContain('src="https://example.com/avatar_nuwa.png"');
    expect(htmlWithoutAvatar).toContain('data-avatar-badge="true"');

    // 4. 当未提供 subject_name 时，优雅回退至“探索者”默认值且无多余前缀
    const reportNoName = {
      ...sampleReport,
      subject_name: undefined,
    };
    const htmlNoName = renderToString(
      React.createElement(ChineseMythicPoster, {
        report: reportNoName,
      })
    );
    expect(htmlNoName).toContain("探索者");
    expect(htmlNoName).not.toContain("探索者 · 探索者");
  });
});
