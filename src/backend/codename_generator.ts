/**
 * Shared Subject Codename Generator (codename_generator.ts)
 * Provides a unified, browser-and-Node-safe random explorer codename generator
 * used across both backend SessionManager and frontend Welcome UI.
 */

export const CODENAME_PREFIXES = [
  "星轨", "微光", "深空", "虚空", "极境", "无界", "辰极",
  "暗曜", "灵知", "破晓", "幻海", "以太", "云渊", "苍穹", "终焉",
] as const;

export const CODENAME_SUFFIXES = [
  "领航员", "漫游者", "探索家", "执剑人", "观测者",
  "寻迹者", "破壁人", "行者", "游侠", "先驱", "守夜人",
] as const;

export function generateSubjectCodename(): string {
  const p = CODENAME_PREFIXES[Math.floor(Math.random() * CODENAME_PREFIXES.length)];
  const s = CODENAME_SUFFIXES[Math.floor(Math.random() * CODENAME_SUFFIXES.length)];
  const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
  return `${p}${s} · ${num}`;
}
