-- Migration: 0001_init.sql
-- Cloudflare D1 Initial Schema for Metacognitive Testing System

CREATE TABLE IF NOT EXISTS completed_sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  subject_type TEXT,
  first_order_accuracy REAL,
  second_order_accuracy REAL,
  d_prime REAL,
  meta_d_prime REAL,
  m_ratio REAL,
  calibration_bias REAL,
  final_score INTEGER,
  created_at TEXT,
  role_title TEXT,
  quadrant_code TEXT,
  full_report_json TEXT,
  d_star REAL,
  ive REAL,
  clinical_summary TEXT,
  total_duration_ms INTEGER,
  persona TEXT,
  thinking_effort TEXT,
  token_usage_json TEXT
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  subject_type TEXT,
  subject_name TEXT,
  total_trials INTEGER,
  warmup_trials INTEGER,
  current_trial_index INTEGER,
  current_phase TEXT,
  score INTEGER,
  staircase_state_json TEXT,
  task_generator_state_json TEXT,
  current_task_json TEXT,
  records_json TEXT,
  is_completed INTEGER,
  staged_p1_choice TEXT,
  hint_revealed INTEGER,
  hints_unlocked INTEGER,
  hints_unlocked_before_p1 INTEGER,
  hints_cost INTEGER,
  created_at TEXT,
  start_time_ms INTEGER,
  metadata_json TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_completed_sessions_created_at ON completed_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_updated_at ON active_sessions(updated_at DESC);
