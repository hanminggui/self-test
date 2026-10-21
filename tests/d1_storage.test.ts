import { describe, it, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";
import { D1StorageAdapter } from "../src/storage/d1";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, SubjectType } from "../src/backend/models";
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

/**
 * Creates an in-memory simulated Cloudflare D1 Database adhering strictly to
 * Cloudflare's D1 API specification.
 */
function createSimulatedD1(): D1Database {
  const memDb = new Database(":memory:");

  const createStatement = (sql: string, params: any[] = []): D1PreparedStatement => ({
    bind(...newParams: any[]): D1PreparedStatement {
      return createStatement(sql, [...params, ...newParams]);
    },
    first: async <T = unknown>(col?: string): Promise<T | null> => {
      const row = memDb.prepare(sql).get(...params) as any;
      if (!row) return null;
      return (col ? row[col] : row) as T;
    },
    run: async () => {
      const res = memDb.prepare(sql).run(...params) as any;
      return {
        success: true,
        meta: {
          changes: res?.changes ?? 0,
          last_row_id: Number(res?.lastInsertRowid ?? 0),
          rows_written: res?.changes ?? 0,
        },
      };
    },
    all: async <T = unknown>() => {
      const rows = memDb.prepare(sql).all(...params) as T[];
      return {
        results: rows,
        success: true,
        meta: {
          changes: 0,
          rows_read: rows.length,
          rows_written: 0,
        },
      };
    },
    raw: async <T = unknown>() => {
      return memDb.prepare(sql).values(...params) as T[];
    },
  } as unknown as D1PreparedStatement);

  return {
    prepare(sql: string): D1PreparedStatement {
      return createStatement(sql, []);
    },
    dump: async () => new ArrayBuffer(0),
    batch: async (statements: D1PreparedStatement[]) => {
      const results = [];
      for (const s of statements) {
        results.push(await s.all());
      }
      return results;
    },
    exec: async (sql: string) => {
      memDb.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;
}

describe("GitHub Issue #3: Cloudflare D1 Adapter & Schema Migrations", () => {
  let simD1: D1Database;
  let adapter: D1StorageAdapter;

  beforeEach(async () => {
    simD1 = createSimulatedD1();
    adapter = new D1StorageAdapter(simD1);
  });

  test("D1StorageAdapter implements StorageAdapter interface methods correctly", async () => {
    expect(adapter.engine).toBe("cloudflare_d1");
    expect(adapter.getDatabase()).toBe(simD1);

    // 1. exec DDL
    await adapter.exec("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, score REAL);");

    // 2. run DML (INSERT)
    const insertRes = await adapter.run("INSERT INTO test_table (name, score) VALUES (?, ?)", ["Edge Worker", 98.5]);
    expect(insertRes.changes).toBe(1);
    expect(insertRes.lastInsertRowid).toBeDefined();

    // 3. query SELECT
    const rows = await adapter.query<{ id: number; name: string; score: number }>("SELECT * FROM test_table WHERE name = ?", ["Edge Worker"]);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Edge Worker");
    expect(rows[0].score).toBe(98.5);

    // 4. close (should not throw)
    expect(() => adapter.close()).not.toThrow();
  });

  test("Applies migrations/0001_init.sql cleanly on simulated D1", async () => {
    const migrationPath = path.join(process.cwd(), "migrations", "0001_init.sql");
    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    await adapter.exec(migrationSql);

    // Verify completed_sessions and active_sessions exist in sqlite_master
    const tables = await adapter.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('completed_sessions', 'active_sessions')"
    );
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain("completed_sessions");
    expect(tableNames).toContain("active_sessions");

    // Verify indices exist
    const indices = await adapter.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
    );
    const indexNames = indices.map(i => i.name);
    expect(indexNames).toContain("idx_completed_sessions_created_at");
    expect(indexNames).toContain("idx_active_sessions_updated_at");
  });

  test("Full Session Lifecycle on D1: start -> hints -> phase1 -> phase2 -> completion -> report -> cohort scatter -> delete", async () => {
    // 1. Run migration
    const migrationSql = fs.readFileSync(path.join(process.cwd(), "migrations", "0001_init.sql"), "utf-8");
    await adapter.exec(migrationSql);

    const sm = new SessionManager(adapter);

    // 2. Start Session
    const session = await sm.createSessionAsync({
      sessionId: "d1_sess_001",
      subjectName: "Cloudflare D1 Tester",
      subjectType: SubjectType.HUMAN,
      totalTrials: 3,
      warmupTrials: 1,
      initialDelta: 0.50,
      seed: 42,
    });
    expect(session.sessionId).toBe("d1_sess_001");

    // Verify row was persisted in active_sessions
    const activeRows1 = await adapter.query("SELECT * FROM active_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(activeRows1.length).toBe(1);
    expect(activeRows1[0].subject_name).toBe("Cloudflare D1 Tester");
    expect(activeRows1[0].current_trial_index).toBe(1);

    // 3. Trial 1: Request Hints (Tier 1 then Tier 2)
    const hint1 = await sm.requestHintAsync(session.sessionId);
    expect(hint1.tier).toBe(1);
    expect(hint1.cost).toBe(1);
    expect(hint1.total_cost).toBe(1);

    const hint2 = await sm.requestHintAsync(session.sessionId);
    expect(hint2.tier).toBe(2);
    expect(hint2.cost).toBe(2);
    expect(hint2.total_cost).toBe(3);

    // Verify hint unlock state in active_sessions
    const activeRows2 = await adapter.query("SELECT hints_unlocked, hints_cost FROM active_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(activeRows2[0].hints_unlocked).toBe(2);
    expect(activeRows2[0].hints_cost).toBe(3);

    // 4. Trial 1: Submit Phase 1
    const p1Res = await sm.submitPhase1Async(session.sessionId, "A");
    expect(p1Res.phase).toBe("PHASE_2_METACOGNITIVE");

    const activeRows3 = await adapter.query("SELECT staged_p1_choice, current_phase FROM active_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(activeRows3[0].staged_p1_choice).toBe("A");
    expect(activeRows3[0].current_phase).toBe("PHASE_2_METACOGNITIVE");

    // 5. Trial 1: Submit Phase 2 (advances to trial 2)
    const p2Res1 = await sm.submitPhase2Async(session.sessionId, MetacognitiveAction.HIGH_BET, 0.95, "A");
    expect(p2Res1.is_completed).toBe(false);
    expect(p2Res1.next_trial_index).toBe(2);

    // 6. Complete remaining trials (Trial 2 and 3)
    // Trial 2
    await sm.submitPhase1Async(session.sessionId, "B");
    const p2Res2 = await sm.submitPhase2Async(session.sessionId, MetacognitiveAction.SAFE_BET, 0.50);
    expect(p2Res2.is_completed).toBe(false);
    expect(p2Res2.next_trial_index).toBe(3);

    // Trial 3 (final trial)
    await sm.submitPhase1Async(session.sessionId, "C");
    const p2Res3 = await sm.submitPhase2Async(session.sessionId, MetacognitiveAction.HIGH_BET, 0.90);
    expect(p2Res3.is_completed).toBe(true);
    expect(p2Res3.report).toBeDefined();

    // 7. Verify session was removed from active_sessions and inserted into completed_sessions
    const activeRowsFinal = await adapter.query("SELECT * FROM active_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(activeRowsFinal.length).toBe(0);

    const completedRows = await adapter.query("SELECT * FROM completed_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(completedRows.length).toBe(1);
    expect(completedRows[0].id).toBe("d1_sess_001");
    expect(completedRows[0].subject_name).toBe("Cloudflare D1 Tester");
    expect(completedRows[0].quadrant_code).toBeDefined();

    const d1StepRecords = await adapter.query("SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC", ["d1_sess_001"]);
    expect(d1StepRecords.length).toBe(3);

    // 8. Fetch Report via getReportAsync
    const report = await sm.getReportAsync("d1_sess_001");
    expect(report.session_id).toBe("d1_sess_001");
    expect(report.subject_name).toBe("Cloudflare D1 Tester");
    expect(report.metrics.first_order_accuracy).toBeDefined();
    expect(report.metrics.d_star).toBeDefined();
    expect(report.quadrant_code).toBeDefined();

    // 9. Fetch Cohort Scatter via getCohortScatterDataAsync
    const cohort = await sm.getCohortScatterDataAsync("d1_sess_001");
    expect(cohort.subjects.length).toBeGreaterThanOrEqual(1);
    const foundSubject = cohort.subjects.find(s => s.id === "d1_sess_001");
    expect(foundSubject).toBeDefined();
    expect(foundSubject?.is_current).toBe(true);
    expect(foundSubject?.quadrant_code).toBeDefined();
    expect(foundSubject?.metrics.d_star).toBeDefined();

    // 10. Delete session via deleteSessionAsync
    const deleteSuccess = await sm.deleteSessionAsync("d1_sess_001");
    expect(deleteSuccess).toBe(true);

    const afterDeleteRows = await adapter.query("SELECT * FROM completed_sessions WHERE id = ?", ["d1_sess_001"]);
    expect(afterDeleteRows.length).toBe(0);
    const afterDeleteRecords = await adapter.query("SELECT * FROM session_records WHERE session_id = ?", ["d1_sess_001"]);
    expect(afterDeleteRecords.length).toBe(0);
  });

  test("Executes multiline DDL safely without triggering Cloudflare D1 newline split bugs", async () => {
    // Simulate Cloudflare D1 environment where db.exec would crash on multiline SQL
    const strictMultilineD1 = {
      prepare: simD1.prepare.bind(simD1),
      dump: simD1.dump.bind(simD1),
      batch: simD1.batch.bind(simD1),
      exec: async (sql: string) => {
        if (sql.includes("\n")) {
          throw new Error("D1_EXEC_ERROR: Error in line 1: incomplete input: SQLITE_ERROR");
        }
        return { count: 1, duration: 0 };
      },
    } as unknown as D1Database;

    const safeAdapter = new D1StorageAdapter(strictMultilineD1);

    const multilineSql = `
      -- Leading comment
      CREATE TABLE IF NOT EXISTS multiline_test (
        id TEXT PRIMARY KEY,
        name TEXT,
        data_json TEXT
      );
      -- Second statement
      CREATE INDEX IF NOT EXISTS idx_multiline_name ON multiline_test(name);
    `;

    // Should not throw even when raw db.exec rejects multiline queries
    await expect(safeAdapter.exec(multilineSql)).resolves.toBeUndefined();

    // Verify table exists
    const tables = await safeAdapter.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='multiline_test'"
    );
    expect(tables.length).toBe(1);
  });

  it("D1 Storage Adapter supports User Core Schema and UserManager operations (#9 on Cloudflare D1)", async () => {
    const { UserManager } = await import("../src/backend/user_manager");
    const userManager = new UserManager(adapter);

    const user = await userManager.upsertUser({
      primary_provider: "github",
      provider_id: "gh_d1_12345",
      email: "d1_user@example.com",
      display_name: "D1 Explorer",
      avatar_url: "https://example.com/avatar.png",
      metadata: { role: "tester" },
    });

    expect(user.id).toBeDefined();
    expect(user.display_name).toBe("D1 Explorer");

    const fetched = await userManager.getUserById(user.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.email).toBe("d1_user@example.com");

    const fetchedByEmail = await userManager.getUserByEmail("d1_user@example.com");
    expect(fetchedByEmail?.id).toBe(user.id);
  });
});
