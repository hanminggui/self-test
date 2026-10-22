import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import appDefault, {
  sessionManager,
  userManager,
  oauthService,
} from "../src/backend/server";
import { LocalSqliteAdapter } from "../src/storage";
import { createAuthToken, verifyAuthToken, JWT_SECRET } from "../src/backend/auth/jwt";
import { User } from "../src/storage/user";
import { SubjectType, MetacognitiveAction } from "../src/backend/models";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return appDefault.fetch(req);
};

describe("GitHub Issue #13: Personal Test History & Trajectory Dashboard", () => {
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    // 1. Create two test users with unique provider IDs
    const uidA = crypto.randomUUID();
    const uidB = crypto.randomUUID();
    userA = await userManager.upsertUser({
      primary_provider: "github",
      provider_id: `gh-user-a-${uidA}`,
      email: `usera-${uidA}@example.com`,
      display_name: "Alice Arcanist",
      avatar_url: "https://example.com/avatar-a.png",
      metadata: { role: "researcher" },
    });

    userB = await userManager.upsertUser({
      primary_provider: "linuxdo",
      provider_id: `ld-user-b-${uidB}`,
      email: `userb-${uidB}@example.com`,
      display_name: "Bob Builder",
      avatar_url: "https://example.com/avatar-b.png",
      metadata: { trust_level: 2 },
    });

    tokenA = await createAuthToken(userA);
    tokenB = await createAuthToken(userB);
  });

  describe("1. /api/me/sessions Endpoint & Authentication Decoupling", () => {
    test("GET /api/me/sessions returns 401 Unauthorized when unauthenticated", async () => {
      const res = await fetchApp("/api/me/sessions");
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    test("GET /api/me/sessions succeeds with Bearer token without requiring any admin credentials", async () => {
      const res = await fetchApp("/api/me/sessions", {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(userA.id);
      expect(data.user.display_name).toBe("Alice Arcanist");
      expect(Array.isArray(data.sessions)).toBe(true);
    });

    test("GET /api/me/sessions succeeds with HttpOnly cookie", async () => {
      const res = await fetchApp("/api/me/sessions", {
        headers: {
          Cookie: `auth_token=${tokenB}`,
        },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe(userB.id);
      expect(data.user.display_name).toBe("Bob Builder");
    });

    test("Access is decoupled from admin password (no token= query or admin password required)", async () => {
      // Normal user request without admin password
      const res = await fetchApp("/api/me/sessions", {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(res.status).toBe(200);

      // Verify that admin routes still reject this token without admin password
      const adminRes = await fetchApp("/api/admin/sessions", {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(adminRes.status).toBe(401);
    });
  });

  describe("2. Personal Session Lifecycle & Multi-Tenant Isolation", () => {
    test("Sessions started and completed by User A are correctly returned in /api/me/sessions and isolated from User B", async () => {
      // Step A: Start and complete Session 1 for User A
      const startRes1 = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          subject_name: "Alice Session 1",
          total_trials: 3,
          warmup_trials: 1,
        }),
      });
      expect(startRes1.status).toBe(200);
      const startData1 = await startRes1.json();
      const sessionId1 = startData1.session_id;

      // Complete all 3 trials
      for (let t = 0; t < 3; t++) {
        await fetchApp(`/api/sessions/${sessionId1}/phase1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice: "A" }),
        });
        await fetchApp(`/api/sessions/${sessionId1}/phase2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: MetacognitiveAction.HIGH_BET,
            confidence_level: 0.9,
          }),
        });
      }

      // Step B: Start and complete Session 2 for User A (an Agent session)
      const startRes2 = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          subject_name: "Alice Agent Run",
          subject_type: SubjectType.LLM_AGENT,
          total_trials: 3,
          warmup_trials: 1,
          persona: "Cautious Analyst",
          thinking_effort: "high",
        }),
      });
      expect(startRes2.status).toBe(200);
      const startData2 = await startRes2.json();
      const sessionId2 = startData2.session_id;

      for (let t = 0; t < 3; t++) {
        await fetchApp(`/api/sessions/${sessionId2}/phase1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice: "B" }),
        });
        await fetchApp(`/api/sessions/${sessionId2}/phase2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: MetacognitiveAction.SAFE_BET,
            confidence_level: 0.5,
          }),
        });
      }

      // Step C: Verify User A sees both sessions in /api/me/sessions
      const meResA = await fetchApp("/api/me/sessions", {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(meResA.status).toBe(200);
      const meDataA = await meResA.json();
      expect(meDataA.sessions.length).toBe(2);

      const s1 = meDataA.sessions.find((s: any) => s.id === sessionId1);
      const s2 = meDataA.sessions.find((s: any) => s.id === sessionId2);
      expect(s1).toBeDefined();
      expect(s2).toBeDefined();

      // Check fields for timeline and 4D trajectory
      expect(s1.role_title).toBeDefined();
      expect(typeof s1.role_title).toBe("string");
      expect(s1.quadrant_code).toBeDefined();
      expect(s1.metrics).toBeDefined();
      expect(s1.metrics.first_order_accuracy).toBeDefined();
      expect(s1.metrics.d_prime).toBeDefined();
      expect(s1.metrics.m_ratio).toBeDefined();
      expect(s1.metrics.calibration_bias).toBeDefined();
      expect(s1.cognitive_manifold_vector).toBeDefined();
      expect(s1.cognitive_manifold_vector.length).toBe(4);

      // Verify Agent session includes agent attributes
      expect(s2.subject_type).toBe(SubjectType.LLM_AGENT);

      // Step D: Verify User B has 0 sessions (complete isolation)
      const meResB = await fetchApp("/api/me/sessions", {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      });
      expect(meResB.status).toBe(200);
      const meDataB = await meResB.json();
      expect(meDataB.sessions.length).toBe(0);
    });

    test("Dynamic i18n localization works for /api/me/sessions", async () => {
      // Create and complete 1 session for userA
      const startRes = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          subject_name: "Localization Test",
          total_trials: 1,
          warmup_trials: 0,
        }),
      });
      const startData = await startRes.json();
      const sId = startData.session_id;

      await fetchApp(`/api/sessions/${sId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "A" }),
      });
      await fetchApp(`/api/sessions/${sId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: MetacognitiveAction.HIGH_BET,
          confidence_level: 0.9,
        }),
      });

      // Query with English locale
      const enRes = await fetchApp("/api/me/sessions?lang=en-US", {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });
      expect(enRes.status).toBe(200);
      const enData = await enRes.json();
      expect(enData.sessions.length).toBe(1);
      // In English, role title should be Western Arcane format
      const englishSession = enData.sessions[0];
      expect(englishSession.role_title).toBeDefined();
      expect(typeof englishSession.role_title).toBe("string");
    });
  });

  describe("3. Frontend Routing & SPA Serving", () => {
    test("GET /me serves index.html for SPA client entry", async () => {
      const res = await fetchApp("/me");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('id="root"');
    });

    test("GET /me/history serves index.html as nested SPA route", async () => {
      const res = await fetchApp("/me/history");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("<!DOCTYPE html>");
    });
  });
});
