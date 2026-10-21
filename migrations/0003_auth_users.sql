-- Migration: 0003_auth_users.sql
-- Upgrades schema to support User Accounts, OAuth Profiles, and Multi-Tenant Session Isolation

-- 1. Create Core Users Table
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

-- 2. Add user_id reference to Session Tables
ALTER TABLE active_sessions ADD COLUMN user_id TEXT;
ALTER TABLE completed_sessions ADD COLUMN user_id TEXT;

-- 3. Indexes for User Account and User-Scoped Queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_user_id ON completed_sessions(user_id);
