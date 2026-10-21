-- Migration: 0001_init.sql
-- Cloudflare D1 Initial Schema for Metacognitive Testing System (v2.3 Normalized Architecture)

-- 1. Completed Sessions (Concise Single-Test Result Table)
CREATE TABLE IF NOT EXISTS completed_sessions (
  id TEXT PRIMARY KEY,
  subject_name TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  total_trials INTEGER NOT NULL,
  warmup_trials INTEGER NOT NULL,
  completed_trials INTEGER NOT NULL,
  total_duration_ms INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  quadrant_code TEXT NOT NULL,
  first_order_accuracy REAL NOT NULL,
  second_order_accuracy REAL NOT NULL,
  reversals_count INTEGER NOT NULL DEFAULT 0,
  d_star REAL NOT NULL,
  d_prime REAL NOT NULL,
  meta_d_prime REAL NOT NULL,
  m_ratio REAL NOT NULL,
  calibration_bias REAL NOT NULL,
  brier_score REAL NOT NULL,
  ive REAL NOT NULL,
  coachability_index INTEGER NOT NULL,
  risk_attitude TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_id TEXT
);

-- 2. Per-Trial Step Detail Table
CREATE TABLE IF NOT EXISTS session_records (
  session_id TEXT NOT NULL,
  trial_index INTEGER NOT NULL,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  difficulty_level REAL NOT NULL,
  stimulus_id TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  first_order_choice TEXT NOT NULL,
  is_correct_first_order INTEGER NOT NULL,
  revised_choice TEXT,
  is_correct_final INTEGER NOT NULL,
  action TEXT NOT NULL,
  confidence_level REAL NOT NULL,
  hints_unlocked INTEGER NOT NULL DEFAULT 0,
  score_delta INTEGER NOT NULL,
  duration_ms INTEGER,
  agent_trace_json TEXT,
  PRIMARY KEY (session_id, trial_index)
);

-- 3. Model-Only Execution Metadata Table (1:1 Extension, NULL/absent for HUMAN)
CREATE TABLE IF NOT EXISTS session_agent_metadata (
  session_id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  persona TEXT,
  thinking_effort TEXT,
  evaluation_mode TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0
);

-- 4. Active In-Progress Sessions Table
CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  total_trials INTEGER NOT NULL,
  warmup_trials INTEGER NOT NULL,
  current_trial_index INTEGER NOT NULL,
  current_phase TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  staircase_state_json TEXT NOT NULL,
  task_generator_state_json TEXT NOT NULL,
  current_task_json TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  staged_p1_choice TEXT,
  hint_revealed INTEGER NOT NULL DEFAULT 0,
  hints_unlocked INTEGER NOT NULL DEFAULT 0,
  hints_unlocked_before_p1 INTEGER NOT NULL DEFAULT 0,
  hints_cost INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,
  agent_metadata_json TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT
);

-- 5. User Authentication Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  primary_provider TEXT,
  created_at TEXT,
  updated_at TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_completed_sessions_created_at ON completed_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_quadrant ON completed_sessions(quadrant_code);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_user_id ON completed_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON session_records(session_id, trial_index ASC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_updated_at ON active_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
