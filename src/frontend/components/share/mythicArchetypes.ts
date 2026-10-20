/**
 * Chinese Oriental Mythic Archetypes Configuration (mythicArchetypes.ts)
 * 
 * Maps 8 Metacognitive Archetypes to Zhouyi Bagua (周易八卦),
 * Celestial Totems (东方神兽), I-Ching Aphorisms (易经象辞箴言),
 * Vermilion Seals (朱砂吉印), and Brush Gold Aesthetics (泥金水墨纹理).
 */

import { CognitiveArchetype } from "../../../backend/models";

export interface ColorScheme {
  primaryGold: string;
  secondaryGold: string;
  accentColor: string;
  bgRadialInner: string;
  bgRadialOuter: string;
  glowColor: string;
  cardBorder: string;
  badgeBg: string;
}

export interface MythicArchetypeConfig {
  archetype: CognitiveArchetype;
  quadrantCode: string;
  roleTitle: string;
  englishTitle: string;
  praiseTagline: string;
  baguaName: string;      // 乾 / 坤 / 震 / 巽 / 坎 / 离 / 艮 / 兑
  baguaSymbol: string;    // ☰ / ☷ / ☳ / ☴ / ☵ / ☲ / ☶ / ☱
  baguaNature: string;    // 天 / 地 / 雷 / 风 / 水 / 火 / 山 / 泽
  trigramLines: [boolean, boolean, boolean]; // [初爻, 二爻, 上爻] true=阳爻, false=阴爻
  mythicTotem: string;    // 九天应龙 / 混元鲲鹏 / 破阵雷龙 / 随风青鸾 / 玄武镇海 / 离火朱雀 / 抱朴白鹿 / 破晓白虎
  totemTitle: string;     // 统御天道之龙 / 混元无极之鹏 ...
  totemAphorism: string;  // 简练箴言，如 "九重御天 · 算力降维"
  hexagramAphorism: string; // 《周易》原典象辞或卦辞
  sealText: string;       // 篆刻四字朱印，如 "天元统御", "算无遗策", "知行合一"
  colorScheme: ColorScheme;
  totemSvgPath: string;   // 矢量轮廓路径
}

/**
 * 周易先天/后天八卦对照元数据
 */
export const BAGUA_TRIGRAMS: Record<
  string,
  { symbol: string; nature: string; lines: [boolean, boolean, boolean] }
> = {
  乾: { symbol: "☰", nature: "天", lines: [true, true, true] },
  坤: { symbol: "☷", nature: "地", lines: [false, false, false] },
  震: { symbol: "☳", nature: "雷", lines: [true, false, false] },
  巽: { symbol: "☴", nature: "风", lines: [false, true, true] },
  坎: { symbol: "☵", nature: "水", lines: [false, true, false] },
  离: { symbol: "☲", nature: "火", lines: [true, false, true] },
  艮: { symbol: "☶", nature: "山", lines: [false, false, true] },
  兑: { symbol: "☱", nature: "泽", lines: [true, true, false] },
};

/**
 * 8 大认知流形专属东方神话图腾配置矩阵
 */
export const MYTHIC_ARCHETYPES: Record<CognitiveArchetype, MythicArchetypeConfig> = {
  // 1. Q1-CAL: 人形外挂 -> 乾为天 ☰ (九天应龙)
  [CognitiveArchetype.SOVEREIGN]: {
    archetype: CognitiveArchetype.SOVEREIGN,
    quadrantCode: "Q1-CAL",
    roleTitle: "人形外挂",
    englishTitle: "The Sovereign",
    praiseTagline: "你开了 · 诗人握持",
    baguaName: "乾",
    baguaSymbol: "☰",
    baguaNature: "天",
    trigramLines: [true, true, true],
    mythicTotem: "九天应龙",
    totemTitle: "统御天道之主 · 洞照虚明",
    totemAphorism: "九重御天 · 算力降维",
    hexagramAphorism: "大哉乾元，万物资始，乃统天。自强不息，知行自洽。",
    sealText: "天元统御",
    colorScheme: {
      primaryGold: "#f59e0b",
      secondaryGold: "#fef08a",
      accentColor: "#d97706",
      bgRadialInner: "#171206",
      bgRadialOuter: "#080709",
      glowColor: "rgba(245, 158, 11, 0.45)",
      cardBorder: "rgba(245, 158, 11, 0.5)",
      badgeBg: "rgba(245, 158, 11, 0.15)",
    },
    // 龙腾祥云矢量图形
    totemSvgPath: "M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z M12 6C8 10 5 16 12 21C19 16 16 10 12 6Z",
  },

  // 2. Q2-EVO: 灵窍天开 -> 巽为风 ☴ (随风青鸾)
  [CognitiveArchetype.ADAPTIVE_LEARNER]: {
    archetype: CognitiveArchetype.ADAPTIVE_LEARNER,
    quadrantCode: "Q2-EVO",
    roleTitle: "灵窍天开",
    englishTitle: "The Adaptive Learner",
    praiseTagline: "心开一窍 · 融会贯通",
    baguaName: "巽",
    baguaSymbol: "☴",
    baguaNature: "风",
    trigramLines: [false, true, true],
    mythicTotem: "随风青鸾",
    totemTitle: "敏悟随风之使 · 灵心昭然",
    totemAphorism: "灵台自照 · 借风扶摇",
    hexagramAphorism: "随风巽，君子以申命行事。心开一窍，万象昭然，顿悟入微。",
    sealText: "灵台洞见",
    colorScheme: {
      primaryGold: "#10b981",
      secondaryGold: "#a7f3d0",
      accentColor: "#059669",
      bgRadialInner: "#061812",
      bgRadialOuter: "#040b08",
      glowColor: "rgba(16, 185, 129, 0.45)",
      cardBorder: "rgba(16, 185, 129, 0.5)",
      badgeBg: "rgba(16, 185, 129, 0.15)",
    },
    totemSvgPath: "M12 3C7 3 3 8 3 13C3 18 8 21 12 21C16 21 21 18 21 13C21 8 17 3 12 3ZM12 7C14.5 7 16.5 9 16.5 11.5C16.5 14 13.5 17 12 18C10.5 17 7.5 14 7.5 11.5C7.5 9 9.5 7 12 7Z",
  },

  // 3. Q3-SEN: 定海神针 -> 坎为水 ☵ (玄武镇海)
  [CognitiveArchetype.VIGILANT_SENTINEL]: {
    archetype: CognitiveArchetype.VIGILANT_SENTINEL,
    quadrantCode: "Q3-SEN",
    roleTitle: "定海神针",
    englishTitle: "The Sentinel",
    praiseTagline: "渊渟岳峙 · 固若金汤",
    baguaName: "坎",
    baguaSymbol: "☵",
    baguaNature: "水",
    trigramLines: [false, true, false],
    mythicTotem: "玄武镇海",
    totemTitle: "四海定盘之基 · 万丈不堕",
    totemAphorism: "玄武负岳 · 沧溟波平",
    hexagramAphorism: "水洊至，习坎，维心亨。渊渟岳峙，固若金汤，深沉不堕。",
    sealText: "镇海安澜",
    colorScheme: {
      primaryGold: "#38bdf8",
      secondaryGold: "#bae6fd",
      accentColor: "#0284c7",
      bgRadialInner: "#061324",
      bgRadialOuter: "#030810",
      glowColor: "rgba(56, 189, 248, 0.45)",
      cardBorder: "rgba(56, 189, 248, 0.5)",
      badgeBg: "rgba(56, 189, 248, 0.15)",
    },
    totemSvgPath: "M12 2L4 6V12C4 17.5 7.5 22.5 12 24C16.5 22.5 20 17.5 20 12V6L12 2ZM12 4.5L18 7.5V12C18 16.2 15.5 20.1 12 21.4C8.5 20.1 6 16.2 6 12V7.5L12 4.5Z",
  },

  // 4. Q4-PIO: 飞龙在天 -> 震为雷 ☳ (破阵雷龙)
  [CognitiveArchetype.AUDACIOUS_PIONEER]: {
    archetype: CognitiveArchetype.AUDACIOUS_PIONEER,
    quadrantCode: "Q4-PIO",
    roleTitle: "飞龙在天",
    englishTitle: "The Audacious Pioneer",
    praiseTagline: "飞龙骑脸 · 我怎么输",
    baguaName: "震",
    baguaSymbol: "☳",
    baguaNature: "雷",
    trigramLines: [true, false, false],
    mythicTotem: "破阵雷龙",
    totemTitle: "九霄霹雳先锋 · 摧枯拉朽",
    totemAphorism: "雷霆破阵 · 气吞万里",
    hexagramAphorism: "震惊百里，不丧匕鬯。飞龙在天，利见大人，锐意克敌。",
    sealText: "飞龙乘风",
    colorScheme: {
      primaryGold: "#f97316",
      secondaryGold: "#fed7aa",
      accentColor: "#c2410c",
      bgRadialInner: "#210905",
      bgRadialOuter: "#0c0402",
      glowColor: "rgba(249, 115, 22, 0.45)",
      cardBorder: "rgba(249, 115, 22, 0.5)",
      badgeBg: "rgba(249, 115, 22, 0.15)",
    },
    totemSvgPath: "M13 2L3 14H12L11 22L21 10H12L13 2Z",
  },

  // 5. Q5-RET: 大音希声 -> 艮为山 ☶ (抱朴白鹿)
  [CognitiveArchetype.ANXIOUS_RETREATER]: {
    archetype: CognitiveArchetype.ANXIOUS_RETREATER,
    quadrantCode: "Q5-RET",
    roleTitle: "大音希声",
    englishTitle: "The Formless Sentinel",
    praiseTagline: "大音希声 · 大象无形",
    baguaName: "艮",
    baguaSymbol: "☶",
    baguaNature: "山",
    trigramLines: [false, false, true],
    mythicTotem: "抱朴白鹿",
    totemTitle: "空谷幽居之灵 · 避世抱朴",
    totemAphorism: "空谷幽居 · 抱朴守真",
    hexagramAphorism: "兼山艮，君子以思不出其位。大音希声，大象无形，安如泰山。",
    sealText: "抱朴守真",
    colorScheme: {
      primaryGold: "#94a3b8",
      secondaryGold: "#e2e8f0",
      accentColor: "#475569",
      bgRadialInner: "#111822",
      bgRadialOuter: "#070a0e",
      glowColor: "rgba(148, 163, 184, 0.45)",
      cardBorder: "rgba(148, 163, 184, 0.5)",
      badgeBg: "rgba(148, 163, 184, 0.15)",
    },
    totemSvgPath: "M12 3L2 19H22L12 3ZM12 7.5L18.5 17.5H5.5L12 7.5ZM12 11L9.5 15.5H14.5L12 11Z",
  },

  // 6. Q6-GAM: 无畏先锋 -> 兑为泽 ☱ (破晓白虎)
  [CognitiveArchetype.BLIND_GAMBLER]: {
    archetype: CognitiveArchetype.BLIND_GAMBLER,
    quadrantCode: "Q6-GAM",
    roleTitle: "无畏先锋",
    englishTitle: "The Vanguard",
    praiseTagline: "左手高伤害 · 右手伤害高",
    baguaName: "兑",
    baguaSymbol: "☱",
    baguaNature: "泽",
    trigramLines: [true, true, false],
    mythicTotem: "破晓白虎",
    totemTitle: "开山辟路之勇 · 百折不挠",
    totemAphorism: "烈火试金 · 破晓突围",
    hexagramAphorism: "丽泽兑，君子以朋友讲习。向险而行，百炼成钢，一往无前。",
    sealText: "破晓无畏",
    colorScheme: {
      primaryGold: "#eab308",
      secondaryGold: "#fef08a",
      accentColor: "#ca8a04",
      bgRadialInner: "#1e1303",
      bgRadialOuter: "#0c0701",
      glowColor: "rgba(234, 179, 8, 0.45)",
      cardBorder: "rgba(234, 179, 8, 0.5)",
      badgeBg: "rgba(234, 179, 8, 0.15)",
    },
    totemSvgPath: "M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z",
  },

  // 7. Q7-ARB: 诸葛在世 -> 离为火 ☲ (离火朱雀)
  [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
    archetype: CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
    quadrantCode: "Q7-ARB",
    roleTitle: "诸葛在世",
    englishTitle: "The Pragmatic Strategist",
    praiseTagline: "羽扇纶巾 · 算无遗策",
    baguaName: "离",
    baguaSymbol: "☲",
    baguaNature: "火",
    trigramLines: [true, false, true],
    mythicTotem: "离火朱雀",
    totemTitle: "神机妙算之宗 · 借力化境",
    totemAphorism: "神机妙算 · 草船借箭",
    hexagramAphorism: "明两作离，大人以继明照于四方。草船借箭，算尽先机，借力打力。",
    sealText: "算无遗策",
    colorScheme: {
      primaryGold: "#f43f5e",
      secondaryGold: "#fecdd3",
      accentColor: "#be123c",
      bgRadialInner: "#22050e",
      bgRadialOuter: "#0e0206",
      glowColor: "rgba(244, 63, 94, 0.45)",
      cardBorder: "rgba(244, 63, 94, 0.5)",
      badgeBg: "rgba(244, 63, 94, 0.15)",
    },
    totemSvgPath: "M12 2C9 5 6 9 6 13C6 17 8.5 20 12 22C15.5 20 18 17 18 13C18 9 15 5 12 2ZM12 6C13.5 8 15 10.5 15 13C15 15.5 13.5 17.5 12 18.5C10.5 17.5 9 15.5 9 13C9 10.5 10.5 8 12 6Z",
  },

  // 8. Q8-DRI: 暮光星灵 -> 坤为地 ☷ (混元鲲鹏)
  [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
    archetype: CognitiveArchetype.STOCHASTIC_DRIFTER,
    quadrantCode: "Q8-DRI",
    roleTitle: "暮光星灵",
    englishTitle: "The Twilight Celestial",
    praiseTagline: "逍遥天地 · 不滞于物",
    baguaName: "坤",
    baguaSymbol: "☷",
    baguaNature: "地",
    trigramLines: [false, false, false],
    mythicTotem: "混元鲲鹏",
    totemTitle: "浩瀚星野之翼 · 逍遥化生",
    totemAphorism: "扶摇九万 · 极目星汉",
    hexagramAphorism: "至哉坤元，万物资生，乃顺承天。逍遥天地，不滞于物，乘风化蝶。",
    sealText: "混元星驰",
    colorScheme: {
      primaryGold: "#a855f7",
      secondaryGold: "#f3e8ff",
      accentColor: "#7e22ce",
      bgRadialInner: "#190827",
      bgRadialOuter: "#09030e",
      glowColor: "rgba(168, 85, 247, 0.45)",
      cardBorder: "rgba(168, 85, 247, 0.5)",
      badgeBg: "rgba(168, 85, 247, 0.15)",
    },
    totemSvgPath: "M12 2L14.4 8.6L21.5 9.2L16 13.8L17.7 20.8L12 17.2L6.3 20.8L8 13.8L2.5 9.2L9.6 8.6L12 2Z",
  },
};

/**
 * 智能解析画像配置，支持 CognitiveArchetype 枚举、QuadrantCode (如 "Q1-CAL") 或中文称号
 */
export function getMythicArchetype(identifier: CognitiveArchetype | string): MythicArchetypeConfig {
  if (!identifier) {
    return MYTHIC_ARCHETYPES[CognitiveArchetype.SOVEREIGN];
  }

  // 1. 直接枚举匹配
  if (MYTHIC_ARCHETYPES[identifier as CognitiveArchetype]) {
    return MYTHIC_ARCHETYPES[identifier as CognitiveArchetype];
  }

  const str = String(identifier).trim().toUpperCase();

  // 2. 象限代码匹配 (Q1-CAL, Q2-EVO ...)
  for (const item of Object.values(MYTHIC_ARCHETYPES)) {
    if (item.quadrantCode.toUpperCase() === str || item.quadrantCode.toUpperCase().startsWith(str)) {
      return item;
    }
  }

  // 3. 称号匹配 (人形外挂, 诸葛在世 ...)
  for (const item of Object.values(MYTHIC_ARCHETYPES)) {
    if (item.roleTitle === identifier || identifier.includes(item.roleTitle)) {
      return item;
    }
  }

  // 4. 卦名匹配 (乾, 坤, 震, 巽 ...)
  for (const item of Object.values(MYTHIC_ARCHETYPES)) {
    if (item.baguaName === identifier || item.baguaSymbol === identifier) {
      return item;
    }
  }

  // 5. 兜底返回 Q1-CAL 尊崇外挂
  return MYTHIC_ARCHETYPES[CognitiveArchetype.SOVEREIGN];
}
