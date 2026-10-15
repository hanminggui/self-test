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

  test("POST /api/sessions/:id/hint purchases hint", async () => {
    const res = await fetchApp(`/api/sessions/${sessionId}/hint`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hint).toBeDefined();
    expect(data.hint_cost).toBe(2);
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

  test("GET /api/admin/sessions returns cohort records", async () => {
    const res = await fetchApp("/api/admin/sessions");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessions).toBeDefined();
    expect(Array.isArray(data.sessions)).toBe(true);
  });
});
