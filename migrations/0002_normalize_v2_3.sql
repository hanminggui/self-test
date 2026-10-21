-- Migration: 0002_normalize_v2_3.sql
-- Upgrades schema to v2.3 Normalized Architecture (4-Table Normalization & Zero-i18n Persistence)

-- 1. Create Per-Trial Detail Table (session_records)
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

-- 2. Create Model-Only Execution Metadata Table (session_agent_metadata)
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

-- 3. Alter completed_sessions with v2.3 Normalized Columns
ALTER TABLE completed_sessions ADD COLUMN subject_name TEXT;
ALTER TABLE completed_sessions ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE completed_sessions ADD COLUMN total_trials INTEGER NOT NULL DEFAULT 30;
ALTER TABLE completed_sessions ADD COLUMN warmup_trials INTEGER NOT NULL DEFAULT 10;
ALTER TABLE completed_sessions ADD COLUMN completed_trials INTEGER NOT NULL DEFAULT 30;
ALTER TABLE completed_sessions ADD COLUMN reversals_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE completed_sessions ADD COLUMN brier_score REAL NOT NULL DEFAULT 0.20;
ALTER TABLE completed_sessions ADD COLUMN coachability_index INTEGER NOT NULL DEFAULT 50;
ALTER TABLE completed_sessions ADD COLUMN risk_attitude TEXT NOT NULL DEFAULT 'MODERATE_RATIONAL';

-- Backfill subject_name from legacy name column
UPDATE completed_sessions SET subject_name = name WHERE subject_name IS NULL AND name IS NOT NULL;

-- 4. Alter active_sessions with v2.3 Columns
ALTER TABLE active_sessions ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE active_sessions ADD COLUMN agent_metadata_json TEXT;

-- 5. Additional Indexes for v2.3 High-Performance Analytics
CREATE INDEX IF NOT EXISTS idx_completed_sessions_quadrant ON completed_sessions(quadrant_code);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON session_records(session_id, trial_index ASC);
