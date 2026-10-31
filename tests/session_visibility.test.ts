import { describe, test, expect, beforeEach, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import appDefault, {
  sessionManager,
  userManager,
} from "../src/backend/server";
import { createAuthToken } from "../src/backend/auth/jwt";
import { User } from "../src/storage/user";
import { SubjectType, MetacognitiveAction } from "../src/backend/models";
import { generateMaskedCodename } from "../src/backend/codename_generator";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return appDefault.fetch(req);
};

describe("GitHub Issue #15: Three-Tier Session Visibility Engine", () => {
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    const uidA = crypto.randomUUID();
    const uidB = crypto.randomUUID();

    userA = await userManager.upsertUser({
      primary_provider: "github",
      provider_id: `gh-${uidA}`,
      email: `alice-${uidA}@example.com`,
      display_name: "天机行者Alice",
      avatar_url: "https://example.com/alice.png",
      metadata: {
        bio: "元认知探索者",
        default_visibility: "anonymous",
        social_links: { github: "alice" },
      },
    });

    userB = await userManager.upsertUser({
      primary_provider: "linuxdo",
      provider_id: `ld-${uidB}`,
      email: `bob-${uidB}@example.com`,
      display_name: "Bob Builder",
      avatar_url: "https://example.com/bob.png",
      metadata: {
        bio: "AI Researcher",
        default_visibility: "public",
      },
    });

    tokenA = await createAuthToken(userA);
    tokenB = await createAuthToken(userB);
  });

  describe("1. Database Schema & Session Lifecycle Visibility", () => {
    test("Codename generator produces valid masked codename like [天机星-3301]", () => {
      const nameZh = generateMaskedCodename("sess_test_123", "zh-CN");
      expect(nameZh).toMatch(/^\[.+-\d{4}\]$/);
      expect(nameZh.startsWith("[")).toBe(true);
      expect(nameZh.endsWith("]")).toBe(true);

      const nameEn = generateMaskedCodename("sess_test_123", "en-US");
      expect(nameEn).toMatch(/^\[.+-\d{4}\]$/);
    });

    test("POST /api/sessions/start creates session with default 'anonymous' visibility", async () => {
      const sid = `sess_vis_default_${Date.now()}`;
      const res = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid }),
      });
      expect(res.status).toBe(200);

      const active = sessionManager.getSession(sid);
      expect(active).toBeDefined();
      expect(active?.visibility).toBe("anonymous");
    });

    test("POST /api/sessions/start respects user's default_visibility preference when authenticated", async () => {
      const sid = `sess_vis_user_${Date.now()}`;
      const res = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ session_id: sid }),
      });
      expect(res.status).toBe(200);

      const active = sessionManager.getSession(sid);
      expect(active).toBeDefined();
      expect(active?.visibility).toBe("public");
    });
  });

  describe("2. Cohort Scatter API (/api/cohort/scatter) Privacy Boundaries", () => {
    test("Strictly excludes 'private' sessions, anonymizes 'anonymous' sessions, and includes social metadata for 'public' sessions", async () => {
      const ts = Date.now();
      const privateSid = `sess_priv_${ts}`;
      const anonSid = `sess_anon_${ts}`;
      const publicSid = `sess_pub_${ts}`;

      // 1. Create and complete Private session for userA
      const s1 = await sessionManager.createSessionAsync({
        sessionId: privateSid,
        userId: userA.id,
        subjectName: "Alice Private Test",
        subjectType: SubjectType.HUMAN,
        visibility: "private",
        totalTrials: 1,
        warmupTrials: 0,
      });
      s1.records.push({
        trial_index: 1,
        is_warmup: false,
        difficulty_level: 0.5,
        stimulus_id: "s1",
        correct_option: "A",
        first_order_choice: "A",
        is_correct_first_order: true,
        revised_choice: "A",
        is_correct_final: true,
        action: MetacognitiveAction.HIGH_BET,
        confidence_level: 0.9,
        hints_unlocked: 0,
        score_delta: 10,
        duration_ms: 500,
      });
      await sessionManager.persistCompletedSessionAsync(s1);

      // 2. Create and complete Anonymous session for userA
      const s2 = await sessionManager.createSessionAsync({
        sessionId: anonSid,
        userId: userA.id,
        subjectName: "Alice Secret Voyage",
        subjectType: SubjectType.HUMAN,
        visibility: "anonymous",
        totalTrials: 1,
        warmupTrials: 0,
      });
      s2.records.push({
        trial_index: 1,
        is_warmup: false,
        difficulty_level: 0.5,
        stimulus_id: "s2",
        correct_option: "A",
        first_order_choice: "A",
        is_correct_first_order: true,
        revised_choice: "A",
        is_correct_final: true,
        action: MetacognitiveAction.SAFE_BET,
        confidence_level: 0.5,
        hints_unlocked: 0,
        score_delta: 3,
        duration_ms: 600,
      });
      await sessionManager.persistCompletedSessionAsync(s2);

      // 3. Create and complete Public session for userA
      const s3 = await sessionManager.createSessionAsync({
        sessionId: publicSid,
        userId: userA.id,
        subjectName: "Alice Public Showcase",
        subjectType: SubjectType.HUMAN,
        visibility: "public",
        totalTrials: 1,
        warmupTrials: 0,
      });
      s3.records.push({
        trial_index: 1,
        is_warmup: false,
        difficulty_level: 0.5,
        stimulus_id: "s3",
        correct_option: "B",
        first_order_choice: "B",
        is_correct_first_order: true,
        revised_choice: "B",
        is_correct_final: true,
        action: MetacognitiveAction.HIGH_BET,
        confidence_level: 0.95,
        hints_unlocked: 0,
        score_delta: 10,
        duration_ms: 700,
      });
      await sessionManager.persistCompletedSessionAsync(s3);

      // Query Public Cohort Scatter
      const res = await fetchApp("/api/cohort/scatter?lang=zh-CN");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.subjects)).toBe(true);

      // A. Verify Private session is 100% excluded
      const privPoint = data.subjects.find((s: any) => s.id === privateSid);
      expect(privPoint).toBeUndefined();

      // B. Verify Anonymous session is anonymized
      const anonPoint = data.subjects.find((s: any) => s.id === anonSid);
      expect(anonPoint).toBeDefined();
      expect(anonPoint.name).toMatch(/^\[.+-\d{4}\]$/);
      expect(anonPoint.name).not.toBe("Alice Secret Voyage");
      expect(anonPoint.user_id).toBeNull();
      expect(anonPoint.social).toBeUndefined();
      expect(anonPoint.avatar_url).toBeUndefined();

      // C. Verify Public session includes social metadata
      const pubPoint = data.subjects.find((s: any) => s.id === publicSid);
      expect(pubPoint).toBeDefined();
      expect(pubPoint.name).toBe(userA.display_name);
      expect(pubPoint.user_id).toBe(userA.id);
      expect(pubPoint.avatar_url).toBe(userA.avatar_url);
      expect(pubPoint.profile_url).toBe(`/user/${userA.id}`);
      expect(pubPoint.social).toBeDefined();
      expect(pubPoint.social.display_name).toBe(userA.display_name);
      expect(pubPoint.social.avatar_url).toBe(userA.avatar_url);
      expect(pubPoint.social.bio).toBe("元认知探索者");
      expect(pubPoint.social.social_links?.github).toBe("alice");
    });
  });

  describe("3. Instant Visibility Switcher & Retroactive Modification API", () => {
    test("PATCH /api/sessions/:id/visibility updates session visibility with instant feedback", async () => {
      const sid = `sess_retro_${Date.now()}`;
      const s = await sessionManager.createSessionAsync({
        sessionId: sid,
        userId: userA.id,
        visibility: "anonymous",
        totalTrials: 1,
        warmupTrials: 0,
      });
      s.records.push({
        trial_index: 1,
        is_warmup: false,
        difficulty_level: 0.5,
        stimulus_id: "s1",
        correct_option: "A",
        first_order_choice: "A",
        is_correct_first_order: true,
        revised_choice: "A",
        is_correct_final: true,
        action: MetacognitiveAction.SAFE_BET,
        confidence_level: 0.5,
        hints_unlocked: 0,
        score_delta: 3,
      });
      await sessionManager.persistCompletedSessionAsync(s);

      // 1. Change from anonymous to private
      const res1 = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ visibility: "private" }),
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      expect(data1.visibility).toBe("private");

      // Verify it disappeared from cohort scatter
      const scatterRes1 = await fetchApp("/api/cohort/scatter");
      const scatter1 = await scatterRes1.json();
      expect(scatter1.subjects.some((p: any) => p.id === sid)).toBe(false);

      // 2. Retroactively change from private to public
      const res2 = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ visibility: "public" }),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.visibility).toBe("public");

      // Verify it now appears in cohort scatter with public info
      const scatterRes2 = await fetchApp("/api/cohort/scatter");
      const scatter2 = await scatterRes2.json();
      const pubPoint = scatter2.subjects.find((p: any) => p.id === sid);
      expect(pubPoint).toBeDefined();
      expect(pubPoint.name).toBe(userA.display_name);
      expect(pubPoint.visibility).toBe("public");
    });

    test("PATCH /api/sessions/:id/visibility enforces authorization boundaries", async () => {
      const sid = `sess_auth_check_${Date.now()}`;
      const s = await sessionManager.createSessionAsync({
        sessionId: sid,
        userId: userA.id,
        visibility: "anonymous",
      });
      await sessionManager.persistCompletedSessionAsync(s);

      // User B tries to modify User A's session -> 403 Forbidden
      const resForbidden = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ visibility: "public" }),
      });
      expect(resForbidden.status).toBe(403);

      // Unauthenticated tries to modify owned session -> 401 Unauthorized
      const resUnauth = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });
      expect(resUnauth.status).toBe(401);

      // Invalid visibility value -> 400 Bad Request
      const resInvalid = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ visibility: "invalid_status" }),
      });
      expect(resInvalid.status).toBe(400);
    });

    test("Unauthenticated guest can update visibility on unclaimed session", async () => {
      const sid = `sess_guest_${Date.now()}`;
      const s = await sessionManager.createSessionAsync({
        sessionId: sid,
        visibility: "anonymous",
      });
      await sessionManager.persistCompletedSessionAsync(s);

      const res = await fetchApp(`/api/sessions/${sid}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "private" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.visibility).toBe("private");
    });
  });

  describe("4. Personal History Dashboard (/api/me/sessions)", () => {
    test("User can see all their sessions (including private ones) on personal dashboard with visibility tag", async () => {
      const sid = `sess_me_priv_${Date.now()}`;
      const s = await sessionManager.createSessionAsync({
        sessionId: sid,
        userId: userA.id,
        subjectName: "My Private Experiment",
        visibility: "private",
        totalTrials: 1,
        warmupTrials: 0,
      });
      s.records.push({
        trial_index: 1,
        is_warmup: false,
        difficulty_level: 0.5,
        stimulus_id: "s1",
        correct_option: "A",
        first_order_choice: "A",
        is_correct_first_order: true,
        revised_choice: "A",
        is_correct_final: true,
        action: MetacognitiveAction.SAFE_BET,
        confidence_level: 0.5,
        hints_unlocked: 0,
        score_delta: 3,
      });
      await sessionManager.persistCompletedSessionAsync(s);

      const res = await fetchApp("/api/me/sessions", {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.sessions)).toBe(true);

      const mySession = data.sessions.find((sess: any) => sess.id === sid);
      expect(mySession).toBeDefined();
      expect(mySession.name).toBe("My Private Experiment"); // Preserves real name for owner
      expect(mySession.visibility).toBe("private");
    });
  });
});
