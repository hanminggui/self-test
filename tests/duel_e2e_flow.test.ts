import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { app } from "../src/backend/server";
import { SessionManager } from "../src/backend/session_manager";
import { MetacognitiveAction, SubjectType } from "../src/backend/models";
import { generateDuelShareText } from "../src/frontend/components/share/duelPosterGenerator";
import * as fs from "fs";
import * as path from "path";

describe("Cognitive Twin Duel End-to-End Viral Flow (Issue #16)", () => {
  const testDb = path.resolve(process.cwd(), "tests", "test_duel_e2e.db");

  beforeEach(() => {
    if (fs.existsSync(testDb)) {
      try { fs.unlinkSync(testDb); } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDb)) {
      try { fs.unlinkSync(testDb); } catch {}
    }
  });

  it("Completes full viral duel loop from share entry to duel report and joint poster", async () => {
    const sm = new SessionManager();

    // 1. Friend A completes assessment
    const sessionA = await sm.createSessionAsync({
      subjectType: SubjectType.HUMAN,
      subjectName: "StarLord_A",
      totalTrials: 2,
      warmupTrials: 0,
      initialDelta: 0.5,
    });
    const idA = sessionA.sessionId;
    await sm.submitPhase1Async(idA, "A");
    await sm.submitPhase2Async(idA, MetacognitiveAction.HIGH_BET, 0.95);
    await sm.submitPhase1Async(idA, "B");
    const reportA = await sm.submitPhase2Async(idA, MetacognitiveAction.HIGH_BET, 0.9);
    expect(reportA.session_id).toBe(idA);

    // 2. Visitor lands on share page of Friend A (/share/:idA)
    const sharePageRes = await app.request(`/share/${idA}?lang=zh-CN`);
    expect(sharePageRes.status).toBe(200);
    const shareHtml = await sharePageRes.text();
    expect(shareHtml).toContain("StarLord_A");

    // 3. Visitor enters duel: starts new session with referrer_session_id = idA
    const startRes = await app.request("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_name: "Challenger_B",
        referrer_session_id: idA,
        total_trials: 2,
        warmup_trials: 0,
      }),
    });
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    const idB = startData.session_id;

    // 4. Visitor B completes their assessment
    await sm.submitPhase1Async(idB, "C");
    await sm.submitPhase2Async(idB, MetacognitiveAction.SAFE_BET, 0.7);
    await sm.submitPhase1Async(idB, "D");
    const reportB = await sm.submitPhase2Async(idB, MetacognitiveAction.BUY_HINT, 0.6);
    expect(reportB.session_id).toBe(idB);

    // Verify referrer_session_id is tracked on session B
    const sessionB = await sm.getSessionAsync(idB);
    expect(sessionB?.metadata?.referrer_session_id).toBe(idA);

    // 5. Query duel API endpoint (/api/duel/:idA/:idB)
    const duelApiRes = await app.request(`/api/duel/${idA}/${idB}?lang=zh-CN`);
    expect(duelApiRes.status).toBe(200);
    const duelData = await duelApiRes.json();

    expect(duelData.sessionA.subject_name).toBe("StarLord_A");
    expect(duelData.sessionB.subject_name).toBe("Challenger_B");

    const comp = duelData.comparison;
    expect(comp.euclidean_distance).toBeGreaterThanOrEqual(0);
    expect(comp.similarity_percentage).toBeGreaterThan(0);
    expect(comp.similarity_percentage).toBeLessThanOrEqual(100);
    expect(comp.cognitive_alignment_score).toBe(comp.similarity_percentage);
    expect(comp.complementary_index).toBeGreaterThan(0);
    expect(comp.synergy_title).toBeDefined();
    expect(comp.pairing_dynamics.length).toBeGreaterThan(10);
    expect(comp.mutual_strengths.length).toBeGreaterThanOrEqual(2);
    expect(comp.mutual_differences.length).toBeGreaterThanOrEqual(1);

    // 6. Access duel permalink page (/duel/:idA/:idB)
    const duelPageRes = await app.request(`/duel/${idA}/${idB}?lang=zh-CN`);
    expect(duelPageRes.status).toBe(200);
    const duelHtml = await duelPageRes.text();
    expect(duelHtml).toContain('property="og:title"');
    expect(duelHtml).toContain("StarLord_A");
    expect(duelHtml).toContain("Challenger_B");
    expect(duelHtml).toContain(`${comp.similarity_percentage}%`);

    // 7. Forum share text generation
    const shareText = generateDuelShareText({
      participantA: {
        sessionId: idA,
        subjectName: "StarLord_A",
        archetype: reportA.archetype,
        roleTitle: reportA.diagnostic_profile?.role_title,
      },
      participantB: {
        sessionId: idB,
        subjectName: "Challenger_B",
        archetype: reportB.archetype,
        roleTitle: reportB.diagnostic_profile?.role_title,
      },
      comparison: comp,
      locale: "zh-CN",
      entryUrl: `https://self-test.app/duel/${idA}/${idB}`,
    });

    expect(shareText).toContain("双星认知对决");
    expect(shareText).toContain("StarLord_A");
    expect(shareText).toContain("Challenger_B");
    expect(shareText).toContain(`${comp.similarity_percentage}%`);
    expect(shareText).toContain(comp.synergy_title);
    expect(shareText).toContain(`/duel/${idA}/${idB}`);
  });
});
