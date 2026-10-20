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
            token_usage_json TEXT,
            user_id TEXT
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
            updated_at TEXT,
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
          CREATE INDEX IF NOT EXISTS idx_active_sessions_updated_at ON active_sessions(updated_at DESC);
          CREATE INDEX IF NOT EXISTS idx_completed_sessions_user_id ON completed_sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
      }
    }

    // Always ensure users table and user_id columns exist (safe idempotent check for existing databases)
    try {
      this.db.exec(USERS_TABLE_SCHEMA_SQL);
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN user_id TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE active_sessions ADD COLUMN user_id TEXT;");
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
