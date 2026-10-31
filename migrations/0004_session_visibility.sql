-- Migration: 0004_session_visibility.sql
-- Upgrades schema to support Three-Tier Session Visibility (private, anonymous, public)

ALTER TABLE completed_sessions ADD COLUMN visibility TEXT;
ALTER TABLE active_sessions ADD COLUMN visibility TEXT;

CREATE INDEX IF NOT EXISTS idx_completed_sessions_visibility ON completed_sessions(visibility);
