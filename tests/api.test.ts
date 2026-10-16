import { describe, test, expect } from "bun:test";
import appDefault, { ADMIN_PASSWORD } from "../src/backend/server";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return appDefault.fetch(req);
};

describe("Hono REST API Suite", () => {
  let sessionId = "";

  test("POST /api/sessions/start creates a new session", async () => {
    const res = await fetchApp("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_name: "全栈Bun受测者",
        total_trials: 5,
        warmup_trials: 2,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session_id).toBeDefined();
    expect(data.trial_index).toBe(1);
    expect(data.payload.options).toBeDefined();
    sessionId = data.session_id;
  });

  test("POST /api/sessions/:id/hint purchases tier 1 and tier 2 hints", async () => {
    // 1st purchase: Tier 1, cost 1
    const res1 = await fetchApp(`/api/sessions/${sessionId}/hint`, {
      method: "POST",
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.hint).toBeDefined();
    expect(data1.cost).toBe(1);
    expect(data1.total_cost).toBe(1);
    expect(data1.next_tier_available).toBe(true);

    // 2nd purchase: Tier 2, cost 2, total 3
    const res2 = await fetchApp(`/api/sessions/${sessionId}/hint`, {
      method: "POST",
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.hint).toBeDefined();
    expect(data2.cost).toBe(2);
    expect(data2.total_cost).toBe(3);
    expect(data2.next_tier_available).toBe(false);
  });

  test("POST /api/sessions/:id/phase1 records choice", async () => {
    const res = await fetchApp(`/api/sessions/${sessionId}/phase1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice: "A" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.phase).toBe("PHASE_2_METACOGNITIVE");
  });

  test("POST /api/sessions/:id/phase2 advances trial", async () => {
    const res = await fetchApp(`/api/sessions/${sessionId}/phase2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "HIGH_BET",
        confidence_level: 0.9,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.next_trial_index).toBe(2);
    expect(data.is_completed).toBe(false);
  });

  test("POST /api/admin/verify validates admin password", async () => {
    // Valid password
    const resValid = await fetchApp("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: ADMIN_PASSWORD }),
    });
    const dataValid = await resValid.json();
    expect(dataValid.valid).toBe(true);

    // Invalid password
    const resInvalid = await fetchApp("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "wrong_password_123" }),
    });
    const dataInvalid = await resInvalid.json();
    expect(dataInvalid.valid).toBe(false);
  });

  test("Completing all trials returns report and repeat submission is idempotent", async () => {
    // Current trial is 2 (total is 5)
    for (let t = 2; t <= 5; t++) {
      const p1 = await fetchApp(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "A" }),
      });
      expect(p1.status).toBe(200);

      const p2 = await fetchApp(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "HIGH_BET", confidence_level: 0.9 }),
      });
      expect(p2.status).toBe(200);
      const data2 = await p2.json();

      if (t === 5) {
        expect(data2.is_completed).toBe(true);
        expect(data2.report).toBeDefined();
        expect(data2.report.diagnostic_profile.role_title).toBeDefined();
      }
    }

    // Repeated call to phase1 on completed session should succeed idempotently
    const repP1 = await fetchApp(`/api/sessions/${sessionId}/phase1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice: "A" }),
    });
    expect(repP1.status).toBe(200);
    const repP1Data = await repP1.json();
    expect(repP1Data.is_completed).toBe(true);
    expect(repP1Data.report).toBeDefined();

    // Repeated call to phase2 on completed session should succeed idempotently
    const repP2 = await fetchApp(`/api/sessions/${sessionId}/phase2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "HIGH_BET" }),
    });
    expect(repP2.status).toBe(200);
    const repP2Data = await repP2.json();
    expect(repP2Data.is_completed).toBe(true);
    expect(repP2Data.report).toBeDefined();
  });
});

