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
  ACCURATELY_CALIBRATED = "ACCURATELY_CALIBRATED", // 精准自知型
  OVERCONFIDENT = "OVERCONFIDENT",                 // 自负型 / 达克效应
  UNDERCONFIDENT = "UNDERCONFIDENT",               // 谨慎内耗型
  BLIND_GAMBLER = "BLIND_GAMBLER",                 // 盲赌型
  RANDOM_GUESSER = "RANDOM_GUESSER",               // 随机猜测型
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
  hint_cost: number;
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
}

export interface MetacognitiveMetrics {
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  brier_score: number;
  info_buying_efficiency: number;
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
  detailed_feedback?: string;
  // 5大专属称号展示层（严禁改动）
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
