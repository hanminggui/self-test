import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { app } from "../src/backend/server";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, SubjectType } from "../src/backend/models";
import * as fs from "fs";
import * as path from "path";

describe("Seam 2: Referrer Session Tracking & Duel API Backend", () => {
  const testDbPath = path.resolve(process.cwd(), "tests", "test_duel_backend.db");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  async function completeMinimalSession(sm: SessionManager, referrerId?: string) {
    const session = await sm.createSessionAsync({
      subjectType: SubjectType.HUMAN,
      subjectName: "Duelist_" + Math.random().toString(36).substring(2, 6),
      totalTrials: 2,
      warmupTrials: 0,
      initialDelta: 0.5,
      metadata: referrerId ? { referrer_session_id: referrerId } : {},
    });

    const sid = session.sessionId;

    // Trial 1
    await sm.submitPhase1Async(sid, "A");
    await sm.submitPhase2Async(sid, MetacognitiveAction.HIGH_BET, 0.9, undefined, { duration_ms: 500 });

    // Trial 2
    await sm.submitPhase1Async(sid, "B");
    const finalReport = await sm.submitPhase2Async(sid, MetacognitiveAction.SAFE_BET, 0.6, undefined, { duration_ms: 500 });

    return { sessionId: sid, report: finalReport };
  }

  it("POST /api/sessions/start tracks and stores referrer_session_id", async () => {
    const referrerId = "sess_referrer_12345";
    const res = await app.request("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer_session_id: referrerId,
        subject_name: "Challenger",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session_id).toBeDefined();

    // Verify session state has referrer recorded
    const sm = new SessionManager();
    const session = await sm.getSessionAsync(data.session_id);
    expect(session?.metadata?.referrer_session_id).toBe(referrerId);
  });

  it("GET /api/duel/:idA/:idB returns 404 when either session is not found", async () => {
    const res = await app.request("/api/duel/nonexistent_a/nonexistent_b");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("GET /api/duel/:idA/:idB returns full duel comparison when both sessions exist", async () => {
    const sm = new SessionManager();
    const s1 = await completeMinimalSession(sm);
    const s2 = await completeMinimalSession(sm, s1.sessionId);

    const res = await app.request(`/api/duel/${s1.sessionId}/${s2.sessionId}?lang=zh-CN`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.sessionA).toBeDefined();
    expect(body.sessionA.id).toBe(s1.sessionId);
    expect(body.sessionB).toBeDefined();
    expect(body.sessionB.id).toBe(s2.sessionId);

    expect(body.comparison).toBeDefined();
    expect(body.comparison.euclidean_distance).toBeDefined();
    expect(body.comparison.similarity_percentage).toBeGreaterThan(0);
    expect(body.comparison.cognitive_alignment_score).toBe(body.comparison.similarity_percentage);
    expect(body.comparison.synergy_title).toBeDefined();
    expect(body.comparison.pairing_dynamics).toBeDefined();
    expect(body.comparison.mutual_strengths.length).toBeGreaterThan(0);
  });

  it("GET /duel/:idA/:idB serves HTML with dynamic OpenGraph meta tags", async () => {
    const sm = new SessionManager();
    const s1 = await completeMinimalSession(sm);
    const s2 = await completeMinimalSession(sm, s1.sessionId);

    const res = await app.request(`/duel/${s1.sessionId}/${s2.sessionId}?lang=zh-CN`);
    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('id="root"');
  });
});
