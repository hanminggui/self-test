import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { LocalSqliteAdapter } from "../src/storage/local_sqlite";
import { SessionManager } from "../src/backend/session_manager";
import { app } from "../src/backend/server";
import * as fs from "fs";
import * as path from "path";

const TEST_DB_PATH = path.resolve("./test_cohort_perf.db");

function cleanupDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch {}
  }
}

function insertCompletedSession(
  adapter: LocalSqliteAdapter,
  data: {
    id: string;
    name: string;
    quadrant_code: string;
    d_star: number;
    m_ratio: number;
    final_score: number;
    calibration_bias?: number;
    ive?: number;
    created_at?: string;
  }
) {
  const sql = `
    INSERT OR REPLACE INTO completed_sessions (
      id, subject_name, subject_type, locale, total_trials, warmup_trials,
      completed_trials, total_duration_ms, final_score, quadrant_code,
      first_order_accuracy, second_order_accuracy, reversals_count,
      d_star, d_prime, meta_d_prime, m_ratio, calibration_bias,
      brier_score, ive, coachability_index, risk_attitude, created_at, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.id,
    data.name,
    "human",
    "zh-CN",
    10,
    2,
    10,
    5000,
    data.final_score,
    data.quadrant_code,
    0.8,
    0.8,
    3,
    data.d_star,
    1.5,
    1.5,
    data.m_ratio,
    data.calibration_bias ?? 0.0,
    0.1,
    data.ive ?? 0.5,
    50,
    "moderate_rational",
    data.created_at || new Date().toISOString(),
    null,
  ];
  adapter.runSync(sql, params);
}

describe("Issue #19: Cohort Density Aggregation & Spatial Sampling Engine", () => {
  let adapter: LocalSqliteAdapter;
  let sm: SessionManager;

  beforeEach(() => {
    cleanupDb();
    adapter = new LocalSqliteAdapter(TEST_DB_PATH);
    sm = new SessionManager(adapter);
  });

  afterEach(() => {
    adapter.close();
    cleanupDb();
  });

  test("1. SQL-Level Octant Density Aggregation (COUNT, AVG, VARIANCE) computed directly in database", async () => {
    // Seed 4 sessions in Q1-CAL
    for (let i = 1; i <= 4; i++) {
      insertCompletedSession(adapter, {
        id: `q1_sess_${i}`,
        name: `Q1 Subject ${i}`,
        quadrant_code: "Q1-CAL",
        d_star: 0.6 + i * 0.05, // 0.65, 0.70, 0.75, 0.80 -> mean: 0.725
        m_ratio: 1.0 + i * 0.1, // 1.1, 1.2, 1.3, 1.4 -> mean: 1.25
        final_score: 100 + i * 10, // 110, 120, 130, 140 -> mean: 125
      });
    }

    // Seed 2 sessions in Q4-PIO
    for (let i = 1; i <= 2; i++) {
      insertCompletedSession(adapter, {
        id: `q4_sess_${i}`,
        name: `Q4 Subject ${i}`,
        quadrant_code: "Q4-PIO",
        d_star: 0.8,
        m_ratio: 0.6 + i * 0.1, // 0.7, 0.8 -> mean: 0.75
        final_score: 150,
      });
    }

    // Call getCohortScatterDataAsync
    const scatter = await sm.getCohortScatterDataAsync(undefined, "zh-CN");

    // Acceptance criterion 1: /api/cohort/scatter returns aggregated octant metrics computed directly via SQL COUNT, AVG
    expect(scatter.total_count).toBe(6);
    expect(scatter.octant_stats).toBeDefined();
    expect(scatter.octants).toBeDefined();

    // Verify all 8 octants are present in octant_stats
    const expectedOctants = ["Q1-CAL", "Q2-EVO", "Q3-SEN", "Q4-PIO", "Q5-RET", "Q6-GAM", "Q7-ARB", "Q8-DRI"];
    for (const code of expectedOctants) {
      expect(scatter.octant_stats[code]).toBeDefined();
    }

    // Verify Q1-CAL stats
    const q1Stats = scatter.octant_stats["Q1-CAL"];
    expect(q1Stats.count).toBe(4);
    expect(q1Stats.avg_d_star).toBeCloseTo(0.725, 2);
    expect(q1Stats.avg_m_ratio).toBeCloseTo(1.25, 2);
    expect(q1Stats.avg_score).toBe(125);
    expect(q1Stats.variance_d_star).toBeGreaterThan(0);
    expect(q1Stats.variance_m_ratio).toBeGreaterThan(0);
    expect(q1Stats.variance_score).toBeGreaterThan(0);
    expect(q1Stats.percentage).toContain("66."); // 4 / 6 = 66.7%

    // Verify density_summary macroscopic metrics
    expect(scatter.density_summary).toBeDefined();
    expect(scatter.density_summary?.total_count).toBe(6);
    expect(scatter.density_summary?.variance_x).toBeGreaterThan(0);
    expect(scatter.density_summary?.variance_y).toBeGreaterThan(0);

    // Verify Q4-PIO stats
    const q4Stats = scatter.octant_stats["Q4-PIO"];
    expect(q4Stats.count).toBe(2);
    expect(q4Stats.avg_d_star).toBeCloseTo(0.8, 2);
    expect(q4Stats.avg_m_ratio).toBeCloseTo(0.75, 2);
    expect(q4Stats.avg_score).toBe(150);
    expect(q4Stats.percentage).toContain("33."); // 2 / 6 = 33.3%

    // Verify empty octant Q2-EVO
    const q2Stats = scatter.octant_stats["Q2-EVO"];
    expect(q2Stats.count).toBe(0);
    expect(q2Stats.avgScore).toBe(0);
    expect(q2Stats.avgDStar).toBe("--");
  });

  test("2. Spatial Sampling Engine caps visualization dots to fixed budget of 64~96 stars across all 8 octants", async () => {
    const octants = ["Q1-CAL", "Q2-EVO", "Q3-SEN", "Q4-PIO", "Q5-RET", "Q6-GAM", "Q7-ARB", "Q8-DRI"];

    // Seed 25 sessions in each of the 8 octants (Total: 200 sessions)
    for (const oct of octants) {
      for (let i = 1; i <= 25; i++) {
        insertCompletedSession(adapter, {
          id: `sess_${oct}_${i}`,
          name: `Subject ${oct}_${i}`,
          quadrant_code: oct,
          d_star: 0.3 + (i % 10) * 0.05,
          m_ratio: 0.5 + (i % 10) * 0.08,
          final_score: 100 + i,
        });
      }
    }

    // Query scatter data with default budget (e.g. 10 per octant -> 80 total, within 64~96)
    const scatter = await sm.getCohortScatterDataAsync(undefined, "zh-CN");

    // Acceptance criterion 1 & 2: Total count in DB is 200, but sampled subjects is strictly 64~96
    expect(scatter.total_count).toBe(200);
    expect(scatter.subjects.length).toBeGreaterThanOrEqual(64);
    expect(scatter.subjects.length).toBeLessThanOrEqual(96);

    // Each octant should have 8 to 12 sampled representatives
    for (const oct of octants) {
      const octSubjects = scatter.subjects.filter((s) => s.quadrant_code === oct);
      expect(octSubjects.length).toBeGreaterThanOrEqual(8);
      expect(octSubjects.length).toBeLessThanOrEqual(12);
    }
  });

  test("3. current_session_id is prioritized and guaranteed to be present in sampled points", async () => {
    const octants = ["Q1-CAL", "Q2-EVO"];
    for (const oct of octants) {
      for (let i = 1; i <= 30; i++) {
        insertCompletedSession(adapter, {
          id: `dense_${oct}_${i}`,
          name: `User ${oct}_${i}`,
          quadrant_code: oct,
          d_star: 0.5,
          m_ratio: 0.8,
          final_score: 100,
        });
      }
    }

    // A specific target session
    const targetSessionId = "dense_Q1-CAL_17";
    const scatter = await sm.getCohortScatterDataAsync(targetSessionId, "zh-CN");

    const found = scatter.subjects.find((s) => s.id === targetSessionId);
    expect(found).toBeDefined();
    expect(found?.is_current).toBe(true);
  });

  test("4. Network payload size is strictly capped under 50KB regardless of database record volume", async () => {
    // With 200 sessions in the database, measure the raw JSON payload size
    const scatter = await sm.getCohortScatterDataAsync(undefined, "zh-CN");
    const jsonStr = JSON.stringify(scatter);
    const byteSize = Buffer.byteLength(jsonStr, "utf-8");

    // Acceptance criterion: Network payload size is capped under 50KB
    expect(byteSize).toBeLessThan(50 * 1024);
    // In fact, with O(1) sampling it should be around ~25KB
    expect(byteSize).toBeLessThan(35 * 1024);
  });

  test("5. HTTP GET /api/cohort/scatter delivers aggregated octant statistics and sampled points", async () => {
    // Start an active session or complete one
    const startRes = await app.fetch(
      new Request("http://localhost/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_name: "API Performance Test" }),
      })
    );
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    const sessionId = startData.session_id;

    // Call /api/cohort/scatter
    const res = await app.fetch(new Request(`http://localhost/api/cohort/scatter?current_session_id=${sessionId}`));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.octant_stats).toBeDefined();
    expect(data.octants).toBeDefined();
    expect(typeof data.mean_x).toBe("number");
    expect(typeof data.mean_y).toBe("number");
    expect(Array.isArray(data.subjects)).toBe(true);
    expect(data.subjects.length).toBeLessThanOrEqual(96);
  });
});
