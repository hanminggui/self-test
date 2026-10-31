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

export const USER_RELATIONS_TABLE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user_relations (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referee_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'referral',
    source_session_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    UNIQUE(referrer_id, referee_id)
  );
  CREATE INDEX IF NOT EXISTS idx_user_relations_referrer ON user_relations(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_user_relations_referee ON user_relations(referee_id);
  CREATE INDEX IF NOT EXISTS idx_user_relations_source_session ON user_relations(source_session_id);
`;

/**
 * 动态解析默认 SQLite 数据库文件路径：
 * - 优先遵循 process.env.DB_PATH 或 process.env.DATABASE_PATH
 * - 单元测试环境（process.env.NODE_ENV === "test" 或 process.env.BUN_TEST === "1"）自动重定向到 data/test_tmp/test_sessions.sqlite，绝不污染正式数据库
 * - 常规运行与开发环境使用 data/sessions.sqlite
 */
export function getDefaultDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.NODE_ENV === "test" || process.env.BUN_TEST === "1") {
    return path.join(process.cwd(), "data", "test_tmp", "test_sessions.sqlite");
  }
  return path.join(process.cwd(), "data", "sessions.sqlite");
}

export class LocalSqliteAdapter implements StorageAdapter {
  readonly engine = "local_sqlite";
  private db: Database;
  public static readonly USERS_SCHEMA_SQL = USERS_TABLE_SCHEMA_SQL;

  constructor(dbPathOrDb?: string | Database) {
    if (dbPathOrDb && typeof dbPathOrDb !== "string") {
      this.db = dbPathOrDb;
    } else {
      const targetPath = dbPathOrDb || getDefaultDatabasePath();
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
      this.db.exec(USER_RELATIONS_TABLE_SCHEMA_SQL);
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
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN total_trials INTEGER NOT NULL DEFAULT 30;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN warmup_trials INTEGER NOT NULL DEFAULT 10;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN completed_trials INTEGER NOT NULL DEFAULT 30;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN reversals_count INTEGER DEFAULT 0;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN brier_score REAL DEFAULT 0.20;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN coachability_index INTEGER DEFAULT 50;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE completed_sessions ADD COLUMN risk_attitude TEXT DEFAULT 'MODERATE_RATIONAL';");
    } catch {}
    try {
      this.db.exec("UPDATE completed_sessions SET subject_name = name WHERE subject_name IS NULL AND name IS NOT NULL;");
    } catch {}

    // Auto-migrate historical records and metadata from legacy full_report_json
    this.migrateLegacyJsonReports();
  }

  private migrateLegacyJsonReports(): void {
    try {
      const cols = this.db.query("PRAGMA table_info(completed_sessions)").all() as any[];
      const hasFullReport = cols.some((c) => c.name === "full_report_json");
      if (!hasFullReport) return;

      const rows = this.db.query(
        "SELECT id, subject_name, name, subject_type, persona, thinking_effort, token_usage_json, full_report_json FROM completed_sessions WHERE full_report_json IS NOT NULL"
      ).all() as any[];

      if (!rows || rows.length === 0) return;

      const insertRecordStmt = this.db.prepare(`
        INSERT OR IGNORE INTO session_records (
          session_id, trial_index, is_warmup, difficulty_level, stimulus_id,
          correct_option, first_order_choice, is_correct_first_order, revised_choice,
          is_correct_final, action, confidence_level, hints_unlocked, score_delta,
          duration_ms, agent_trace_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertAgentStmt = this.db.prepare(`
        INSERT OR IGNORE INTO session_agent_metadata (
          session_id, model_name, persona, thinking_effort, evaluation_mode,
          prompt_tokens, completion_tokens, cached_tokens, reasoning_tokens, total_tokens
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of rows) {
        try {
          const report = JSON.parse(row.full_report_json);
          const records = report.records || [];
          const isHuman = (row.subject_type || report.subject_type) === "HUMAN";

          for (const rec of records) {
            const agentTrace = !isHuman && (rec.token_usage || rec.operations)
              ? JSON.stringify({ token_usage: rec.token_usage, operations: rec.operations })
              : null;
            insertRecordStmt.run(
              row.id,
              rec.trial_index,
              rec.is_warmup ? 1 : 0,
              rec.difficulty_level ?? 0.5,
              rec.stimulus_id || `q_${rec.trial_index}`,
              rec.correct_option || "A",
              rec.first_order_choice || "A",
              rec.is_correct_first_order ? 1 : 0,
              rec.revised_choice ?? null,
              rec.is_correct_final ? 1 : 0,
              rec.action || "SAFE_BET",
              rec.confidence_level ?? 0.5,
              rec.hints_unlocked ?? 0,
              rec.score_delta ?? 0,
              rec.duration_ms ?? null,
              agentTrace
            );
          }

          if (!isHuman) {
            let tokens = { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, reasoning_tokens: 0, total_tokens: 0 };
            if (row.token_usage_json) {
              try {
                const tu = JSON.parse(row.token_usage_json);
                tokens = {
                  prompt_tokens: tu.prompt_tokens ?? tu.promptTokens ?? 0,
                  completion_tokens: tu.completion_tokens ?? tu.completionTokens ?? 0,
                  cached_tokens: tu.cached_tokens ?? tu.cachedTokens ?? 0,
                  reasoning_tokens: tu.reasoning_tokens ?? tu.reasoningTokens ?? 0,
                  total_tokens: tu.total_tokens ?? tu.totalTokens ?? 0,
                };
              } catch {}
            } else if (report.agent_metadata?.token_usage) {
              const tu = report.agent_metadata.token_usage;
              tokens = {
                prompt_tokens: tu.prompt_tokens ?? tu.promptTokens ?? 0,
                completion_tokens: tu.completion_tokens ?? tu.completionTokens ?? 0,
                cached_tokens: tu.cached_tokens ?? tu.cachedTokens ?? 0,
                reasoning_tokens: tu.reasoning_tokens ?? tu.reasoningTokens ?? 0,
                total_tokens: tu.total_tokens ?? tu.totalTokens ?? 0,
              };
            }

            insertAgentStmt.run(
              row.id,
              row.subject_name || row.name || report.agent_metadata?.model_name || "Agent",
              row.persona || report.agent_metadata?.persona || null,
              row.thinking_effort || report.agent_metadata?.thinking_effort || null,
              report.agent_metadata?.evaluation_mode || null,
              tokens.prompt_tokens,
              tokens.completion_tokens,
              tokens.cached_tokens,
              tokens.reasoning_tokens,
              tokens.total_tokens
            );
          }
        } catch (e) {
          console.warn(`[LocalSqliteAdapter] Failed to migrate historical session ${row.id}:`, e);
        }
      }
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
    this.execSync(USER_RELATIONS_TABLE_SCHEMA_SQL);
  }
}
