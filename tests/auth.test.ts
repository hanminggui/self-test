import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import appDefault, {
  sessionManager,
  userManager,
  oauthService,
} from "../src/backend/server";
import { LocalSqliteAdapter } from "../src/storage";
import { createAuthToken, verifyAuthToken, JWT_SECRET } from "../src/backend/auth/jwt";
import { User } from "../src/storage/user";

const fetchApp = (path: string, options?: RequestInit) => {
  const req = new Request(`http://localhost${path}`, options);
  return appDefault.fetch(req);
};

describe("User Core Schema, JWT & Multi-Provider OAuth Matrix", () => {
  beforeEach(() => {
    oauthService.clearMockHandlers();
  });

  afterEach(() => {
    oauthService.clearMockHandlers();
  });

  describe("1. Database Schema & Anonymous Session Compatibility (#9)", () => {
    test("users table exists and supports CRUD via LocalSqliteAdapter", async () => {
      const adapter = new LocalSqliteAdapter(":memory:");
      adapter.initUserSchema();

      const tableCheck = await adapter.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      );
      expect(tableCheck.length).toBe(1);
      expect(tableCheck[0].name).toBe("users");

      // Verify columns
      const cols = await adapter.query("PRAGMA table_info(users)");
      const colNames = cols.map((c) => c.name);
      expect(colNames).toContain("id");
      expect(colNames).toContain("email");
      expect(colNames).toContain("display_name");
      expect(colNames).toContain("avatar_url");
      expect(colNames).toContain("primary_provider");
      expect(colNames).toContain("created_at");
      expect(colNames).toContain("updated_at");
      expect(colNames).toContain("metadata_json");
    });

    test("anonymous sessions continue to work seamlessly without user_id", async () => {
      const res = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: "Anonymous Voyager",
          total_trials: 3,
          warmup_trials: 1,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      const sessionId = data.session_id;

      // Check active_sessions database record
      const rows = await sessionManager.getStorage().query(
        "SELECT id, user_id FROM active_sessions WHERE id = ?",
        [sessionId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].user_id).toBeNull();

      // Complete session
      await fetchApp(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "A" }),
      });
      await fetchApp(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SAFE_BET", confidence_level: 0.5 }),
      });

      // Advance remaining trials
      await fetchApp(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "B" }),
      });
      await fetchApp(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "HIGH_BET", confidence_level: 0.95 }),
      });

      await fetchApp(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: "C" }),
      });
      const finalRes = await fetchApp(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "HIGH_BET", confidence_level: 0.95 }),
      });
      const finalData = await finalRes.json();
      expect(finalData.is_completed).toBe(true);

      // Verify completed_sessions has null user_id
      const completedRows = await sessionManager.getStorage().query(
        "SELECT id, user_id FROM completed_sessions WHERE id = ?",
        [sessionId]
      );
      expect(completedRows.length).toBe(1);
      expect(completedRows[0].user_id).toBeNull();
    });
  });

  describe("2. JWT Issuance, Verification & Auth Shell Endpoints (#9)", () => {
    const mockUser: User = {
      id: "usr_test_jwt_123",
      email: "testjwt@example.com",
      display_name: "JWT Commander",
      avatar_url: "https://example.com/avatar.png",
      primary_provider: "github",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { role: "tester" },
    };

    test("JWT generates valid signature and roundtrips with verifyAuthToken", async () => {
      const token = await createAuthToken(mockUser);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const payload = await verifyAuthToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.id).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.display_name).toBe(mockUser.display_name);
      expect(payload?.primary_provider).toBe("github");
      expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test("JWT fails verification with incorrect secret", async () => {
      const token = await createAuthToken(mockUser, "wrong-secret");
      const payload = await verifyAuthToken(token, JWT_SECRET);
      expect(payload).toBeNull();
    });

    test("GET /api/auth/me returns null when unauthenticated", async () => {
      const res = await fetchApp("/api/auth/me");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();
    });

    test("GET /api/auth/me returns user profile when Authorization Bearer token provided", async () => {
      await userManager.upsertUser({
        id: mockUser.id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: mockUser.avatar_url,
        primary_provider: mockUser.primary_provider,
        provider_id: "gh_12345",
      });

      const token = await createAuthToken(mockUser);
      const res = await fetchApp("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).not.toBeNull();
      expect(data.user.id).toBe(mockUser.id);
      expect(data.user.email).toBe(mockUser.email);
      expect(data.user.display_name).toBe(mockUser.display_name);
    });

    test("GET /api/auth/me returns user profile when HttpOnly cookie provided", async () => {
      const token = await createAuthToken(mockUser);
      const res = await fetchApp("/api/auth/me", {
        headers: {
          Cookie: `auth_token=${token}`,
        },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).not.toBeNull();
      expect(data.user.id).toBe(mockUser.id);
    });

    test("POST /api/auth/logout clears auth cookie", async () => {
      const res = await fetchApp("/api/auth/logout", {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const setCookieHeader = res.headers.get("set-cookie") || "";
      expect(setCookieHeader).toContain("auth_token=");
    });

    test("Authenticated session creation persists user_id in active and completed sessions", async () => {
      const authUser = await userManager.upsertUser({
        email: "authenticated_voyager@example.com",
        display_name: "Auth Pilot",
        primary_provider: "github",
        provider_id: "gh_pilot_999",
      });

      const token = await createAuthToken(authUser);

      // Start session with Bearer token
      const res = await fetchApp("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          total_trials: 1,
          warmup_trials: 0,
        }),
      });
      expect(res.status).toBe(200);
      const sessionData = await res.json();
      const sessionId = sessionData.session_id;

      // Verify active_sessions record has user_id
      const activeRows = await sessionManager.getStorage().query(
        "SELECT id, user_id FROM active_sessions WHERE id = ?",
        [sessionId]
      );
      expect(activeRows.length).toBe(1);
      expect(activeRows[0].user_id).toBe(authUser.id);

      // Complete session
      await fetchApp(`/api/sessions/${sessionId}/phase1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ choice: "A" }),
      });
      const p2Res = await fetchApp(`/api/sessions/${sessionId}/phase2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "HIGH_BET", confidence_level: 0.95 }),
      });
      expect(p2Res.status).toBe(200);

      // Verify completed_sessions record has user_id
      const completedRows = await sessionManager.getStorage().query(
        "SELECT id, user_id FROM completed_sessions WHERE id = ?",
        [sessionId]
      );
      expect(completedRows.length).toBe(1);
      expect(completedRows[0].user_id).toBe(authUser.id);

      // Verify /api/auth/sessions returns the user's completed session
      const userSessionsRes = await fetchApp("/api/auth/sessions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(userSessionsRes.status).toBe(200);
      const userSessionsData = await userSessionsRes.json();
      expect(userSessionsData.sessions.some((s: any) => s.id === sessionId)).toBe(true);
    });
  });

  describe("3. GitHub OAuth Flow (#10)", () => {
    test("GET /api/auth/github redirects to GitHub authorize URL and sets state cookie", async () => {
      const res = await fetchApp("/api/auth/github");
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("github.com/login/oauth/authorize");
      expect(location).toContain("scope=read%3Auser%2Cuser%3Aemail");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain("oauth_state=");
    });

    test("GET /api/auth/github/callback exchanges code, upserts user and issues cookie", async () => {
      // Mock GitHub provider response
      oauthService.setMockHandler("github", async (code: string) => {
        expect(code).toBe("gh_mock_valid_code");
        return {
          provider: "github",
          provider_id: "987654",
          email: "octocat@github.com",
          display_name: "The Octocat",
          avatar_url: "https://avatars.githubusercontent.com/u/987654?v=4",
          metadata: { github_login: "octocat" },
        };
      });

      const res = await fetchApp("/api/auth/github/callback?code=gh_mock_valid_code&json=1");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe("octocat@github.com");
      expect(data.user.display_name).toBe("The Octocat");
      expect(data.user.primary_provider).toBe("github");

      // Verify HttpOnly cookie header was set
      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain("auth_token=");
      expect(cookieHeader.toLowerCase()).toContain("httponly");
    });
  });

  describe("4. LinuxDo OAuth / Connect Flow (#11)", () => {
    test("GET /api/auth/linuxdo redirects to LinuxDo connect URL and sets state cookie", async () => {
      const res = await fetchApp("/api/auth/linuxdo");
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("connect.linux.do/oauth2/authorize");
      expect(location).toContain("response_type=code");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain("oauth_state=");
    });

    test("GET /api/auth/linuxdo/callback retrieves trust level and attaches community badge", async () => {
      // Mock LinuxDo connect response with trust level 3
      oauthService.setMockHandler("linuxdo", async (code: string) => {
        expect(code).toBe("linuxdo_test_code");
        return {
          provider: "linuxdo",
          provider_id: "42042",
          email: "neo@linux.do",
          display_name: "Neo Matrix",
          avatar_url: "https://linux.do/user_avatar/neo.png",
          metadata: {
            username: "neo",
            trust_level: 3,
            badge: "LinuxDo L3",
          },
        };
      });

      const res = await fetchApp("/api/auth/linuxdo/callback?code=linuxdo_test_code&json=1");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.primary_provider).toBe("linuxdo");
      expect(data.user.metadata.trust_level).toBe(3);
      expect(data.user.metadata.badge).toBe("LinuxDo L3");

      // Verify stored user in DB has badge
      const dbUser = await userManager.getUserById(data.user.id);
      expect(dbUser?.metadata?.badge).toBe("LinuxDo L3");
      expect(dbUser?.metadata?.trust_level).toBe(3);
    });
  });

  describe("5. Google Identity OAuth & Cross-Provider Deduplication (#12)", () => {
    test("GET /api/auth/google redirects to Google accounts URL", async () => {
      const res = await fetchApp("/api/auth/google");
      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(location).toContain("scope=openid+email+profile");
    });

    test("Account deduplication: Google login with existing email links identity to existing account", async () => {
      const sharedEmail = "charlie@metacognition.org";

      // 1. Initial login with GitHub
      oauthService.setMockHandler("github", async () => {
        return {
          provider: "github",
          provider_id: "gh_charlie_11",
          email: sharedEmail,
          display_name: "Charlie GitHub",
          avatar_url: "https://github.com/charlie.png",
          metadata: { github_login: "charlie" },
        };
      });

      const ghRes = await fetchApp("/api/auth/github/callback?code=code_gh&json=1");
      const ghData = await ghRes.json();
      const originalUserId = ghData.user.id;
      expect(ghData.user.primary_provider).toBe("github");

      // 2. Subsequent login with Google using the SAME email address
      oauthService.setMockHandler("google", async () => {
        return {
          provider: "google",
          provider_id: "google_sub_998877",
          email: sharedEmail,
          display_name: "Charlie Google",
          avatar_url: "https://lh3.googleusercontent.com/charlie.jpg",
          metadata: { email_verified: true, google_sub: "google_sub_998877" },
        };
      });

      const gRes = await fetchApp("/api/auth/google/callback?code=code_google&json=1");
      expect(gRes.status).toBe(200);
      const gData = await gRes.json();

      // Account must be deduplicated to the same user ID!
      expect(gData.user.id).toBe(originalUserId);
      expect(gData.user.email).toBe(sharedEmail);

      // Verify both providers are tracked in linked providers
      const updatedUser = await userManager.getUserById(originalUserId);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.metadata?.providers?.github).toBeDefined();
      expect(updatedUser?.metadata?.providers?.google).toBeDefined();
      expect(updatedUser?.metadata?.providers?.google.id).toBe("google_sub_998877");
    });
  });
});
