import { describe, expect, it } from "bun:test";
import { CognitiveArchetype } from "../src/backend/models";
import {
  MYTHIC_ARCHETYPES,
  getMythicArchetype,
  BAGUA_TRIGRAMS,
  type MythicArchetypeConfig,
} from "../src/frontend/components/share/mythicArchetypes";

describe("Chinese Oriental Mythic Share Poster: Archetype & Bagua Matrix", () => {
  it("所有 8 大认知画像均具备专属东方神话图腾与八卦易经哲学配置 (MECE 覆盖)", () => {
    const requiredArchetypes = [
      CognitiveArchetype.SOVEREIGN,
      CognitiveArchetype.ADAPTIVE_LEARNER,
      CognitiveArchetype.VIGILANT_SENTINEL,
      CognitiveArchetype.AUDACIOUS_PIONEER,
      CognitiveArchetype.ANXIOUS_RETREATER,
      CognitiveArchetype.BLIND_GAMBLER,
      CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
      CognitiveArchetype.STOCHASTIC_DRIFTER,
    ];

    expect(Object.keys(MYTHIC_ARCHETYPES).length).toBe(8);

    for (const arch of requiredArchetypes) {
      const config = MYTHIC_ARCHETYPES[arch];
      expect(config).toBeDefined();
      expect(config.archetype).toBe(arch);
      expect(config.quadrantCode).toMatch(/^Q[1-8]-[A-Z]{3}$/);
      expect(config.roleTitle.length).toBeGreaterThan(0);
      expect(config.baguaName.length).toBeGreaterThan(0);
      expect(config.baguaSymbol.length).toBeGreaterThan(0);
      expect(config.mythicTotem.length).toBeGreaterThan(0);
      expect(config.totemTitle.length).toBeGreaterThan(0);
      expect(config.hexagramAphorism.length).toBeGreaterThan(0);
      expect(config.sealText.length).toBe(4); // 四字吉语或朱印
      expect(config.colorScheme.primaryGold).toMatch(/^#/);
      expect(config.colorScheme.accentColor).toMatch(/^#/);
      expect(config.colorScheme.bgRadialInner).toMatch(/^#/);
      expect(config.colorScheme.bgRadialOuter).toMatch(/^#/);
      expect(config.trigramLines.length).toBe(3);
      expect(config.totemSvgPath.length).toBeGreaterThan(10);
    }
  });

  it("八卦卦象完全覆盖周易先/后天八卦八宫 (乾、坤、震、巽、坎、离、艮、兑)，且无重复无遗漏", () => {
    const baguaNames = Object.values(MYTHIC_ARCHETYPES).map((c) => c.baguaName);
    const expectedBagua = ["乾", "坤", "震", "巽", "坎", "离", "艮", "兑"];

    expect(baguaNames.sort()).toEqual(expectedBagua.sort());

    const symbols = Object.values(MYTHIC_ARCHETYPES).map((c) => c.baguaSymbol);
    const expectedSymbols = ["☰", "☷", "☳", "☴", "☵", "☲", "☶", "☱"];
    expect(symbols.sort()).toEqual(expectedSymbols.sort());
  });

  it("8 大神兽图腾各具独特神性寓意且三爻结构符合标准阴阳卦序", () => {
    // 乾: 三阳爻 [true, true, true]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.SOVEREIGN].trigramLines).toEqual([true, true, true]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.SOVEREIGN].baguaSymbol).toBe("☰");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.SOVEREIGN].mythicTotem).toContain("龙");

    // 坤: 三阴爻 [false, false, false]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.STOCHASTIC_DRIFTER].trigramLines).toEqual([false, false, false]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.STOCHASTIC_DRIFTER].baguaSymbol).toBe("☷");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.STOCHASTIC_DRIFTER].mythicTotem).toContain("鲲鹏");

    // 坎: 阳在其中 [false, true, false]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.VIGILANT_SENTINEL].trigramLines).toEqual([false, true, false]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.VIGILANT_SENTINEL].baguaSymbol).toBe("☵");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.VIGILANT_SENTINEL].mythicTotem).toContain("玄武");

    // 离: 阴在其中 [true, false, true]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.PRAGMATIC_ARBITRAGEUR].trigramLines).toEqual([true, false, true]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.PRAGMATIC_ARBITRAGEUR].baguaSymbol).toBe("☲");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.PRAGMATIC_ARBITRAGEUR].mythicTotem).toMatch(/朱雀|白泽/);

    // 震: 初阳 [true, false, false]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.AUDACIOUS_PIONEER].trigramLines).toEqual([true, false, false]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.AUDACIOUS_PIONEER].baguaSymbol).toBe("☳");

    // 巽: 初阴 [false, true, true]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ADAPTIVE_LEARNER].trigramLines).toEqual([false, true, true]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ADAPTIVE_LEARNER].baguaSymbol).toBe("☴");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ADAPTIVE_LEARNER].mythicTotem).toContain("鸾");

    // 艮: 上阳 [false, false, true]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ANXIOUS_RETREATER].trigramLines).toEqual([false, false, true]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ANXIOUS_RETREATER].baguaSymbol).toBe("☶");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.ANXIOUS_RETREATER].mythicTotem).toContain("鹿");

    // 兑: 上阴 [true, true, false]
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.BLIND_GAMBLER].trigramLines).toEqual([true, true, false]);
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.BLIND_GAMBLER].baguaSymbol).toBe("☱");
    expect(MYTHIC_ARCHETYPES[CognitiveArchetype.BLIND_GAMBLER].mythicTotem).toContain("虎");
  });

  it("getMythicArchetype 支持枚举、QuadrantCode 字符串以及未知兜底", () => {
    // 枚举传参
    const q1 = getMythicArchetype(CognitiveArchetype.SOVEREIGN);
    expect(q1.roleTitle).toBe("人形外挂");

    // 象限代码传参
    const q7 = getMythicArchetype("Q7-ARB");
    expect(q7.roleTitle).toBe("诸葛在世");
    expect(q7.baguaName).toBe("离");

    // 称号或模糊传参
    const q4 = getMythicArchetype("飞龙在天");
    expect(q4.roleTitle).toBe("飞龙在天");
    expect(q4.baguaName).toBe("震");

    // 未知兜底返回 Q1-CAL 尊崇外挂
    const fallback = getMythicArchetype("UNKNOWN_NONEXISTENT");
    expect(fallback).toBeDefined();
    expect(fallback.archetype).toBe(CognitiveArchetype.SOVEREIGN);
  });
});
