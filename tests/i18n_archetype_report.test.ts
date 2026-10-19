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
    const session = mgr.createSession({ subjectType: "HUMAN", subjectName: "Alpha Tester" });

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
});
