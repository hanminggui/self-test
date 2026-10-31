/**
 * Shared Subject Codename Generator (codename_generator.ts)
 * Provides a unified, browser-and-Node-safe random explorer codename generator
 * used across both backend SessionManager and frontend Welcome UI.
 */

import { getLocale, type SupportedLocale } from "../i18n";

export const CODENAME_PREFIXES_ZH = [
  "星轨", "微光", "深空", "虚空", "极境", "无界", "辰极",
  "暗曜", "灵知", "破晓", "幻海", "以太", "云渊", "苍穹", "终焉",
] as const;

export const CODENAME_SUFFIXES_ZH = [
  "领航员", "漫游者", "探索家", "执剑人", "观测者",
  "寻迹者", "破壁人", "行者", "游侠", "先驱", "守夜人",
] as const;

export const CODENAME_PREFIXES_EN = [
  "Silver", "Obsidian", "Astral", "Eldritch", "Solar",
  "Runic", "Velvet", "Aether", "Crimson", "Mythic",
  "Twilight", "Gilded", "Arcane", "Frost", "Celestial",
] as const;

export const CODENAME_SUFFIXES_EN = [
  "Inquisitor", "Alchemist", "Templar", "Seer", "Wayfarer",
  "Chronicler", "Spellbinder", "Warden", "Herald", "Oracle", "Vanguard",
] as const;

// Backward-compatible aliases
export const CODENAME_PREFIXES = CODENAME_PREFIXES_ZH;
export const CODENAME_SUFFIXES = CODENAME_SUFFIXES_ZH;

export function generateSubjectCodename(locale?: SupportedLocale): string {
  const targetLocale = locale || getLocale();
  const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");

  if (targetLocale === "en-US") {
    const p = CODENAME_PREFIXES_EN[Math.floor(Math.random() * CODENAME_PREFIXES_EN.length)];
    const s = CODENAME_SUFFIXES_EN[Math.floor(Math.random() * CODENAME_SUFFIXES_EN.length)];
    return `${p} ${s} · ${num}`;
  }

  const p = CODENAME_PREFIXES_ZH[Math.floor(Math.random() * CODENAME_PREFIXES_ZH.length)];
  const s = CODENAME_SUFFIXES_ZH[Math.floor(Math.random() * CODENAME_SUFFIXES_ZH.length)];
  return `${p}${s} · ${num}`;
}

export const ANONYMOUS_STARS_ZH = [
  "天机星", "天枢星", "天璇星", "天玑星", "天权星",
  "玉衡星", "开阳星", "摇光星", "紫微星", "天府星",
  "武曲星", "破军星", "贪狼星", "巨门星", "廉贞星", "七杀星",
] as const;

export const ANONYMOUS_STARS_EN = [
  "Arcane", "Astral", "Celestial", "Aether", "Solar",
  "Lunar", "Mythic", "Eldritch", "Runic", "Nebula",
  "Vanguard", "Chronos",
] as const;

export function generateMaskedCodename(sessionId: string, locale?: SupportedLocale): string {
  const targetLocale = locale || getLocale();
  let hash = 0;
  const str = String(sessionId || "session");
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const code = String(1000 + (hash % 9000));
  if (targetLocale === "en-US") {
    const star = ANONYMOUS_STARS_EN[hash % ANONYMOUS_STARS_EN.length];
    return `[${star}-${code}]`;
  }
  const star = ANONYMOUS_STARS_ZH[hash % ANONYMOUS_STARS_ZH.length];
  return `[${star}-${code}]`;
}
