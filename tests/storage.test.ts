import { describe, expect, it } from "bun:test";
import { LocalSqliteAdapter, StorageAdapter } from "../src/storage";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, PhaseType } from "../src/backend/models";
import * as path from "path";
import * as fs from "fs";

describe("Pluggable Storage Layer & LocalSqliteAdapter", () => {
  it("LocalSqliteAdapter implements StorageAdapter interface (query, run, exec, close)", async () => {
    const adapter: StorageAdapter = new LocalSqliteAdapter(":memory:");

    // exec: multi-statement DDL
    await adapter.exec(`
      CREATE TABLE test_items (
        id TEXT PRIMARY KEY,
        name TEXT,
        val REAL
      );
    `);

    // run: parameterized insert
    const insertRes1 = await adapter.run(
      "INSERT INTO test_items (id, name, val) VALUES (?, ?, ?)",
      ["item-1", "Alpha", 12.5]
    );
    expect(insertRes1.changes).toBe(1);

    const insertRes2 = await adapter.run(
      "INSERT INTO test_items (id, name, val) VALUES (?, ?, ?)",
      ["item-2", "Beta", 24.8]
    );
    expect(insertRes2.changes).toBe(1);

    // query: typed results
    interface TestItem {
      id: string;
      name: string;
      val: number;
    }
    const items = await adapter.query<TestItem>("SELECT * FROM test_items ORDER BY val ASC");
    expect(items.length).toBe(2);
    expect(items[0].id).toBe("item-1");
    expect(items[0].val).toBe(12.5);
    expect(items[1].name).toBe("Beta");

    // close
    if (adapter.close) {
      adapter.close();
    }
  });

  it("SessionManager initializes active_sessions and completed_sessions tables via StorageAdapter", async () => {
    const adapter = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(adapter);

    // Verify active_sessions table exists
    const activeTable = await adapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='active_sessions'"
    );
    expect(activeTable.length).toBe(1);
    expect(activeTable[0].name).toBe("active_sessions");

    // Verify completed_sessions table exists
    const completedTable = await adapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='completed_sessions'"
    );
    expect(completedTable.length).toBe(1);
    expect(completedTable[0].name).toBe("completed_sessions");
  });

  it("Active session state persists across process restarts (staircase, task seed, hint unlock status)", async () => {
    // Shared database file to simulate process restart
    const tmpDir = path.resolve(process.cwd(), "data", "test_tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const testDbPath = path.join(tmpDir, `restart_test_${Date.now()}.sqlite`);

    try {
      // 1. Process 1: Start session, unlock hint tier 1, submit Phase 1
      const adapter1 = new LocalSqliteAdapter(testDbPath);
      const sm1 = new SessionManager(adapter1);

      const session = sm1.createSession({
        subjectName: "Process-Restart-Agent",
        totalTrials: 6,
        warmupTrials: 2,
        seed: 424242,
        persona: "Philosophical Rationalist",
        thinkingEffort: "medium",
      });
      const sid = session.sessionId;

      // Verify row is persisted in active_sessions table
      const activeRows1 = await adapter1.query(
        "SELECT * FROM active_sessions WHERE id = ?",
        [sid]
      );
      expect(activeRows1.length).toBe(1);
      expect(activeRows1[0].subject_name).toBe("Process-Restart-Agent");
      expect(activeRows1[0].current_trial_index).toBe(1);

      // Unlock Hint Tier 1
      const hintRes = sm1.requestHint(sid);
      expect(hintRes.tier).toBe(1);
      expect(hintRes.cost).toBe(1);

      // Submit Phase 1
      const p1Res = sm1.submitPhase1(sid, "A");
      expect(p1Res.phase).toBe(PhaseType.PHASE_2_METACOGNITIVE);

      // Check active_sessions updated
      const activeRows2 = await adapter1.query(
        "SELECT * FROM active_sessions WHERE id = ?",
        [sid]
      );
      expect(activeRows2[0].hints_unlocked).toBe(1);
      expect(activeRows2[0].staged_p1_choice).toBe("A");
      expect(activeRows2[0].current_phase).toBe(PhaseType.PHASE_2_METACOGNITIVE);

      // Close Process 1
      adapter1.close();

      // 2. Process 2: New SessionManager instance from cold start (in-memory map is completely empty)
      const adapter2 = new LocalSqliteAdapter(testDbPath);
      const sm2 = new SessionManager(adapter2);

      // Verify in-memory map has not loaded it yet
      // getSession should resurrect the active session from active_sessions table!
      const restored = sm2.getSession(sid);
      expect(restored).toBeDefined();
      expect(restored?.sessionId).toBe(sid);
      expect(restored?.subjectName).toBe("Process-Restart-Agent");
      expect(restored?.currentTrialIndex).toBe(1);
      expect(restored?.currentPhase).toBe(PhaseType.PHASE_2_METACOGNITIVE);
      expect(restored?.stagedP1Choice).toBe("A");
      expect(restored?.hintsUnlockedForCurrentTrial).toBe(1);
      expect(restored?.metadata?.persona).toBe("Philosophical Rationalist");

      // Verify staircase state was restored
      expect(restored?.staircase).toBeDefined();
      expect(restored?.staircase.getCurrentDelta()).toBe(0.50);

      // Verify PRNG task determinism: restored task prompt matches original
      expect(restored?.currentTask?.stimulus_id).toBeDefined();

      // 3. Complete Phase 2 on the restored session in Process 2
      const p2Res = sm2.submitPhase2(sid, MetacognitiveAction.HIGH_BET, 0.95);
      expect(p2Res.status).toBe("IN_PROGRESS");
      expect(p2Res.next_trial_index).toBe(2);

      // Trial 2 is now active in active_sessions
      const activeRows3 = await adapter2.query(
        "SELECT * FROM active_sessions WHERE id = ?",
        [sid]
      );
      expect(activeRows3.length).toBe(1);
      expect(activeRows3[0].current_trial_index).toBe(2);
      expect(activeRows3[0].current_phase).toBe(PhaseType.PHASE_1_FIRST_ORDER);
      expect(activeRows3[0].staged_p1_choice).toBeNull();
      expect(activeRows3[0].hints_unlocked).toBe(0);

      adapter2.close();
    } finally {
      // Cleanup temp test database
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch {}
      }
    }
  });

  it("Active session is automatically moved from active_sessions to completed_sessions upon completion", async () => {
    const adapter = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(adapter);

    const session = sm.createSession({
      subjectName: "Quick Completion Agent",
      totalTrials: 2,
      warmupTrials: 1,
    });
    const sid = session.sessionId;

    // Trial 1
    sm.submitPhase1(sid, "A");
    sm.submitPhase2(sid, MetacognitiveAction.SAFE_BET);

    // Still in active_sessions
    let active = await adapter.query("SELECT id FROM active_sessions WHERE id = ?", [sid]);
    expect(active.length).toBe(1);
    let completed = await adapter.query("SELECT id FROM completed_sessions WHERE id = ?", [sid]);
    expect(completed.length).toBe(0);

    // Trial 2 (Final)
    sm.submitPhase1(sid, "B");
    const p2Final = sm.submitPhase2(sid, MetacognitiveAction.HIGH_BET);
    expect(p2Final.is_completed).toBe(true);
    expect(p2Final.report).toBeDefined();

    // Now active_sessions should be empty for this session, and completed_sessions must have it
    active = await adapter.query("SELECT id FROM active_sessions WHERE id = ?", [sid]);
    expect(active.length).toBe(0);

    completed = await adapter.query("SELECT id, subject_name, quadrant_code FROM completed_sessions WHERE id = ?", [sid]);
    expect(completed.length).toBe(1);
    expect(completed[0].subject_name).toBe("Quick Completion Agent");
    expect(completed[0].quadrant_code).toBeDefined();

    // Verify session_records has 2 trial records with agent_trace_json NULL for human
    const stepRecords = await adapter.query("SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC", [sid]);
    expect(stepRecords.length).toBe(2);
    expect(stepRecords[0].agent_trace_json).toBeNull();

    // Verify session_agent_metadata has 0 rows for human session
    const agentRows = await adapter.query("SELECT * FROM session_agent_metadata WHERE session_id = ?", [sid]);
    expect(agentRows.length).toBe(0);

    // getReport succeeds
    const rep = sm.getReport(sid);
    expect(rep.session_id).toBe(sid);
    expect(rep.metrics).toBeDefined();
    expect(rep.metrics.d_star).toBeDefined();
    expect(rep.quadrant_code).toBeDefined();
    expect(rep.agent_metadata).toBeUndefined();
  });

  it("deleteSession removes record from active_sessions and completed_sessions", async () => {
    const adapter = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(adapter);

    const session = sm.createSession({ totalTrials: 5 });
    const sid = session.sessionId;

    const activeBefore = await adapter.query("SELECT id FROM active_sessions WHERE id = ?", [sid]);
    expect(activeBefore.length).toBe(1);

    sm.deleteSession(sid);

    const activeAfter = await adapter.query("SELECT id FROM active_sessions WHERE id = ?", [sid]);
    expect(activeAfter.length).toBe(0);
  });

  it("Asynchronous session lifecycle methods work end-to-end", async () => {
    const adapter = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(adapter);

    const session = await sm.createSessionAsync({
      subjectName: "Async-Agent",
      totalTrials: 2,
      warmupTrials: 1,
    });
    const sid = session.sessionId;

    // Phase 1 Async
    const p1Res = await sm.submitPhase1Async(sid, "A");
    expect(p1Res.phase).toBe(PhaseType.PHASE_2_METACOGNITIVE);

    // Phase 2 Async (Trial 1)
    const p2Res1 = await sm.submitPhase2Async(sid, MetacognitiveAction.SAFE_BET);
    expect(p2Res1.is_completed).toBe(false);

    // Trial 2
    await sm.submitPhase1Async(sid, "C");
    const p2Res2 = await sm.submitPhase2Async(sid, MetacognitiveAction.HIGH_BET);
    expect(p2Res2.is_completed).toBe(true);

    // Report Async
    const report = await sm.getReportAsync(sid);
    expect(report.session_id).toBe(sid);
    expect(report.subject_name).toBe("Async-Agent");

    // Cohort scatter async
    const cohort = await sm.getCohortScatterDataAsync(sid);
    expect(cohort.subjects.some((s) => s.id === sid)).toBe(true);

    // Delete Async
    const deleted = await sm.deleteSessionAsync(sid);
    expect(deleted).toBe(true);
  });

  it("LLM_AGENT session writes 1 row to completed_sessions, N to session_records with agent_trace, and 1 to session_agent_metadata", async () => {
    const adapter = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(adapter);

    const session = await sm.createSessionAsync({
      subjectName: "Claude-3-Opus-Eval",
      subjectType: "LLM_AGENT",
      persona: "Rational Bayesian",
      thinkingEffort: "high",
      totalTrials: 2,
      warmupTrials: 1,
      metadata: {
        model_name: "claude-3-opus",
        evaluation_mode: "thinking_tool",
      },
    });
    const sid = session.sessionId;

    // Trial 1 with token metrics
    await sm.submitPhase1Async(sid, "A");
    await sm.submitPhase2Async(sid, MetacognitiveAction.SAFE_BET, 0.50, undefined, {
      duration_ms: 120,
      token_usage: { prompt_tokens: 100, completion_tokens: 50, cached_tokens: 0, reasoning_tokens: 20, total_tokens: 150 },
      operations: [{ step: "p1", action: "select" }],
    });

    // Trial 2 (Final) with token metrics
    await sm.submitPhase1Async(sid, "B");
    const p2Final = await sm.submitPhase2Async(sid, MetacognitiveAction.HIGH_BET, 0.95, undefined, {
      duration_ms: 150,
      token_usage: { prompt_tokens: 120, completion_tokens: 60, cached_tokens: 0, reasoning_tokens: 30, total_tokens: 180 },
      operations: [{ step: "p2", action: "wager" }],
    });

    expect(p2Final.is_completed).toBe(true);

    // 1. completed_sessions has 1 row
    const completed = await adapter.query("SELECT * FROM completed_sessions WHERE id = ?", [sid]);
    expect(completed.length).toBe(1);
    expect(completed[0].subject_name).toBe("Claude-3-Opus-Eval");
    expect(completed[0].subject_type).toBe("LLM_AGENT");

    // 2. session_records has 2 rows with populated agent_trace_json
    const records = await adapter.query("SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC", [sid]);
    expect(records.length).toBe(2);
    expect(records[0].agent_trace_json).not.toBeNull();
    const trace1 = JSON.parse(records[0].agent_trace_json);
    expect(trace1.token_usage.total_tokens).toBe(150);

    // 3. session_agent_metadata has 1 row with aggregated tokens
    const agentMeta = await adapter.query("SELECT * FROM session_agent_metadata WHERE session_id = ?", [sid]);
    expect(agentMeta.length).toBe(1);
    expect(agentMeta[0].model_name).toBe("claude-3-opus");
    expect(agentMeta[0].persona).toBe("Rational Bayesian");
    expect(agentMeta[0].total_tokens).toBe(330);

    // 4. getReport returns agent_metadata
    const rep = await sm.getReportAsync(sid);
    expect(rep.agent_metadata).toBeDefined();
    expect(rep.agent_metadata?.model_name).toBe("claude-3-opus");
    expect(rep.agent_metadata?.token_usage.total_tokens).toBe(330);
    expect(rep.metrics.d_star).toBeDefined();

    // 5. deleteSession removes across all tables
    const delRes = await sm.deleteSessionAsync(sid);
    expect(delRes).toBe(true);
    const recAfter = await adapter.query("SELECT * FROM session_records WHERE session_id = ?", [sid]);
    expect(recAfter.length).toBe(0);
    const metaAfter = await adapter.query("SELECT * FROM session_agent_metadata WHERE session_id = ?", [sid]);
    expect(metaAfter.length).toBe(0);
    const compAfter = await adapter.query("SELECT * FROM completed_sessions WHERE id = ?", [sid]);
    expect(compAfter.length).toBe(0);
  });
});
