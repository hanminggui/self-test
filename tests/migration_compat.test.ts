import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { LocalSqliteAdapter } from "../src/storage/local_sqlite";
import { SessionManager } from "../src/backend/session_manager";
import { SubjectType } from "../src/backend/models";

describe("Database Migration & Historical Data Compatibility", () => {
  const testDbDir = path.resolve(process.cwd(), "data", "test_migration");
  const testDbPath = path.join(testDbDir, "legacy_test.sqlite");

  beforeEach(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  it("平滑升级拥有老字段与老数据 (full_report_json) 的旧版数据库至 v2.3 规范，数据与试次零丢失", async () => {
    // 1. 创建并初始化一个旧版 (PR #29) 结构的 SQLite 数据库
    const { Database } = await import("bun:sqlite");
    const oldDb = new Database(testDbPath);

    // 执行 PR #29 的原始 0001_init.sql
    oldDb.exec(`
      CREATE TABLE completed_sessions (
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

      CREATE TABLE active_sessions (
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

      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT,
        display_name TEXT,
        avatar_url TEXT,
        primary_provider TEXT,
        created_at TEXT,
        updated_at TEXT,
        metadata_json TEXT
      );
    `);

    // 2. 插入一条真实的老版测试记录 (带 3 个试次的 full_report_json)
    const mockLegacyReport = {
      session_id: "sess_legacy_001",
      subject_name: "老受测者张三",
      subject_type: SubjectType.HUMAN,
      final_score: 95,
      records: [
        {
          trial_index: 1,
          is_warmup: true,
          difficulty_level: 0.5,
          stimulus_id: "q1",
          correct_option: "A",
          first_order_choice: "A",
          is_correct_first_order: true,
          is_correct_final: true,
          action: "SAFE_BET",
          confidence_level: 0.5,
          hints_unlocked: 0,
          score_delta: 3,
          duration_ms: 1200,
        },
        {
          trial_index: 2,
          is_warmup: false,
          difficulty_level: 0.45,
          stimulus_id: "q2",
          correct_option: "B",
          first_order_choice: "B",
          is_correct_first_order: true,
          is_correct_final: true,
          action: "HIGH_BET",
          confidence_level: 0.8,
          hints_unlocked: 1,
          score_delta: 9,
          duration_ms: 1500,
        },
      ],
    };

    oldDb.run(
      `INSERT INTO completed_sessions (
        id, name, subject_type, first_order_accuracy, second_order_accuracy,
        d_prime, meta_d_prime, m_ratio, calibration_bias, final_score,
        created_at, role_title, quadrant_code, full_report_json, d_star, ive,
        clinical_summary, total_duration_ms, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "sess_legacy_001",
        "老受测者张三",
        SubjectType.HUMAN,
        0.85,
        0.80,
        1.5,
        1.4,
        0.93,
        0.05,
        95,
        "2026-10-18 12:00:00",
        "战略家",
        "Q1-CAL",
        JSON.stringify(mockLegacyReport),
        0.52,
        0.65,
        "认知对齐良好",
        2700,
        "usr_123",
      ]
    );

    oldDb.close();

    // 3. 用 LocalSqliteAdapter 打开这个已存在老结构老数据的数据库，并启动 SessionManager
    const adapter = new LocalSqliteAdapter(testDbPath);
    const sm = new SessionManager(adapter);

    // 4. 验证散点群体数据：老数据正常被查出，且字段完整
    const scatter = sm.getCohortScatterData(undefined, "zh-CN");
    expect(scatter.subjects.length).toBe(1);
    const subject = scatter.subjects[0];
    expect(subject.id).toBe("sess_legacy_001");
    expect(subject.name).toBe("老受测者张三");
    expect(subject.quadrant_code).toBe("Q1-CAL");
    expect(subject.final_score).toBe(95);
    expect(subject.user_id).toBe("usr_123");

    // 5. 验证 4 表正规化数据：试次数据是否自动被搬运进入了 session_records 表！
    const records = adapter.querySync<any>("SELECT * FROM session_records WHERE session_id = ? ORDER BY trial_index ASC", ["sess_legacy_001"]);
    expect(records.length).toBe(2);
    expect(records[0].trial_index).toBe(1);
    expect(records[0].first_order_choice).toBe("A");
    expect(records[1].trial_index).toBe(2);
    expect(records[1].action).toBe("HIGH_BET");

    // 6. 验证 getReport 能从正规化表中无缝加载完整试次清单
    const report = sm.getReport("sess_legacy_001", "zh-CN");
    expect(report).toBeDefined();
    expect(report?.records.length).toBe(2);
    expect(report?.records[0].correct_option).toBe("A");

    // 7. 测试 LLM Agent 历史数据的自动迁移与 Token 账单
    adapter.runSync(
      `INSERT INTO completed_sessions (
        id, name, subject_type, first_order_accuracy, second_order_accuracy,
        d_prime, meta_d_prime, m_ratio, calibration_bias, final_score,
        created_at, role_title, quadrant_code, full_report_json, d_star, ive,
        clinical_summary, total_duration_ms, persona, thinking_effort, token_usage_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "sess_agent_002",
        "deepseek-r1",
        SubjectType.LLM_AGENT,
        0.75,
        0.70,
        1.2,
        1.1,
        0.88,
        -0.02,
        88,
        "2026-10-18 13:00:00",
        "精算先锋",
        "Q3-CON",
        JSON.stringify({
          session_id: "sess_agent_002",
          subject_name: "deepseek-r1",
          subject_type: SubjectType.LLM_AGENT,
          records: [
            {
              trial_index: 1,
              is_warmup: false,
              difficulty_level: 0.5,
              correct_option: "C",
              first_order_choice: "C",
              is_correct_first_order: true,
              is_correct_final: true,
              action: "HIGH_BET",
              confidence_level: 0.9,
              score_delta: 10,
              token_usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
            },
          ],
        }),
        0.48,
        0.55,
        "稳健决策",
        1500,
        "标准思考人设",
        "high",
        JSON.stringify({
          prompt_tokens: 100,
          completion_tokens: 50,
          cached_tokens: 0,
          reasoning_tokens: 40,
          total_tokens: 150,
        }),
      ]
    );

    // 再次触发热迁移
    adapter.ensureSchema();

    const agentMeta = adapter.querySync<any>("SELECT * FROM session_agent_metadata WHERE session_id = ?", ["sess_agent_002"]);
    expect(agentMeta.length).toBe(1);
    expect(agentMeta[0].model_name).toBe("deepseek-r1");
    expect(agentMeta[0].total_tokens).toBe(150);
    expect(agentMeta[0].reasoning_tokens).toBe(40);

    const agentRecs = adapter.querySync<any>("SELECT * FROM session_records WHERE session_id = ?", ["sess_agent_002"]);
    expect(agentRecs.length).toBe(1);
    expect(agentRecs[0].agent_trace_json).toContain("promptTokens");
  });
});
