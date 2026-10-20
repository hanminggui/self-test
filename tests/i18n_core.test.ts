import { describe, expect, it } from "bun:test";
import {
  DEFAULT_LOCALE,
  formatMessage,
  getLocale,
  normalizeLocale,
  runWithLocale,
  setGlobalLocale,
  type SupportedLocale,
  t,
} from "../src/i18n";

describe("Seam 1: Isomorphic i18n Core", () => {
  it("normalizeLocale 正确归一化各种语言字符串并回退", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("fr-FR")).toBe(DEFAULT_LOCALE);
  });

  it("默认语言为 zh-CN，支持客户端/全局 setGlobalLocale", () => {
    setGlobalLocale("zh-CN");
    expect(getLocale()).toBe("zh-CN");
    const dictZh = t();
    expect(dictZh.common.confirm).toBeDefined();

    setGlobalLocale("en-US");
    expect(getLocale()).toBe("en-US");
    const dictEn = t();
    expect(dictEn.common.confirm).toBeDefined();
    expect(dictEn.common.confirm).not.toBe(dictZh.common.confirm);

    // 重置回默认
    setGlobalLocale("zh-CN");
    expect(getLocale()).toBe("zh-CN");
  });

  it("runWithLocale 在服务端异步上下文中实现请求级隔离且支持嵌套与并发", async () => {
    setGlobalLocale("zh-CN");

    const result = await runWithLocale("en-US", async () => {
      expect(getLocale()).toBe("en-US");
      expect(t().common.cancel).toBe("Cancel");

      // 嵌套调用
      const inner = runWithLocale("zh-CN", () => {
        expect(getLocale()).toBe("zh-CN");
        return t().common.cancel;
      });

      expect(inner).toBe("取消");
      expect(getLocale()).toBe("en-US");
      return "done";
    });

    expect(result).toBe("done");
    // 退出后恢复外层
    expect(getLocale()).toBe("zh-CN");
  });

  it("formatMessage 支持插值替换", () => {
    expect(formatMessage("Hello, {name}!", { name: "Alice" })).toBe("Hello, Alice!");
    expect(formatMessage("Trial {current} / {total}", { current: 5, total: 30 })).toBe("Trial 5 / 30");
  });

  it("中英双语字典结构完备对齐且英文字典满足西方中世纪秘法画像", () => {
    const zh = t("zh-CN");
    const en = t("en-US");

    // 检查 archetypes 8个角色全覆盖
    const archetypes = [
      "SOVEREIGN",
      "ADAPTIVE_LEARNER",
      "VIGILANT_SENTINEL",
      "AUDACIOUS_PIONEER",
      "ANXIOUS_RETREATER",
      "BLIND_GAMBLER",
      "PRAGMATIC_ARBITRAGEUR",
      "STOCHASTIC_DRIFTER",
    ] as const;

    for (const key of archetypes) {
      expect(zh.archetypes[key]).toBeDefined();
      expect(en.archetypes[key]).toBeDefined();
      expect(zh.archetypes[key].role_title).toBeDefined();
      expect(en.archetypes[key].role_title).toBeDefined();
      expect(en.archetypes[key].praise_tagline).toBeDefined();
    }

    // Spec §4 明确要求的 Western Arcane Lore 校验
    expect(en.archetypes.SOVEREIGN.role_title).toBe("The Grand Archmage");
    expect(en.archetypes.ADAPTIVE_LEARNER.role_title).toBe("The Mystic Alchemist");
    expect(en.archetypes.VIGILANT_SENTINEL.role_title).toBe("The Aegis Paladin");
    expect(en.archetypes.AUDACIOUS_PIONEER.role_title).toBe("The Solar Conqueror");
    expect(en.archetypes.ANXIOUS_RETREATER.role_title).toBe("The Veiled Oracle");
    expect(en.archetypes.BLIND_GAMBLER.role_title).toBe("The Stormborne Maverick");
    expect(en.archetypes.PRAGMATIC_ARBITRAGEUR.role_title).toBe("The Fate Weaver");
    expect(en.archetypes.STOCHASTIC_DRIFTER.role_title).toBe("The Astral Wanderer");
  });

  it("所有 8 大流派的中文技能名全部完成去英净化，严禁包含任何英文字母或括号", () => {
    const zh = t("zh-CN");
    const archetypes = [
      "SOVEREIGN",
      "ADAPTIVE_LEARNER",
      "VIGILANT_SENTINEL",
      "AUDACIOUS_PIONEER",
      "ANXIOUS_RETREATER",
      "BLIND_GAMBLER",
      "PRAGMATIC_ARBITRAGEUR",
      "STOCHASTIC_DRIFTER",
    ] as const;

    for (const key of archetypes) {
      const arch = zh.archetypes[key];
      expect(arch.skills.length).toBe(4);
      for (const skill of arch.skills) {
        // 技能名严禁含有英文字母
        expect(skill.name).not.toMatch(/[a-zA-Z]/);
        // 技能名严禁含有半角或全角括号
        expect(skill.name).not.toMatch(/[()（）]/);
        // 技能名长度大于 1 且不为空
        expect(skill.name.trim().length).toBeGreaterThan(1);
      }
    }
  });
});
