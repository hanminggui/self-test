import { describe, expect, it } from "bun:test";
import { CognitiveArchetype, RiskAttitude } from "../src/backend/models";
import { getArchetypeDefinition } from "../src/backend/archetype_matrix";
import { generateSubjectCodename } from "../src/backend/codename_generator";
import { ReportGenerator } from "../src/backend/report_generator";
import { SessionManager } from "../src/backend/session_manager";
import { runWithLocale } from "../src/i18n";

describe("Seam 3: Western Arcane Archetypes, Codenames & Dynamic Report Localization", () => {
  it("getArchetypeDefinition 严格映射全部 8 大流派的中英文称号、标语与技能", () => {
    const expectedTitles = {
      [CognitiveArchetype.SOVEREIGN]: {
        zh: "人形外挂",
        en: "The Grand Archmage",
        taglineEn: "Sight Beyond the Veil · Unerring Decree",
      },
      [CognitiveArchetype.ADAPTIVE_LEARNER]: {
        zh: "灵窍天开",
        en: "The Mystic Alchemist",
        taglineEn: "The Philosopher's Mirror · Transmuting Doubt into Gold",
      },
      [CognitiveArchetype.VIGILANT_SENTINEL]: {
        zh: "定海神针",
        en: "The Aegis Paladin",
        taglineEn: "Unbreakable Bastion · Shield of the Realm",
      },
      [CognitiveArchetype.AUDACIOUS_PIONEER]: {
        zh: "飞龙在天",
        en: "The Solar Conqueror",
        taglineEn: "Crowned in Fire · Fortune Favors the Bold",
      },
      [CognitiveArchetype.ANXIOUS_RETREATER]: {
        zh: "大音希声",
        en: "The Veiled Oracle",
        taglineEn: "Lantern in the Mist · Untouched by Chaos",
      },
      [CognitiveArchetype.BLIND_GAMBLER]: {
        zh: "无畏先锋",
        en: "The Stormborne Maverick",
        taglineEn: "All In Against Fate · Forged in Reckless Glory",
      },
      [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
        zh: "诸葛在世",
        en: "The Fate Weaver",
        taglineEn: "Master of Whispers · Tipping the Scales of Destiny",
      },
      [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
        zh: "暮光星灵",
        en: "The Astral Wanderer",
        taglineEn: "Unbound by Mortal Laws · Dancing on Starlight",
      },
    };

    for (const [archetypeKey, expected] of Object.entries(expectedTitles)) {
      const arch = archetypeKey as CognitiveArchetype;

      // 1. 中文定义
      const defZH = getArchetypeDefinition(arch, "zh-CN");
      expect(defZH.role_title).toBe(expected.zh);
      expect(defZH.skills[0].type).toMatch(/技能|特技|绝技|羁绊/);
      expect(defZH.skills.length).toBe(4);
      for (const sk of defZH.skills) {
        expect(sk.name).not.toMatch(/[a-zA-Z]/);
        expect(sk.name).not.toMatch(/[()（）]/);
      }

      // 2. 英文定义
      const defEN = getArchetypeDefinition(arch, "en-US");
      expect(defEN.role_title).toBe(expected.en);
      expect(defEN.praise_tagline).toBe(expected.taglineEn);
      expect(defEN.skills[0].type).toMatch(/Trait|Aptitude|Mastery|Synergy/);
      expect(defEN.strength_tags.length).toBeGreaterThan(0);
      expect(defEN.growth_advice.length).toBeGreaterThan(10);
      expect(defEN.clinical_summary.length).toBeGreaterThan(10);

      // 3. 动态通过 runWithLocale 上下文获取
      const defContextEN = runWithLocale("en-US", () => getArchetypeDefinition(arch));
      expect(defContextEN.role_title).toBe(expected.en);
    }
  });

  it("generateSubjectCodename 双语代号生成器符合命名规范", () => {
    // 中文：星轨领航员 · 07
    for (let i = 0; i < 20; i++) {
      const codenameZH = generateSubjectCodename("zh-CN");
      expect(codenameZH).toMatch(/^[\u4e00-\u9fa5]+ · \d{2}$/);
    }

    // 英文：Obsidian Alchemist · 07
    for (let i = 0; i < 20; i++) {
      const codenameEN = generateSubjectCodename("en-US");
      expect(codenameEN).toMatch(/^[A-Za-z]+ [A-Za-z]+ · \d{2}$/);
    }

    // 上下文推断测试
    runWithLocale("en-US", () => {
      const codename = generateSubjectCodename();
      expect(codename).toMatch(/^[A-Za-z]+ [A-Za-z]+ · \d{2}$/);
    });
  });

  it("ReportGenerator 诊断弱点与完整报告输出正确的本地化文本", () => {
    const dummyMetrics = {
      d_prime: 2.5,
      meta_d_prime: 2.2,
      m_ratio: 0.88,
      calibration_bias: 0.02,
      brier_score: 0.12,
      d_star: 0.95,
      info_buying_efficiency: 0.85,
      cognitive_manifold_vector: [0.95, 0.88, 0.02, 0.85] as [number, number, number, number],
    };

    const dummyRecords: any[] = [
      {
        trial_index: 1,
        is_warmup: false,
        is_correct_first_order: true,
        action: "HIGH_BET",
        confidence_level: 0.9,
        hint_purchased: false,
      },
    ];

    // zh-CN 报告
    const reportZH = ReportGenerator.generateReport(
      "sess-1",
      "HUMAN",
      dummyRecords,
      dummyMetrics,
      100,
      2,
      "测试者",
      "zh-CN"
    );
    expect(reportZH.diagnostic_profile.role_title).toBe("人形外挂");
    expect(reportZH.diagnostic_profile.critical_weakness).toContain("知行合一");

    // en-US 报告
    const reportEN = ReportGenerator.generateReport(
      "sess-1",
      "HUMAN",
      dummyRecords,
      dummyMetrics,
      100,
      2,
      "Tester",
      "en-US"
    );
    expect(reportEN.diagnostic_profile.role_title).toBe("The Grand Archmage");
    expect(reportEN.diagnostic_profile.critical_weakness).toContain("Omniscient Mastery");
    expect(reportEN.diagnostic_profile.clinical_summary).toContain("High first-order");
  });

  it("SessionManager.getReport 与 getCohortScatterData 在无论存储语言为何时，均支持动态请求语言呈现", () => {
    const mgr = new SessionManager(":memory:");
    const session = mgr.createSession({ subjectType: "HUMAN", subjectName: "Alpha Tester", initialDelta: 0.30 });

    const sessionId = session.sessionId;
    // 完成一个简单试次并结束 session
    const correctOpt = session.currentTask!.correct_option;
    mgr.processStep({
      session_id: sessionId,
      trial_index: 1,
      phase_1_response: { selected_option: correctOpt },
      phase_2_metacognitive_action: {
        action: "HIGH_BET" as any,
        confidence_level: 0.95,
      },
    });

    // 结束 Session 并在 DB 中生成记录
    const finalReport = mgr.finalizeReport(session);
    expect(finalReport).toBeDefined();

    // 1. 请求 en-US 报告
    const reportEN = mgr.getReport(sessionId, "en-US");
    expect(reportEN.diagnostic_profile.role_title).toBe("The Solar Conqueror");
    expect(reportEN.diagnostic_profile.skills[0].type).toMatch(/Trait|Aptitude|Mastery|Synergy/);

    // 2. 请求 zh-CN 报告
    const reportZH = mgr.getReport(sessionId, "zh-CN");
    expect(reportZH.diagnostic_profile.role_title).toBe("飞龙在天");
    expect(reportZH.diagnostic_profile.skills[0].type).toMatch(/技能|特技|绝技|羁绊/);

    // 3. 散点图列表获取支持 en-US
    const cohortEN = mgr.getCohortScatterData(sessionId, "en-US");
    expect(cohortEN.subjects.length).toBeGreaterThan(0);
    const subject = cohortEN.subjects.find((s) => s.id === sessionId);
    expect(subject).toBeDefined();
    expect(subject!.role_title).toBe("The Solar Conqueror");
  });

  it("getArchetypeDefinition 支持 QuadrantCode 和中英称号解析并支持动态语言切换", () => {
    // 象限代码解析
    const defFromQuadZH = getArchetypeDefinition("Q1-CAL", "zh-CN");
    expect(defFromQuadZH.role_title).toBe("人形外挂");
    expect(defFromQuadZH.skills[0].name).toBe("算力透视");

    const defFromQuadEN = getArchetypeDefinition("Q1-CAL", "en-US");
    expect(defFromQuadEN.role_title).toBe("The Grand Archmage");

    // 称号解析
    const defFromTitle = getArchetypeDefinition("人形外挂", "en-US");
    expect(defFromTitle.role_title).toBe("The Grand Archmage");

    const defFromEnTitle = getArchetypeDefinition("The Solar Conqueror", "zh-CN");
    expect(defFromEnTitle.role_title).toBe("飞龙在天");
  });

  it("客户端名片结果页动态本地化映射：无需重新答题，报告卡片全字段即时响应语言切换", () => {
    // 模拟服务端生成的一份初始中文报告
    const mockReportZH = {
      session_id: "sess-test-dyn",
      subject_name: "探索者 · 01",
      diagnostic_profile: {
        archetype: "SOVEREIGN",
        quadrant_code: "Q1-CAL",
        role_title: "人形外挂",
        praise_tagline: "你开了 · 诗人握持",
        strength_tags: ["高维逻辑底蕴", "算力降维压制"],
        empowering_feedback: "您展现出令人叹为观止的‘人形外挂’级顶尖素养！",
        growth_advice: "具备全维度的战略全局观与决策定力",
        skills: [
          { icon: "👁️", type: "被动特技", name: "算力透视", desc: "面临复杂抽象推演..." },
          { icon: "🎯", type: "核心特技", name: "精准制导", desc: "对自我的决断状态..." },
          { icon: "⚡", type: "觉醒绝技", name: "知行律动", desc: "决策博弈与客观规律..." },
          { icon: "🌟", type: "战场羁绊", name: "核心战略指挥官", desc: "颠覆性架构攻坚..." },
        ],
      },
    };

    // 切换到 en-US 时进行动态本地化映射
    const defEN = getArchetypeDefinition(mockReportZH.diagnostic_profile.archetype, "en-US");
    expect(defEN.role_title).toBe("The Grand Archmage");
    expect(defEN.praise_tagline).toBe("Sight Beyond the Veil · Unerring Decree");
    expect(defEN.growth_advice).toContain("high-complexity");
    expect(defEN.empowering_feedback).toContain("Grand Archmage");
    expect(defEN.skills[0].name).toContain("Eye of Aether");
    expect(defEN.skills[0].type).toBe("Passive Trait");

    // 切换回 zh-CN 时
    const defZH = getArchetypeDefinition(mockReportZH.diagnostic_profile.archetype, "zh-CN");
    expect(defZH.role_title).toBe("人形外挂");
    expect(defZH.praise_tagline).toBe("你开了 · 诗人握持");
    expect(defZH.skills[0].name).toBe("算力透视");
    expect(defZH.skills[0].name).not.toMatch(/[a-zA-Z()（）]/);
  });
});
