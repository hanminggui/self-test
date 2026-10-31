-- Migration: 0004_user_relations.sql
-- Establishes the user_relations referral graph and mutual connections table

CREATE TABLE IF NOT EXISTS user_relations (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'referral',
  source_session_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referee_id) REFERENCES users(id),
  UNIQUE(referrer_id, referee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_relations_referrer ON user_relations(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_relations_referee ON user_relations(referee_id);
CREATE INDEX IF NOT EXISTS idx_user_relations_source_session ON user_relations(source_session_id);
