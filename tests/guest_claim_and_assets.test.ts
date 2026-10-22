import { describe, test, expect, beforeEach } from "bun:test";
import appDefault, { userManager } from "../src/backend/server";
import { createAuthToken } from "../src/backend/auth/jwt";
import { User } from "../src/storage/user";
import { MetacognitiveAction } from "../src/backend/models";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return appDefault.fetch(req);
};

describe("Guest Unclaimed Session Claiming & Cognitive Assets API", () => {
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    const uidA = crypto.randomUUID();
    const uidB = crypto.randomUUID();
    userA = await userManager.upsertUser({
      primary_provider: "github",
      provider_id: `gh-claim-a-${uidA}`,
      email: `claim-a-${uidA}@example.com`,
      display_name: "Explorer Alice",
      avatar_url: "https://example.com/alice.png",
    });

    userB = await userManager.upsertUser({
      primary_provider: "linuxdo",
      provider_id: `ld-claim-b-${uidB}`,
      email: `claim-b-${uidB}@example.com`,
      display_name: "Explorer Bob",
      avatar_url: "https://example.com/bob.png",
    });

    tokenA = await createAuthToken(userA);
    tokenB = await createAuthToken(userB);
  });

  test("POST /api/sessions/claim requires authentication (401 when unauthenticated)", async () => {
    const res = await fetchApp("/api/sessions/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: "sess_any" }),
    });
    expect(res.status).toBe(401);
  });

  test("Guest completes an unclaimed session and claims it upon first login via POST /api/sessions/claim", async () => {
    // 1. Guest starts and completes a 2-trial session without auth token
    const startRes = await fetchApp("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_name: "Guest Wanderer",
        total_trials: 2,
        warmup_trials: 1,
      }),
    });
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    const guestSessionId = startData.session_id;

    for (let t = 0; t < 2; t++) {
      await fetchApp(`/api/sessions/${guestSessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "A" }),
      });
      await fetchApp(`/api/sessions/${guestSessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: MetacognitiveAction.HIGH_BET,
          confidence_level: 0.95,
        }),
      });
    }

    // 2. Before claiming, User A has 0 sessions
    const beforeMe = await fetchApp("/api/me/sessions", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const beforeData = await beforeMe.json();
    expect(beforeData.sessions.length).toBe(0);

    // 3. User A logs in and claims the guest session
    const claimRes = await fetchApp("/api/sessions/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ session_id: guestSessionId }),
    });
    expect(claimRes.status).toBe(200);
    const claimData = await claimRes.json();
    expect(claimData.claimed).toContain(guestSessionId);
    expect(claimData.sessions.some((s: any) => s.id === guestSessionId)).toBe(true);

    // 4. User B cannot hijack a session already claimed by User A
    const hijackRes = await fetchApp("/api/sessions/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ session_id: guestSessionId }),
    });
    expect(hijackRes.status).toBe(200);
    const hijackData = await hijackRes.json();
    expect(hijackData.claimed).not.toContain(guestSessionId);
    expect(hijackData.sessions.length).toBe(0);

    // 5. GET /api/me/assets reflects the unlocked Cognitive Asset for User A
    const assetsRes = await fetchApp("/api/me/assets", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(assetsRes.status).toBe(200);
    const assetsData = await assetsRes.json();
    expect(Array.isArray(assetsData.assets)).toBe(true);
    expect(assetsData.assets.length).toBe(8);
    expect(assetsData.unlocked_count).toBe(1);
    const unlockedAsset = assetsData.assets.find((a: any) => a.unlocked);
    expect(unlockedAsset).toBeDefined();
    expect(unlockedAsset.count).toBe(1);
    expect(unlockedAsset.latest_session_id).toBe(guestSessionId);
  });

  test("New independent SPA routes (/history, /settings, /assets, /test) serve index.html", async () => {
    for (const route of ["/history", "/settings", "/assets", "/test"]) {
      const res = await fetchApp(route);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('id="root"');
    }
  });
});
