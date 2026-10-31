/**
 * Core domain types and schemas for the Metacognitive Testing System.
 * Fully decoupled first-order task evaluation and Type-2 metacognitive wagering.
 * Metacognitive v2.3: Normalized Relational Storage & Unified Metrics Specification.
 */

import type { SupportedLocale } from "../i18n";

export enum PhaseType {
  PHASE_1_FIRST_ORDER = "PHASE_1_FIRST_ORDER",
  PHASE_2_METACOGNITIVE = "PHASE_2_METACOGNITIVE",
  COMPLETED = "COMPLETED",
}

/**
 * Standard revealed preference expectation centroids for discrete wagering:
 * HIGH_BET: geometric/expectation midpoint of [0.65, 1.00] = 0.825
 * SAFE_BET: geometric/expectation midpoint of [0.25, 0.65] = 0.450
 */
export const DEFAULT_CONFIDENCE_HIGH_BET = 0.825;
export const DEFAULT_CONFIDENCE_SAFE_BET = 0.450;

export enum MetacognitiveAction {
  HIGH_BET = "HIGH_BET",   // 选对 +10，选错 -10
  SAFE_BET = "SAFE_BET",   // 保底 +3
  BUY_HINT = "BUY_HINT",   // 解锁线索
}

export enum SubjectType {
  HUMAN = "HUMAN",
  LLM_AGENT = "LLM_AGENT",
  MOCK_AGENT = "MOCK_AGENT",
}

export enum CognitiveArchetype {
  SOVEREIGN = "SOVEREIGN",                       // Q1-CAL: 人形外挂
  ADAPTIVE_LEARNER = "ADAPTIVE_LEARNER",         // Q2-EVO: 灵窍天开
  VIGILANT_SENTINEL = "VIGILANT_SENTINEL",       // Q3-SEN: 定海神针
  AUDACIOUS_PIONEER = "AUDACIOUS_PIONEER",       // Q4-PIO: 飞龙在天
  ANXIOUS_RETREATER = "ANXIOUS_RETREATER",       // Q5-RET: 大音希声
  BLIND_GAMBLER = "BLIND_GAMBLER",               // Q6-GAM: 无畏先锋
  PRAGMATIC_ARBITRAGEUR = "PRAGMATIC_ARBITRAGEUR", // Q7-ARB: 诸葛在世
  STOCHASTIC_DRIFTER = "STOCHASTIC_DRIFTER",     // Q8-DRI: 暮光星灵

  // 向后兼容历史 v1 枚举别名
  ACCURATELY_CALIBRATED = "SOVEREIGN",
  OVERCONFIDENT = "AUDACIOUS_PIONEER",
  UNDERCONFIDENT = "VIGILANT_SENTINEL",
  RANDOM_GUESSER = "STOCHASTIC_DRIFTER",
}

export enum RiskAttitude {
  HIGH_RISK_SEEKING = "HIGH_RISK_SEEKING",
  MODERATE_RATIONAL = "MODERATE_RATIONAL",
  RISK_AVERTED = "RISK_AVERTED",
}

export interface TrialPayload {
  stimulus_id: string;
  difficulty_level: number;
  prompt: string;
  options: Record<string, string>; // e.g. { "A": "...", "B": "...", "C": "...", "D": "..." }
  has_hint: boolean;
  hint_cost: number; // 默认 1 分 (Tier 1)
  hint_tier1_cost: number; // 1 分 (宏观规律思考方向)
  hint_tier2_cost: number; // 2 分 (微观穿透/细节排除)
  hints_unlocked: number; // 当前已解锁级别: 0 (未买), 1 (解锁 Tier 1), 2 (全部解锁)
  unlocked_hints?: {
    tier1?: string;
    tier2?: string;
  };
  task_type: string;
  stimulus_data?: Record<string, any>;
}

export interface TrialRequest {
  session_id: string;
  trial_index: number;
  phase: PhaseType;
  payload: TrialPayload;
}

export interface Phase1Response {
  selected_option: string; // 'A', 'B', 'C', 'D'
  timestamp_ms?: number;
}

export interface Phase2MetacognitiveAction {
  action: MetacognitiveAction;
  wager_stake?: number;
  confidence_level?: number;
  buy_hint_requested?: boolean;
  revised_option?: string;
}

export interface TokenUsageStats {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
}

export interface TrialOperation {
  step: string;
  action: string;
  details?: Record<string, any>;
}

export interface TrialMetrics {
  duration_ms?: number;
  token_usage?: TokenUsageStats;
  operations?: TrialOperation[];
}

export type EvaluationMode = "thinking_tool" | "multi_step" | "decision_model";

export interface SessionExecutionMetadata {
  model_name?: string;
  persona?: string;
  thinking_effort?: string;
  evaluation_mode?: EvaluationMode;
  total_duration_ms?: number;
  formatted_duration?: string;
  total_trials?: number;
  completed_trials?: number;
  warmup_trials?: number;
  token_usage?: TokenUsageStats;
  locale?: SupportedLocale;
  referrer_id?: string;
  source_session_id?: string;
}

export interface AgentExecutionMetadata {
  model_name: string;
  persona?: string;
  thinking_effort?: string;
  evaluation_mode?: EvaluationMode;
  token_usage: TokenUsageStats;
}

export interface AgentTrialTrace {
  token_usage?: TokenUsageStats;
  operations?: TrialOperation[];
}

export interface TrialResponse {
  session_id: string;
  trial_index: number;
  phase_1_response: Phase1Response;
  phase_2_metacognitive_action: Phase2MetacognitiveAction;
  trial_metrics?: TrialMetrics;
}

export interface TrialRecord {
  trial_index: number;
  is_warmup: boolean;
  difficulty_level: number;
  stimulus_id: string;
  correct_option: string;
  first_order_choice: string;
  is_correct_first_order: boolean;
  revised_choice: string | null;
  is_correct_final: boolean;
  action: MetacognitiveAction;
  confidence_level: number;
  hints_unlocked: number; // 0, 1, 2 (cost derived as 0, 1, 3; purchased derived as > 0)
  score_delta: number;
  duration_ms?: number;
  // Populated only for LLM_AGENT / MOCK_AGENT trials
  token_usage?: TokenUsageStats;
  operations?: TrialOperation[];
}

export interface AssessmentMetrics {
  first_order_accuracy: number;
  second_order_accuracy: number;
  reversals_count: number;
  d_star: number;
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  brier_score: number;
  ive: number;
  coachability_index: number;
  risk_attitude: RiskAttitude;
  formal_score?: number;
  composite_cognitive_score?: number;
  ccs?: number;
}

export type MetacognitiveMetrics = AssessmentMetrics;

export interface SkillItem {
  icon: string;
  type: string;
  name: string;
  desc: string;
}

export interface DiagnosticProfile {
  archetype: CognitiveArchetype;
  risk_attitude: RiskAttitude;
  critical_weakness: string;
  coachability_index: number;
  clinical_summary: string;
  detailed_feedback?: string;
  role_title: string;
  english_title?: string;
  quadrant_code: string;
  praise_tagline: string;
  strength_tags: string[];
  empowering_feedback: string;
  growth_advice: string;
  skills: SkillItem[];
}

export interface FinalAssessmentReport {
  session_id: string;
  subject_name: string;
  subject_type: string;
  locale: SupportedLocale;
  created_at: string;
  total_trials: number;
  warmup_trials: number;
  completed_trials: number;
  total_duration_ms: number;
  final_score: number;
  formal_score?: number;
  composite_cognitive_score?: number;
  ccs?: number;
  quadrant_code: string;
  archetype: CognitiveArchetype;
  metrics: AssessmentMetrics;
  agent_metadata?: AgentExecutionMetadata;
  records?: TrialRecord[];
  user_id?: string | null;

  // Transitional optional getters/properties for backwards compatibility until Issue #35
  summary?: {
    total_trials: number;
    first_order_accuracy: number;
    final_score: number;
    reversals_count: number;
    d_star: number;
  };
  metacognitive_metrics?: {
    d_prime: number;
    meta_d_prime: number;
    m_ratio: number;
    calibration_bias: number;
    brier_score: number;
    ive: number;
    info_buying_efficiency: number;
    d_star: number;
  };
  metadata?: SessionExecutionMetadata;
  diagnostic_profile?: DiagnosticProfile;
}

export interface SubjectDataPoint {
  id: string;
  name: string;
  subject_type: string;
  locale: SupportedLocale;
  created_at: string;
  total_trials: number;
  warmup_trials: number;
  total_duration_ms: number;
  final_score: number;
  formal_score?: number;
  composite_cognitive_score?: number;
  ccs?: number;
  quadrant_code: string;
  is_current?: boolean;
  metrics: AssessmentMetrics;
  agent_metadata?: AgentExecutionMetadata;
  user_id?: string | null;
  avatar_url?: string | null;
  nickname?: string;
  similarity?: number;
  similarity_percentage?: number;
  is_friend?: boolean;
  is_self?: boolean;

  // Legacy flat fields for backwards compatibility until views adapt
  first_order_accuracy?: number;
  second_order_accuracy?: number;
  d_prime?: number;
  meta_d_prime?: number;
  m_ratio?: number;
  calibration_bias?: number;
  d_star?: number;
  ive?: number;
  info_buying_efficiency?: number;
  brier_score?: number;
  coachability_index?: number;
  role_title?: string;
  praise_tagline?: string;
  cognitive_manifold_vector?: [number, number, number, number];
  clinical_summary?: string;
  metadata?: SessionExecutionMetadata;
}

export interface CohortScatterResponse {
  baseline_x: number;
  baseline_y: number;
  median_x: number;
  median_y: number;
  mean_x: number;
  mean_y: number;
  subjects: SubjectDataPoint[];
}
