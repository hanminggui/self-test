-- Migration: 0004_duel_referrer.sql
-- Upgrades schema to support Cognitive Twin Duel & Referrer Session Tracking

ALTER TABLE active_sessions ADD COLUMN referrer_session_id TEXT;
ALTER TABLE completed_sessions ADD COLUMN referrer_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_completed_sessions_referrer ON completed_sessions(referrer_session_id);
