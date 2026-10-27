/**
 * LLM Sampling Parameter Presets and Configuration Matrix (src/cli/lib/sampling_profiles.ts)
 */

export interface SamplingParams {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repeat_penalty?: number;
}

export interface SamplingProfile {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  params: SamplingParams;
}

export const DEFAULT_SAMPLING_PROFILES: SamplingProfile[] = [
  {
    id: "optimal",
    name: "✨ 综合最优 (Min-P 动态截断，推荐)",
    nameEn: "✨ Optimal Reasoning (Min-P Truncation, Recommended)",
    description: "temp: 0.2, min_p: 0.05, top_p: 0.95 | 兼顾逻辑灵活性与长尾幻觉抑制",
    descriptionEn: "temp: 0.2, min_p: 0.05, top_p: 0.95 | Balances reasoning exploration while suppressing tail hallucinations",
    params: {
      temperature: 0.2,
      min_p: 0.05,
      top_p: 0.95,
    },
  },
  {
    id: "greedy",
    name: "🎯 绝对确定性 (Greedy 贪婪采样)",
    nameEn: "🎯 Strict Deterministic (Greedy Sampling)",
    description: "temp: 0.0 | 消除所有随机抖动，100% 确定性基线",
    descriptionEn: "temp: 0.0 | Zero randomness, 100% reproducible baseline",
    params: {
      temperature: 0.0,
    },
  },
  {
    id: "baseline",
    name: "⚖️ 经典默认 (Baseline 微扰)",
    nameEn: "⚖️ Classic Baseline",
    description: "temp: 0.1, top_p: 0.95 | 标准微弱扰动对照组",
    descriptionEn: "temp: 0.1, top_p: 0.95 | Standard low-temperature perturbation",
    params: {
      temperature: 0.1,
      top_p: 0.95,
    },
  },
  {
    id: "exploratory",
    name: "🎲 适度发散 (Exploratory / 高温测试)",
    nameEn: "🎲 Exploratory / High-Temp Test",
    description: "temp: 0.7, top_p: 0.8, top_k: 40 | 检验高随机性下元认知指标是否劣化",
    descriptionEn: "temp: 0.7, top_p: 0.8, top_k: 40 | Evaluates robustness and calibration under higher randomness",
    params: {
      temperature: 0.7,
      top_p: 0.8,
      top_k: 40,
    },
  },
];

export function getSamplingProfile(id: string): SamplingProfile | undefined {
  return DEFAULT_SAMPLING_PROFILES.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export function formatSamplingParams(params?: SamplingParams): string {
  if (!params) return "default (temp: 0.1)";
  const parts: string[] = [];
  if (params.temperature !== undefined) parts.push(`temp=${params.temperature}`);
  if (params.min_p !== undefined) parts.push(`min_p=${params.min_p}`);
  if (params.top_p !== undefined) parts.push(`top_p=${params.top_p}`);
  if (params.top_k !== undefined) parts.push(`top_k=${params.top_k}`);
  if (params.frequency_penalty !== undefined) parts.push(`freq_pen=${params.frequency_penalty}`);
  if (params.presence_penalty !== undefined) parts.push(`pres_pen=${params.presence_penalty}`);
  if (params.repeat_penalty !== undefined) parts.push(`rep_pen=${params.repeat_penalty}`);
  return parts.length > 0 ? parts.join(", ") : "default";
}

export function resolveSamplingParams(
  profileId?: string,
  overrides?: Partial<SamplingParams>
): { profileId: string; params: SamplingParams } {
  const chosenProfileId = profileId || "optimal";
  const matched = getSamplingProfile(chosenProfileId) || DEFAULT_SAMPLING_PROFILES[0];
  const merged: SamplingParams = {
    ...matched.params,
    ...Object.fromEntries(
      Object.entries(overrides || {}).filter(([_, v]) => v !== undefined)
    ),
  };

  const isCustom = Object.keys(overrides || {}).some(
    (k) => (overrides as any)[k] !== undefined && (overrides as any)[k] !== (matched.params as any)[k]
  );

  return {
    profileId: isCustom ? "custom" : matched.id,
    params: merged,
  };
}
