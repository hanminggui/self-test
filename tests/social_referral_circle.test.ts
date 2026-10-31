import { describe, expect, it, beforeEach } from "bun:test";
import { app, userManager, getDefaultSessionManager } from "../src/backend/server";
import { UserManager } from "../src/backend/user_manager";
import { LocalSqliteAdapter } from "../src/storage/local_sqlite";
import { createAuthToken } from "../src/backend/auth/jwt";
import { computeCognitiveSimilarity } from "../src/frontend/utils/manifoldUtils";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return app.fetch(req);
};

describe("GitHub Issue #20: Referral Circle & Friend Network Graph Suite", () => {
  let memDb: LocalSqliteAdapter;
  let testUm: UserManager;

  beforeEach(() => {
    memDb = new LocalSqliteAdapter(":memory:");
    testUm = new UserManager(memDb);
  });

  describe("1. user_relations Table, Referral Chains & Mutual Connections", () => {
    it("1.1 Successfully creates user_relations and records a direct referral", async () => {
      const userA = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_user_a",
        display_name: "Alice Explorer",
        avatar_url: "https://example.com/alice.png",
      });

      const userB = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_user_b",
        display_name: "Bob Explorer",
        avatar_url: "https://example.com/bob.png",
      });

      const relation = await testUm.recordReferral(userA.id, userB.id, "session_test_123");
      expect(relation).toBeDefined();
      expect(relation.referrer_id).toBe(userA.id);
      expect(relation.referee_id).toBe(userB.id);
      expect(relation.source_session_id).toBe("session_test_123");
      expect(relation.relation_type).toBe("referral");
    });

    it("1.2 Prevents self-referral (referrer cannot be referee)", async () => {
      const userA = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_self_ref",
        display_name: "Self Ref User",
      });

      expect(testUm.recordReferral(userA.id, userA.id)).rejects.toThrow();
    });

    it("1.3 Handles duplicate referrals idempotently", async () => {
      const userA = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_dup_a",
        display_name: "Alice Dup",
      });

      const userB = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_dup_b",
        display_name: "Bob Dup",
      });

      const r1 = await testUm.recordReferral(userA.id, userB.id, "session_dup_1");
      const r2 = await testUm.recordReferral(userA.id, userB.id, "session_dup_2");
      expect(r1.id).toBe(r2.id);
    });

    it("1.4 Retrieves direct friends and mutual connections", async () => {
      const userA = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_net_a",
        display_name: "Alice Root",
        avatar_url: "https://example.com/a.png",
      });

      const userB = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_net_b",
        display_name: "Bob Friend",
        avatar_url: "https://example.com/b.png",
      });

      const userC = await testUm.upsertUser({
        primary_provider: "github",
        provider_id: "gh_net_c",
        display_name: "Charlie Friend",
        avatar_url: "https://example.com/c.png",
      });

      // A referred B; B referred C
      await testUm.recordReferral(userA.id, userB.id);
      await testUm.recordReferral(userB.id, userC.id);

      // User B's direct friends: should include A (referrer) and C (referee)
      const bFriends = await testUm.getDirectFriends(userB.id);
      const bFriendIds = bFriends.map((u) => u.id);
      expect(bFriendIds).toContain(userA.id);
      expect(bFriendIds).toContain(userC.id);
      expect(bFriends.length).toBe(2);

      // Verify referral chain
      const chainB = await testUm.getReferralChain(userB.id);
      expect(chainB.upstream).toContain(userA.id);
      expect(chainB.downstream).toContain(userC.id);
    });
  });

  describe("2. Assessment & Signup Referral Recording", () => {
    it("2.1 POST /api/sessions/start records referral when authenticated user starts via invitation link", async () => {
      const uidA = crypto.randomUUID();
      const uidB = crypto.randomUUID();

      const referrer = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `ref_lead_${uidA}`,
        display_name: "Leader Alice",
        avatar_url: "https://example.com/lead.png",
      });

      const referee = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `ref_join_${uidB}`,
        display_name: "Newcomer Bob",
        avatar_url: "https://example.com/newcomer.png",
      });

      const refereeToken = await createAuthToken(referee);

      const res = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refereeToken}`,
        },
        body: JSON.stringify({
          referrer_id: referrer.id,
          source_session_id: "shared_session_lead_001",
        }),
      });

      expect(res.status).toBe(200);

      // Verify the relationship was saved
      const friends = await userManager.getDirectFriends(referee.id);
      expect(friends.some((f) => f.id === referrer.id)).toBe(true);
    });

    it("2.2 Claiming unclaimed guest session preserves referral link", async () => {
      const uidReferrer = crypto.randomUUID();
      const referrer = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `ref_guest_referrer_${uidReferrer}`,
        display_name: "Host Carol",
      });

      // 1. Guest starts session with referral info
      const guestSessionRes = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer_id: referrer.id,
          source_session_id: "host_session_xyz",
        }),
      });
      const guestTrial = await guestSessionRes.json();
      const guestSessionId = guestTrial.session_id;

      // Complete session
      const sm = getDefaultSessionManager();
      const active = sm.getSession(guestSessionId);
      if (active) {
        for (let i = 0; i < 30; i++) {
          active.records.push({
            trial_index: i,
            is_warmup: i < 10,
            stimulus_id: `stim_${i}`,
            correct_option: "A",
            first_order_choice: "A",
            is_correct_first_order: true,
            action: "BET_HIGH" as any,
            revised_choice: "A",
            is_correct_final: true,
            difficulty_level: 0.5,
            confidence_level: 4,
            hints_unlocked: 0,
            first_order_rt_ms: 300,
            second_order_rt_ms: 200,
            score_delta: 20,
          });
        }
        await sm.persistCompletedSessionAsync(active);
      }

      // 2. User registers/authenticates and claims the session
      const uidGuest = crypto.randomUUID();
      const newUser = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `ref_claimed_user_${uidGuest}`,
        display_name: "Claimed Dave",
      });
      const userToken = await createAuthToken(newUser);

      const claimRes = await fetchApp("/api/sessions/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          session_id: guestSessionId,
        }),
      });

      expect(claimRes.status).toBe(200);

      // Verify the relation is now established in user_relations
      const friends = await userManager.getDirectFriends(newUser.id);
      expect(friends.some((f) => f.id === referrer.id)).toBe(true);
    });
  });

  describe("3. /api/cohort/scatter?scope=friends Endpoint", () => {
    it("3.1 /api/cohort/scatter?scope=friends requires authentication (401 when guest)", async () => {
      const res = await fetchApp("/api/cohort/scatter?scope=friends");
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("3.2 Returns authenticated user's friend network with avatars, nicknames, and similarity match rates", async () => {
      const sm = getDefaultSessionManager();
      const uidA = crypto.randomUUID();
      const uidB = crypto.randomUUID();
      const uidStranger = crypto.randomUUID();

      const userA = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `cohort_a_${uidA}`,
        display_name: "Explorer Anna",
        avatar_url: "https://example.com/anna.png",
      });

      const userB = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `cohort_b_${uidB}`,
        display_name: "Explorer Ben",
        avatar_url: "https://example.com/ben.png",
      });

      const stranger = await userManager.upsertUser({
        primary_provider: "github",
        provider_id: `cohort_s_${uidStranger}`,
        display_name: "Stranger Sam",
        avatar_url: "https://example.com/sam.png",
      });

      // Connect A and B as referral friends
      await userManager.recordReferral(userA.id, userB.id);

      // Create completed sessions for A, B, and Stranger
      const setupSession = async (user: any, name: string, score: number, dStar: number) => {
        const s = await sm.createSessionAsync({
          userId: user.id,
          subjectName: name,
        });
        const active = sm.getSession(s.sessionId);
        if (active) {
          for (let i = 0; i < 30; i++) {
            active.records.push({
              trial_index: i,
              is_warmup: i < 10,
              stimulus_id: `stim_${i}`,
              correct_option: "A",
              first_order_choice: "A",
              is_correct_first_order: true,
              action: "BET_HIGH" as any,
              revised_choice: "A",
              is_correct_final: true,
              difficulty_level: dStar,
              confidence_level: 4,
              hints_unlocked: 0,
              first_order_rt_ms: 300,
              second_order_rt_ms: 200,
              score_delta: 20,
            });
          }
          await sm.persistCompletedSessionAsync(active);
        }
        return s.sessionId;
      };

      const sessA = await setupSession(userA, "Explorer Anna", 100, 0.6);
      const sessB = await setupSession(userB, "Explorer Ben", 95, 0.58);
      const sessS = await setupSession(stranger, "Stranger Sam", 60, 0.2);

      const tokenA = await createAuthToken(userA);

      // Fetch with scope=friends
      const friendsRes = await fetchApp("/api/cohort/scatter?scope=friends", {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(friendsRes.status).toBe(200);

      const friendsData = await friendsRes.json();
      expect(Array.isArray(friendsData.subjects)).toBe(true);

      const friendSubjects = friendsData.subjects;
      // Stranger should be excluded!
      expect(friendSubjects.some((s: any) => s.user_id === stranger.id)).toBe(false);

      // User A (self) and User B (friend) must be present
      const selfSub = friendSubjects.find((s: any) => s.user_id === userA.id);
      const friendSub = friendSubjects.find((s: any) => s.user_id === userB.id);

      expect(selfSub).toBeDefined();
      expect(selfSub.is_self).toBe(true);
      expect(selfSub.avatar_url).toBe("https://example.com/anna.png");
      expect(selfSub.nickname).toBe("Explorer Anna");

      expect(friendSub).toBeDefined();
      expect(friendSub.is_friend).toBe(true);
      expect(friendSub.avatar_url).toBe("https://example.com/ben.png");
      expect(friendSub.nickname).toBe("Explorer Ben");
      expect(typeof friendSub.similarity).toBe("number");
      expect(friendSub.similarity).toBeGreaterThan(0);
      expect(friendSub.similarity).toBeLessThanOrEqual(100);

      // Fetch with scope=self
      const selfRes = await fetchApp("/api/cohort/scatter?scope=self", {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(selfRes.status).toBe(200);
      const selfData = await selfRes.json();
      expect(selfData.subjects.every((s: any) => s.user_id === userA.id)).toBe(true);

      // Fetch with scope=global
      const globalRes = await fetchApp("/api/cohort/scatter?scope=global", {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(globalRes.status).toBe(200);
      const globalData = await globalRes.json();
      expect(globalData.subjects.some((s: any) => s.user_id === stranger.id)).toBe(true);
    });
  });

  describe("4. Cognitive Similarity Metric Pure Function", () => {
    it("4.1 computeCognitiveSimilarity outputs 100% for identical profiles", () => {
      const v = [0.8, 1.2, 0.05, 0.65] as [number, number, number, number];
      expect(computeCognitiveSimilarity(v, v)).toBe(100);
    });

    it("4.2 computeCognitiveSimilarity outputs lower match for divergent profiles", () => {
      const v1 = [0.9, 1.5, -0.4, 0.9] as [number, number, number, number];
      const v2 = [0.2, 0.4, 0.6, 0.1] as [number, number, number, number];
      const sim = computeCognitiveSimilarity(v1, v2);
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThan(70);
    });
  });

  describe("5. Frontend Scope Switcher Capsule & Friends Hover Rendering", () => {
    it("5.1 ScopeSwitcherCapsule renders all 3 scope options with accessible markup", async () => {
      const { renderToString } = await import("react-dom/server");
      const React = await import("react");
      const { ScopeSwitcherCapsule } = await import("../src/frontend/components/common/ScopeSwitcherCapsule");

      const html = renderToString(
        React.createElement(ScopeSwitcherCapsule, {
          scope: "friends",
          onScopeChange: () => {},
          friendCount: 5,
        })
      );

      // Verify all 3 capsule options exist
      expect(html).toContain("全域宏观星系");
      expect(html).toContain("好友社交圈");
      expect(html).toContain("唯我本体");

      // Verify active aria checked attribute
      expect(html).toContain('aria-checked="true"');

      // Verify friend count badge
      expect(html).toContain("5");
    });

    it("5.2 SubjectHoverCard renders avatar, friend indicator and cognitive similarity percentage", async () => {
      const { renderToString } = await import("react-dom/server");
      const React = await import("react");
      const { default: SubjectHoverCard } = await import("../src/frontend/components/admin/SubjectHoverCard");

      const testSubject: any = {
        id: "sess_friend_hover_test",
        name: "Explorer Diana",
        nickname: "Explorer Diana",
        avatar_url: "https://example.com/diana.png",
        quadrant_code: "Q1-CAL",
        role_title: "人形外挂",
        final_score: 95,
        d_star: 0.85,
        m_ratio: 1.25,
        calibration_bias: 0.02,
        ive: 0.78,
        is_friend: true,
        similarity: 92,
        metrics: {
          d_star: 0.85,
          m_ratio: 1.25,
          calibration_bias: 0.02,
          ive: 0.78,
        },
      };

      const html = renderToString(
        React.createElement("svg", null,
          React.createElement(SubjectHoverCard, {
            subject: testSubject,
            anchorPos: { x: 200, y: 200 },
          })
        )
      );

      expect(html).toContain("Explorer Diana");
      expect(html).toContain("https://example.com/diana.png");
      expect(html).toContain("92%");
      expect(html).toContain("认知流形契合度");
    });
  });
});
