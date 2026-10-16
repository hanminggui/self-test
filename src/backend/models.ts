/**
 * Core domain types and schemas for the Metacognitive Testing System.
 * Fully decoupled first-order task evaluation and Type-2 metacognitive wagering.
 */

export enum PhaseType {
  PHASE_1_FIRST_ORDER = "PHASE_1_FIRST_ORDER",
  PHASE_2_METACOGNITIVE = "PHASE_2_METACOGNITIVE",
  COMPLETED = "COMPLETED",
}

export enum MetacognitiveAction {
  HIGH_BET = "HIGH_BET",   // 选对 +10，选错 -10
  SAFE_BET = "SAFE_BET",   // 保底 +3
  BUY_HINT = "BUY_HINT",   // 消耗 2 分购买线索
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

export interface TrialResponse {
  session_id: string;
  trial_index: number;
  phase_1_response: Phase1Response;
  phase_2_metacognitive_action: Phase2MetacognitiveAction;
}

export interface TrialRecord {
  trial_index: number;
  difficulty_level: number;
  stimulus_id: string;
  signal_type: "S1" | "S2";
  correct_option: string;
  first_order_choice: string;
  is_correct_first_order: boolean;
  action: MetacognitiveAction;
  confidence_level: number;
  hint_purchased: boolean;
  hints_unlocked?: number; // 0, 1, 2
  hints_cost_total?: number; // 0, 1, 3
  revised_choice?: string | null;
  is_correct_final: boolean;
  score_delta: number;
  is_warmup: boolean;
}

export interface SessionSummary {
  total_trials: number;
  first_order_accuracy: number;
  target_staircase_convergence: number;
  final_score: number;
  reversals_count: number;
  d_star?: number;
}

export interface MetacognitiveMetrics {
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  brier_score: number;
  info_buying_efficiency: number;
  d_star: number;
  cognitive_manifold_vector: [number, number, number, number]; // [D*, M_ratio, Bias, IVE]
}

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
  clinical_summary: string; // 后台统计层：客观特征与临床真值描述 (零情感修饰)
  detailed_feedback?: string;
  // 展示层：纯正面赋能契约
  role_title: string;
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
  summary: SessionSummary;
  metacognitive_metrics: MetacognitiveMetrics;
  diagnostic_profile: DiagnosticProfile;
}

export interface SubjectDataPoint {
  id: string;
  name: string;
  subject_type: string;
  first_order_accuracy: number;  // x: [0.0, 1.0]
  second_order_accuracy: number; // y: [0.0, 1.0]
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  final_score: number;
  is_current?: boolean;
  created_at?: string;
  role_title?: string;
  quadrant_code?: string;
  d_star: number;
  ive: number;
  cognitive_manifold_vector: [number, number, number, number];
  clinical_summary?: string;
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
