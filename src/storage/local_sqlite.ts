/**
 * Local SQLite Storage Adapter (src/storage/local_sqlite.ts)
 * 
 * Implements StorageAdapter wrapping `bun:sqlite` for local development,
 * testing, and standalone CLI environments.
 */

import { Database } from "bun:sqlite";
import * as path from "path";
import * as fs from "fs";
import { RunResult, StorageAdapter } from "./adapter";

export const USERS_TABLE_SCHEMA_SQL = `
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
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

export class LocalSqliteAdapter implements StorageAdapter {
  readonly engine = "local_sqlite";
  private db: Database;
  public static readonly USERS_SCHEMA_SQL = USERS_TABLE_SCHEMA_SQL;

  constructor(dbPathOrDb?: string | Database) {
    if (dbPathOrDb && typeof dbPathOrDb !== "string") {
      this.db = dbPathOrDb;
    } else {
      const targetPath = dbPathOrDb || path.join(process.cwd(), "data", "sessions.sqlite");
      if (targetPath !== ":memory:") {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      this.db = new Database(targetPath, { create: true });
    }
    // Startup check: verify and provision schema once at startup if new database
    this.ensureSchema();
  }

  /**
   * Startup verification: checks if tables already exist.
   * If absent (e.g. fresh file or in-memory DB), provisions schema from migrations/0001_init.sql once.
   * Never executes repeated DDL during subsequent operations.
   */
  ensureSchema(): void {
    const tableExists = this.db.query(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='completed_sessions'"
    ).get();

    if (!tableExists) {
      const migrationPath = path.resolve(process.cwd(), "migrations", "0001_init.sql");
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, "utf-8");
        this.db.exec(sql);
      } else {
        // Embedded fallback if migrations directory is absent
        this.db.exec(`
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
        `);
      }
    }

    // Always ensure users table and auxiliary tables exist (safe idempotent check)
    try {
      this.db.exec(USERS_TABLE_SCHEMA_SQL);
    } catch {}
    try {
      this.db.exec(`
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
      `);
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN user_id TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE active_sessions ADD COLUMN user_id TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE active_sessions ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE active_sessions ADD COLUMN agent_metadata_json TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN subject_name TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN reversals_count INTEGER DEFAULT 0;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN brier_score REAL;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN coachability_index INTEGER;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN risk_attitude TEXT;");
    } catch {}
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.querySync<T>(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<RunResult> {
    return this.runSync(sql, params);
  }

  async exec(sql: string): Promise<void> {
    this.execSync(sql);
  }

  querySync<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.query(sql);
    return stmt.all(...params) as T[];
  }

  runSync(sql: string, params: any[] = []): RunResult {
    const stmt = this.db.prepare(sql);
    const res = stmt.run(...params) as any;
    return {
      changes: res?.changes ?? 0,
      lastInsertRowid: res?.lastInsertRowid,
    };
  }

  execSync(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    try {
      this.db.close();
    } catch {}
  }

  getDatabase(): Database {
    return this.db;
  }

  initUserSchema(): void {
    this.execSync(USERS_TABLE_SCHEMA_SQL);
  }
}
