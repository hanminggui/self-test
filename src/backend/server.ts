/**
 * Unified Server Entry & Cloudflare Workers / Bun Dual-Runtime Server
 * Serves REST endpoints, independent admin portal, health probes, and frontend SPA.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import * as path from "path";
import * as fs from "fs";
import { SessionManager } from "./session_manager";
import { UserManager } from "./user_manager";
import { User } from "../storage/user";
import {
  createAuthToken,
  verifyAuthToken,
  setAuthCookie,
  clearAuthCookie,
  extractToken,
} from "./auth/jwt";
import { oauthService, OAuthService } from "./auth/oauth";
import { D1StorageAdapter } from "../storage/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { MetacognitiveAction, SubjectType, TrialResponse, FinalAssessmentReport } from "./models";
import { runWithLocale, normalizeLocale, DEFAULT_LOCALE, type SupportedLocale } from "../i18n";
import { getMythicArchetype } from "../frontend/components/share/mythicArchetypes";
import { getArcaneArchetype } from "../frontend/components/share/arcaneArchetypes";
import { getArchetypeDefinition } from "./archetype_matrix";
import { generateLeaderboardOverview, subjectDataPointToLeaderboardInput } from "./leaderboard";

export type CloudflareBindings = {
  DB?: D1Database;
  ADMIN_PASSWORD?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  [key: string]: any;
};

export type AppVariables = {
  locale: SupportedLocale;
  sessionManager?: SessionManager;
  user?: User | null;
  userManager?: UserManager;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: AppVariables }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Locale", "Accept-Language"],
}));

// i18n request context middleware
app.use("*", async (c, next) => {
  const queryLang = c.req.query("lang") || c.req.query("locale");
  const headerXLocale = c.req.header("X-Locale");
  const headerAcceptLang = c.req.header("Accept-Language");

  const raw = queryLang || headerXLocale || headerAcceptLang || DEFAULT_LOCALE;
  const locale = normalizeLocale(raw);
  c.set("locale", locale);

  return runWithLocale(locale, () => next());
});

// Admin credentials
export const ADMIN_PASSWORD = (typeof process !== "undefined" && process.env?.ADMIN_PASSWORD) || "admin888";
const HOST = (typeof process !== "undefined" && process.env?.HOST) || "0.0.0.0";
const PORT = parseInt((typeof process !== "undefined" && process.env?.PORT) || "8000", 10);

const getAdminPassword = (c: any): string => {
  return c.env?.ADMIN_PASSWORD || (typeof process !== "undefined" && process.env?.ADMIN_PASSWORD) || ADMIN_PASSWORD;
};

export function printAdminBanner(host: string = HOST, port: number = PORT) {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  const adminLink = `http://${displayHost}:${port}/admin?token=${ADMIN_PASSWORD}`;
  const banner = `
========================================================================
  🧠 二元认知评测系统 (Metacognitive Testing System - Bun & Hono)
  🌐 正常受测者答题页面: http://${displayHost}:${port}/
  🔑 管理控制台免密链接: ${adminLink}
  🔒 管理员访问密码:   ${ADMIN_PASSWORD}
========================================================================
`;
  console.log(banner);
}

// Default Bun local storage instance (lazily initialized for edge runtimes like Cloudflare Workers)
let _defaultSessionManager: SessionManager | null = null;
export function getDefaultSessionManager(): SessionManager {
  if (!_defaultSessionManager) {
    if (typeof Bun === "undefined") {
      const edgeStorage: import("../storage/adapter").StorageAdapter = {
        engine: "edge_fallback",
        query: async () => [],
        run: async () => ({ changes: 0 }),
        exec: async () => {},
      };
      _defaultSessionManager = new SessionManager(edgeStorage);
    } else {
      _defaultSessionManager = new SessionManager();
    }
  }
  return _defaultSessionManager;
}

export const sessionManager: SessionManager = new Proxy({} as SessionManager, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "$$typeof" || prop === "toJSON") {
      return undefined;
    }
    const sm = getDefaultSessionManager();
    const val = Reflect.get(sm, prop, sm);
    if (typeof val === "function") {
      return val.bind(sm);
    }
    return val;
  },
  set(_target, prop, value) {
    const sm = getDefaultSessionManager();
    return Reflect.set(sm, prop, value, sm);
  },
  has(_target, prop) {
    const sm = getDefaultSessionManager();
    return Reflect.has(sm, prop);
  },
  getPrototypeOf(_target) {
    const sm = getDefaultSessionManager();
    return Reflect.getPrototypeOf(sm);
  },
});

let _defaultUserManager: UserManager | null = null;
export function getDefaultUserManager(): UserManager {
  if (!_defaultUserManager) {
    _defaultUserManager = new UserManager(getDefaultSessionManager().getStorage());
  }
  return _defaultUserManager;
}

export const userManager: UserManager = new Proxy({} as UserManager, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "$$typeof" || prop === "toJSON") {
      return undefined;
    }
    const um = getDefaultUserManager();
    const val = Reflect.get(um, prop, um);
    if (typeof val === "function") {
      return val.bind(um);
    }
    return val;
  },
  set(_target, prop, value) {
    const um = getDefaultUserManager();
    return Reflect.set(um, prop, value, um);
  },
  has(_target, prop) {
    const um = getDefaultUserManager();
    return Reflect.has(um, prop);
  },
  getPrototypeOf(_target) {
    const um = getDefaultUserManager();
    return Reflect.getPrototypeOf(um);
  },
});

export { oauthService, OAuthService };

// Cache D1-backed SessionManager and UserManager instances per D1 database binding
const d1SessionManagers = new WeakMap<object, SessionManager>();
const d1UserManagers = new WeakMap<object, UserManager>();

export function getSessionManagerForContext(c: any): SessionManager {
  if (c.get?.("sessionManager")) {
    return c.get("sessionManager");
  }
  if (c.env?.sessionManager) {
    return c.env.sessionManager;
  }
  const db = c.env?.DB;
  if (db) {
    let sm = d1SessionManagers.get(db);
    if (!sm) {
      sm = new SessionManager(new D1StorageAdapter(db));
      d1SessionManagers.set(db, sm);
    }
    return sm;
  }
  return sessionManager;
}

export function getUserManagerForContext(c: any): UserManager {
  if (c.get?.("userManager")) {
    return c.get("userManager");
  }
  if (c.env?.userManager) {
    return c.env.userManager;
  }
  const db = c.env?.DB;
  if (db) {
    let um = d1UserManagers.get(db);
    if (!um) {
      um = new UserManager(new D1StorageAdapter(db));
      d1UserManagers.set(db, um);
    }
    return um;
  }
  return userManager;
}

// Auth extraction middleware
app.use("*", async (c, next) => {
  const token = extractToken(c);
  if (token) {
    const payload = await verifyAuthToken(token);
    if (payload && payload.id) {
      const um = getUserManagerForContext(c);
      const user = await um.getUserById(payload.id);
      if (user) {
        c.set("user", user);
        return next();
      }
      // If user row is temporarily unavailable in memory adapter, fallback to JWT payload
      c.set("user", {
        id: payload.id,
        email: payload.email,
        display_name: payload.display_name,
        avatar_url: payload.avatar_url,
        primary_provider: payload.primary_provider,
        created_at: new Date(payload.iat * 1000).toISOString(),
        updated_at: new Date(payload.iat * 1000).toISOString(),
        metadata: payload.metadata,
      });
      return next();
    }
  }
  c.set("user", null);
  return next();
});

function getOrigin(c: any): string {
  const reqUrl = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") || reqUrl.protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host") || c.req.header("host") || reqUrl.host;
  return `${proto}://${host}`;
}

// --- REST API Routes ---

// 0. Diagnostic Health Probe Endpoint (GitHub Issue #5)
app.get("/api/health", async (c) => {
  const sm = getSessionManagerForContext(c);
  const isCloudflare = Boolean(c.env?.DB) || typeof Bun === "undefined" || (typeof navigator !== "undefined" && (navigator.userAgent?.includes("Cloudflare-Workers") || navigator.userAgent?.includes("Cloudflare")));
  const runtime = isCloudflare ? "cloudflare-workers" : "bun";

  const isD1 = sm.storage instanceof D1StorageAdapter || (sm.storage as any).engine === "cloudflare_d1";
  const storageEngine = isD1 ? "cloudflare_d1" : "local_sqlite";

  let connected = false;
  let dbError: string | undefined = undefined;
  try {
    const res = await sm.storage.query("SELECT 1 AS probe");
    connected = Array.isArray(res) && res.length > 0;
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  const responseBody = {
    status: connected ? "healthy" : "degraded",
    environment: runtime,
    runtime,
    storage: storageEngine,
    storage_engine: storageEngine,
    connected,
    database: {
      connected,
      ...(dbError ? { error: dbError } : {}),
    },
  };

  return c.json(responseBody, connected ? 200 : 503);
});

// 1. Start Session
app.post("/api/sessions/start", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const user = c.get("user");
  const userId = body.user_id || user?.id || null;
  const session = await sm.createSessionAsync({
    sessionId: body.session_id,
    userId,
    subjectName: body.subject_name || (user ? user.display_name : undefined),
    subjectType: body.subject_type || SubjectType.HUMAN,
    totalTrials: body.total_trials ?? 30,
    warmupTrials: body.warmup_trials ?? 10,
    initialDelta: body.initial_delta ?? 0.50,
    seed: body.seed,
    persona: body.persona,
    thinkingEffort: body.thinking_effort,
    metadata: {
      locale,
      ...(user ? { user_id: user.id, user_display_name: user.display_name } : {}),
      ...(body.metadata || {}),
    },
  });
  return c.json(await sm.getTrialRequestAsync(session.sessionId, locale));
});

// 2. Get current trial
app.get("/api/sessions/:id/trial", async (c) => {
  const id = c.req.param("id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.getTrialRequestAsync(id, locale));
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// 3. Submit Phase 1
app.post("/api/sessions/:id/phase1", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.submitPhase1Async(id, body.choice));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 4. Request Hint
app.post("/api/sessions/:id/hint", async (c) => {
  const id = c.req.param("id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.requestHintAsync(id, locale));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5. Submit Phase 2
app.post("/api/sessions/:id/phase2", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.submitPhase2Async(
      id,
      body.action as MetacognitiveAction,
      body.confidence_level,
      body.revised_choice,
      undefined,
      locale
    ));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 6. Unified step
app.post("/api/sessions/step", async (c) => {
  const body = await c.req.json() as TrialResponse;
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.processStepAsync(body));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 7. Get Report
app.get("/api/sessions/:id/report", async (c) => {
  const id = c.req.param("id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.getReportAsync(id, locale));
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// 7b. Public Read-Only Share Endpoints (GitHub Issue #8)
app.get("/api/share/:id", async (c) => {
  const id = c.req.param("id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.getReportAsync(id, locale));
  } catch (e: any) {
    return c.json({ error: e.message || "Report not found" }, 404);
  }
});

app.get("/api/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  try {
    return c.json(await sm.getReportAsync(id, locale));
  } catch (e: any) {
    return c.json({ error: e.message || "Report not found" }, 404);
  }
});

// 7b. Update Execution Metadata
app.post("/api/sessions/:id/metadata", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const sm = getSessionManagerForContext(c);
  try {
    const updated = await sm.updateSessionMetadataAsync(id, body);
    return c.json({ success: true, report: updated });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.patch("/api/sessions/:id/metadata", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const sm = getSessionManagerForContext(c);
  try {
    const updated = await sm.updateSessionMetadataAsync(id, body);
    return c.json({ success: true, report: updated });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 8. Cohort Scatter
app.get("/api/cohort/scatter", async (c) => {
  const currentSessionId = c.req.query("current_session_id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  return c.json(await sm.getCohortScatterDataAsync(currentSessionId, locale));
});

// 8.1 Multi-Dimensional Leaderboard & TOPSIS Overview (ADR 0003 / Spec v2.3)
app.get("/api/leaderboard/overview", async (c) => {
  const currentSessionId = c.req.query("current_session_id");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const cohortData = await sm.getCohortScatterDataAsync(currentSessionId, locale);
  const inputs = (cohortData.subjects || []).map(subjectDataPointToLeaderboardInput);
  const overview = generateLeaderboardOverview(inputs);
  return c.json(overview);
});

// --- Auth & OAuth Matrix Routes ---

// Current User Profile
app.get("/api/auth/me", (c) => {
  const user = c.get("user");
  return c.json({ user: user || null });
});

// Logout
app.post("/api/auth/logout", (c) => {
  clearAuthCookie(c);
  return c.json({ success: true });
});

// User Completed Sessions (Issue #9 & #13)
app.get("/api/auth/sessions", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const sessions = await sm.getUserSessionsAsync(user.id, locale);
  return c.json({ user, sessions });
});

// Personal Test History & Trajectory Endpoint (GitHub Issue #13)
app.get("/api/me/sessions", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const sessions = await sm.getUserSessionsAsync(user.id, locale);
  return c.json({ user, sessions });
});

// Claim Guest Unclaimed Sessions upon Authentication
app.post("/api/sessions/claim", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const candidateIds: string[] = [];
  if (typeof body.session_id === "string" && body.session_id.trim()) {
    candidateIds.push(body.session_id.trim());
  }
  if (Array.isArray(body.session_ids)) {
    for (const id of body.session_ids) {
      if (typeof id === "string" && id.trim()) {
        candidateIds.push(id.trim());
      }
    }
  }
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const result = await sm.claimGuestSessionsAsync(user.id, candidateIds, locale);
  return c.json({
    success: true,
    claimed: result.claimed,
    sessions: result.sessions,
  });
});

// Personal Cognitive Assets / Unlocked Archetype Collection
app.get("/api/me/assets", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const data = await sm.getUserCognitiveAssetsAsync(user.id, locale);
  return c.json({
    user,
    ...data,
  });
});

// Personal Profile & Visibility Settings Endpoints (GitHub Issue #14)
app.get("/api/me/profile", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const um = getUserManagerForContext(c);
  const freshUser = (await um.getUserById(user.id)) || user;
  const providers = um.getConnectedProviders(freshUser);
  return c.json({ user: freshUser, providers });
});

app.put("/api/me/profile", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const um = getUserManagerForContext(c);
  try {
    const updated = await um.updateUserProfile(user.id, body);
    const token = await createAuthToken(updated);
    setAuthCookie(c, token);
    const providers = um.getConnectedProviders(updated);
    return c.json({ success: true, user: updated, providers });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Unlink a secondary OAuth provider (GitHub Issue #14)
const handleUnlinkProvider = async (c: any) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const provider = c.req.param("provider");
  const um = getUserManagerForContext(c);
  try {
    const updated = await um.unlinkProvider(user.id, provider);
    const token = await createAuthToken(updated);
    setAuthCookie(c, token);
    const providers = um.getConnectedProviders(updated);
    return c.json({ success: true, user: updated, providers });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
};

app.post("/api/me/providers/:provider/unlink", handleUnlinkProvider);
app.delete("/api/me/providers/:provider", handleUnlinkProvider);

// Initiate secondary OAuth provider linking (GitHub Issue #14)
app.get("/api/auth/link/:provider", (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const provider = c.req.param("provider");
  if (!["github", "linuxdo", "google"].includes(provider)) {
    return c.json({ error: "Invalid provider" }, 400);
  }
  // Store linking user ID in secure cookie for callback
  setCookie(c, "oauth_link_uid", user.id, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  return c.redirect(`/api/auth/${provider}`);
});

// OAuth: Enabled Providers Discovery Endpoint
app.get("/api/auth/providers", (c) => {
  const providers = oauthService.getEnabledProviders(c.env);
  return c.json({ providers });
});

// GitHub OAuth: Authorization Redirect
app.get("/api/auth/github", (c) => {
  if (!oauthService.isProviderEnabled("github", c.env)) {
    return c.json({ error: "GitHub authentication is disabled" }, 403);
  }
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/github/callback`;
  const authUrl = oauthService.getGithubAuthUrl(state, redirectUri, c.env);
  return c.redirect(authUrl);
});

// GitHub OAuth: Callback
app.get("/api/auth/github/callback", async (c) => {
  if (!oauthService.isProviderEnabled("github", c.env)) {
    return c.json({ error: "GitHub authentication is disabled" }, 403);
  }
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state", { path: "/" });

  if (!code) {
    return c.json({ error: "Missing authorization code" }, 400);
  }
  if (savedState && state && savedState !== state) {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/github/callback`;
  try {
    const profile = await oauthService.handleGithubCallback(code, redirectUri, c.env);
    const um = getUserManagerForContext(c);
    const linkUid = getCookie(c, "oauth_link_uid");
    deleteCookie(c, "oauth_link_uid", { path: "/" });

    if (linkUid) {
      try {
        const updated = await um.linkProvider(linkUid, "github", {
          id: profile.provider_id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          metadata: profile.metadata,
        });
        const token = await createAuthToken(updated);
        setAuthCookie(c, token);
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ success: true, linked: true, user: updated });
        }
        return c.redirect("/settings?linked=github");
      } catch (linkErr: any) {
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ error: linkErr.message }, 400);
        }
        return c.redirect(`/settings?error=${encodeURIComponent(linkErr.message)}`);
      }
    }

    const user = await um.upsertUser({
      primary_provider: "github",
      provider_id: profile.provider_id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      metadata: profile.metadata,
    });
    const token = await createAuthToken(user);
    setAuthCookie(c, token);

    if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
      return c.json({ success: true, token, user });
    }
    return c.redirect("/");
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// LinuxDo OAuth: Authorization Redirect
app.get("/api/auth/linuxdo", (c) => {
  if (!oauthService.isProviderEnabled("linuxdo", c.env)) {
    return c.json({ error: "LinuxDo authentication is disabled" }, 403);
  }
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  const authUrl = oauthService.getLinuxDoAuthUrl(state, redirectUri, c.env);
  return c.redirect(authUrl);
});

// LinuxDo OAuth: Callback
app.get("/api/auth/linuxdo/callback", async (c) => {
  if (!oauthService.isProviderEnabled("linuxdo", c.env)) {
    return c.json({ error: "LinuxDo authentication is disabled" }, 403);
  }
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state", { path: "/" });

  if (!code) {
    return c.json({ error: "Missing authorization code" }, 400);
  }
  if (savedState && state && savedState !== state) {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  try {
    const profile = await oauthService.handleLinuxDoCallback(code, redirectUri, c.env);
    const um = getUserManagerForContext(c);
    const linkUid = getCookie(c, "oauth_link_uid");
    deleteCookie(c, "oauth_link_uid", { path: "/" });

    if (linkUid) {
      try {
        const updated = await um.linkProvider(linkUid, "linuxdo", {
          id: profile.provider_id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          metadata: profile.metadata,
        });
        const token = await createAuthToken(updated);
        setAuthCookie(c, token);
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ success: true, linked: true, user: updated });
        }
        return c.redirect("/settings?linked=linuxdo");
      } catch (linkErr: any) {
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ error: linkErr.message }, 400);
        }
        return c.redirect(`/settings?error=${encodeURIComponent(linkErr.message)}`);
      }
    }

    const user = await um.upsertUser({
      primary_provider: "linuxdo",
      provider_id: profile.provider_id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      metadata: profile.metadata,
    });
    const token = await createAuthToken(user);
    setAuthCookie(c, token);

    if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
      return c.json({ success: true, token, user });
    }
    return c.redirect("/");
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Google Identity OAuth: Authorization Redirect
app.get("/api/auth/google", (c) => {
  if (!oauthService.isProviderEnabled("google", c.env)) {
    return c.json({ error: "Google authentication is disabled" }, 403);
  }
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = oauthService.getGoogleAuthUrl(state, redirectUri, c.env);
  return c.redirect(authUrl);
});

// Google Identity OAuth: Callback (with account deduplication by verified email)
app.get("/api/auth/google/callback", async (c) => {
  if (!oauthService.isProviderEnabled("google", c.env)) {
    return c.json({ error: "Google authentication is disabled" }, 403);
  }
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state", { path: "/" });

  if (!code) {
    return c.json({ error: "Missing authorization code" }, 400);
  }
  if (savedState && state && savedState !== state) {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/google/callback`;
  try {
    const profile = await oauthService.handleGoogleCallback(code, redirectUri, c.env);
    const um = getUserManagerForContext(c);
    const linkUid = getCookie(c, "oauth_link_uid");
    deleteCookie(c, "oauth_link_uid", { path: "/" });

    if (linkUid) {
      try {
        const updated = await um.linkProvider(linkUid, "google", {
          id: profile.provider_id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          metadata: profile.metadata,
        });
        const token = await createAuthToken(updated);
        setAuthCookie(c, token);
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ success: true, linked: true, user: updated });
        }
        return c.redirect("/settings?linked=google");
      } catch (linkErr: any) {
        if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
          return c.json({ error: linkErr.message }, 400);
        }
        return c.redirect(`/settings?error=${encodeURIComponent(linkErr.message)}`);
      }
    }

    const user = await um.upsertUser({
      primary_provider: "google",
      provider_id: profile.provider_id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      metadata: profile.metadata,
    });
    const token = await createAuthToken(user);
    setAuthCookie(c, token);

    if (c.req.header("accept")?.includes("application/json") || c.req.query("json") === "1") {
      return c.json({ success: true, token, user });
    }
    return c.redirect("/");
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

const extractAdminToken = async (c: any): Promise<string | undefined> => {
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  const queryToken = c.req.query("token");
  if (bearerToken || queryToken) return bearerToken || queryToken;
  const body = await c.req.json().catch(() => ({}));
  return body?.token;
};

// 9. Admin Verify
app.post("/api/admin/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const valid = body.token === getAdminPassword(c);
  return c.json({ valid });
});

// 10. Admin Sessions List
app.get("/api/admin/sessions", async (c) => {
  const token = await extractAdminToken(c);
  if (token !== getAdminPassword(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const data = await sm.getCohortScatterDataAsync(undefined, locale);
  return c.json({ sessions: data.subjects });
});

// 11. Admin Delete Session
app.delete("/api/admin/sessions/:id", async (c) => {
  const token = await extractAdminToken(c);
  if (token !== getAdminPassword(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const sm = getSessionManagerForContext(c);
  try {
    const success = await sm.deleteSessionAsync(id);
    return c.json({ success, id });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Decoupled static asset serving for dual runtime (Bun + Cloudflare Workers)
const serveAsset = (options: { root?: string; path?: string }) => {
  return async (c: any, next: any) => {
    // 1. Edge runtime (Cloudflare Workers Assets binding)
    if (c.env?.ASSETS) {
      if (options.path) {
        const url = new URL(c.req.url);
        url.pathname = options.path.replace(/^\.\/dist/, "");
        return c.env.ASSETS.fetch(new Request(url.toString(), {
          method: c.req.method,
          headers: c.req.raw?.headers,
        }));
      }
      const res = await c.env.ASSETS.fetch(c.req.raw);
      if (res.status === 404 && !c.req.path.startsWith("/api") && !c.req.path.startsWith("/assets")) {
        const url = new URL(c.req.url);
        url.pathname = "/index.html";
        return c.env.ASSETS.fetch(new Request(url.toString(), {
          method: c.req.method,
          headers: c.req.raw?.headers,
        }));
      }
      return res;
    }

    // 2. Local runtime (Bun serveStatic)
    if (typeof Bun !== "undefined") {
      try {
        const { serveStatic } = await import("hono/bun");
        return await serveStatic(options)(c, next);
      } catch {
        return next();
      }
    }

    return next();
  };
};

app.use("/assets/*", serveAsset({ root: "./dist" }));
app.use("/favicon.ico", serveAsset({ root: "./dist" }));
app.use("/favicon.svg", serveAsset({ root: "./dist" }));
app.use("/logo.svg", serveAsset({ root: "./dist" }));
app.use("/logo.png", serveAsset({ root: "./dist" }));
app.use("/logo-1024.png", serveAsset({ root: "./dist" }));
app.use("/linuxdo-logo.svg", serveAsset({ root: "./dist" }));
app.use("/linuxdo-logo.png", serveAsset({ root: "./dist" }));
app.use("/linuxdo-logo-1024.png", serveAsset({ root: "./dist" }));

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getIndexHtmlTemplate(c: any): Promise<string> {
  // 1. Cloudflare Workers environment with ASSETS binding
  if (c.env?.ASSETS) {
    try {
      const url = new URL(c.req.url);
      url.pathname = "/index.html";
      const res = await c.env.ASSETS.fetch(new Request(url.toString(), {
        method: "GET",
        headers: c.req.raw?.headers,
      }));
      if (res && res.status === 200) {
        return await res.text();
      }
    } catch {}
  }

  // 2. Local filesystem (dist/index.html or src/frontend/index.html)
  try {
    const distPath = path.resolve("./dist/index.html");
    if (fs.existsSync(distPath)) {
      return fs.readFileSync(distPath, "utf-8");
    }
    const srcPath = path.resolve("./src/frontend/index.html");
    if (fs.existsSync(srcPath)) {
      return fs.readFileSync(srcPath, "utf-8");
    }
  } catch {}

  // 3. Fallback inline HTML skeleton
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Self-Test · 思维星图</title>
  </head>
  <body class="bg-[#0b0d13] text-[#e2e8f0] font-sans antialiased min-h-screen min-h-dvh">
    <div id="root"></div>
  </body>
</html>`;
}

export function generateOgSvg(
  report: FinalAssessmentReport | null,
  locale: SupportedLocale,
  shareUrl: string
): string {
  const isEn = String(locale).toLowerCase().startsWith("en");

  if (!report) {
    const title = isEn ? "Self-Test · Cognitive Manifold" : "Self-Test · 科学严谨的决策元认知评测";
    const subtitle = isEn ? "Test My Metacognition · Assessment Not Found" : "测测我的认知 · 探索你的思维流形与认知图腾";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="#0b0d13"/>
  <radialGradient id="bg" cx="50%" cy="40%" r="60%">
    <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#0b0d13" stop-opacity="1"/>
  </radialGradient>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="20" y="20" width="1160" height="590" rx="24" stroke="rgba(245, 158, 11, 0.3)" stroke-width="2"/>
  <text x="600" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#f8fafc" text-anchor="middle">${escapeHtml(title)}</text>
  <text x="600" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#94a3b8" text-anchor="middle">${escapeHtml(subtitle)}</text>
  <rect x="460" y="400" width="280" height="60" rx="30" fill="#f59e0b"/>
  <text x="600" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#0f172a" text-anchor="middle">${isEn ? "Test My Metacognition" : "测测我的认知"}</text>
</svg>`;
  }

  const dPrime = report.metrics?.d_prime ?? report.metacognitive_metrics?.d_prime ?? 0;
  const mRatio = report.metrics?.m_ratio ?? report.metacognitive_metrics?.m_ratio ?? 0;
  const bias = report.metrics?.calibration_bias ?? report.metacognitive_metrics?.calibration_bias ?? 0;
  const accuracy = report.metrics?.first_order_accuracy ?? report.summary?.first_order_accuracy ?? 0.75;
  const biasSign = bias >= 0 ? "+" : "";

  const subjectName = report.subject_name || (isEn ? "Explorer" : "探索者");

  let roleTitle = "";
  let totemOrOrder = "";
  let tagline = "";
  let primaryColor = "#f59e0b";
  let secondaryColor = "#fef08a";

  if (isEn) {
    const arcane = getArcaneArchetype(report.archetype || report.quadrant_code);
    roleTitle = report.diagnostic_profile?.role_title || arcane.roleTitle;
    totemOrOrder = arcane.orderTitle || arcane.roleTitle;
    tagline = report.diagnostic_profile?.praise_tagline || arcane.praiseTagline;
    primaryColor = arcane.colorScheme.primaryGold;
    secondaryColor = arcane.colorScheme.secondaryGold;
  } else {
    const mythic = getMythicArchetype(report.archetype || report.quadrant_code);
    roleTitle = report.diagnostic_profile?.role_title || mythic.roleTitle;
    totemOrOrder = `${mythic.mythicTotem} · ${mythic.totemTitle}`;
    tagline = report.diagnostic_profile?.praise_tagline || mythic.praiseTagline;
    primaryColor = mythic.colorScheme.primaryGold;
    secondaryColor = mythic.colorScheme.secondaryGold;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="gradText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="50%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#311042" stop-opacity="0.6"/>
      <stop offset="60%" stop-color="#0b0d13" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.08)"/>
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.02)"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#0b0d13"/>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>
  <rect x="24" y="24" width="1152" height="582" rx="24" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="2"/>

  <text x="64" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#e2e8f0" letter-spacing="2">SELF-TEST · 思维星图</text>
  <text x="1136" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#94a3b8" text-anchor="end">${escapeHtml(totemOrOrder)}</text>
  <line x1="64" y1="96" x2="1136" y2="96" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <text x="64" y="150" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#cbd5e1" letter-spacing="1">${isEn ? "EXPLORER" : "探索者"} · ${escapeHtml(subjectName)}</text>
  <text x="64" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" fill="url(#gradText)" letter-spacing="-1">${escapeHtml(roleTitle)}</text>
  <text x="64" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#fef08a">“${escapeHtml(tagline)}”</text>

  <!-- 4 Metrics Chips -->
  <rect x="64" y="340" width="245" height="110" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="88" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">${isEn ? "Sensitivity d'" : "一阶敏感度 d'"}</text>
  <text x="88" y="425" font-family="monospace, sans-serif" font-size="34" font-weight="800" fill="#38bdf8">${dPrime.toFixed(2)}</text>

  <rect x="333" y="340" width="245" height="110" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="357" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">${isEn ? "Metacog M-Ratio" : "元认知效率 M-Ratio"}</text>
  <text x="357" y="425" font-family="monospace, sans-serif" font-size="34" font-weight="800" fill="#a855f7">${mRatio.toFixed(2)}</text>

  <rect x="602" y="340" width="245" height="110" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="626" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">${isEn ? "Calibration Bias" : "决策校准偏差 Bias"}</text>
  <text x="626" y="425" font-family="monospace, sans-serif" font-size="34" font-weight="800" fill="#fbbf24">${biasSign}${bias.toFixed(2)}</text>

  <rect x="871" y="340" width="265" height="110" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="895" y="375" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">${isEn ? "Task Accuracy" : "任务准确率 Accuracy"}</text>
  <text x="895" y="425" font-family="monospace, sans-serif" font-size="34" font-weight="800" fill="#34d399">${Math.round(accuracy * 100)}%</text>

  <!-- Bottom CTA Footer -->
  <rect x="64" y="485" width="1072" height="85" rx="20" fill="rgba(245, 158, 11, 0.12)" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="96" y="535" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#f8fafc">${isEn ? "Test My Metacognition · Unveil Your Cognitive Manifold" : "测测我的认知 · 探索你的二元认知流形与决策神兽"}</text>
  <rect x="910" y="505" width="206" height="45" rx="22.5" fill="${primaryColor}"/>
  <text x="1013" y="534" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#0f172a" text-anchor="middle">${isEn ? "Start Assessment →" : "立即测测我的认知 →"}</text>
</svg>`;
}

// Dynamic OG Image endpoint for social link cards (1200x630 SVG)
const handleOgImage = async (c: any) => {
  const sessionId = c.req.param("sessionId");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const origin = getOrigin(c);
  const shareUrl = `${origin}/share/${sessionId}`;

  let report: FinalAssessmentReport | null = null;
  try {
    report = await sm.getReportAsync(sessionId, locale);
  } catch {}

  const svg = generateOgSvg(report, locale, shareUrl);
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};

app.get("/api/share/:sessionId/og-image", handleOgImage);
app.get("/api/share/:sessionId/og.svg", handleOgImage);

// Public Share Landing Page with Dynamic OG & Twitter Card Meta Tags (GitHub Issue #8)
const handleSharePage = async (c: any) => {
  const sessionId = c.req.param("sessionId");
  const locale = c.get("locale");
  const sm = getSessionManagerForContext(c);
  const origin = getOrigin(c);
  const shareUrl = `${origin}/share/${sessionId}`;

  let report: FinalAssessmentReport | null = null;
  try {
    report = await sm.getReportAsync(sessionId, locale);
  } catch {}

  const isEn = String(locale).toLowerCase().startsWith("en");

  let ogTitle = isEn
    ? "Self-Test · Cognitive Manifold Assessment"
    : "Self-Test · 思维星图 | 专属思维特质探索";
  let ogDescription = isEn
    ? "Self-Test: Rigorous 4AFC psychophysics and Type-2 metacognitive wagering assessment system."
    : "Self-Test (思维星图) - 科学严谨的二元认知流形与决策元认知评测系统";
  let ogImage = `${origin}/logo-1024.png`;

  if (report) {
    const dPrime = report.metrics?.d_prime ?? report.metacognitive_metrics?.d_prime ?? 0;
    const mRatio = report.metrics?.m_ratio ?? report.metacognitive_metrics?.m_ratio ?? 0;
    const bias = report.metrics?.calibration_bias ?? report.metacognitive_metrics?.calibration_bias ?? 0;
    const biasSign = bias >= 0 ? "+" : "";

    const subjectName = report.subject_name || (isEn ? "Explorer" : "受测者");

    if (isEn) {
      const arcane = getArcaneArchetype(report.archetype || report.quadrant_code);
      const roleTitle = report.diagnostic_profile?.role_title || arcane.roleTitle;
      const praiseTagline = report.diagnostic_profile?.praise_tagline || arcane.praiseTagline;
      ogTitle = `${subjectName}'s Cognitive Archetype · ${roleTitle}`;
      ogDescription = `"${praiseTagline}" | Order: ${arcane.orderTitle || roleTitle} | Sensitivity d'=${dPrime.toFixed(2)}, M-ratio=${mRatio.toFixed(2)}, Bias=${biasSign}${bias.toFixed(2)}. Uncover your cognitive manifold.`;
    } else {
      const mythic = getMythicArchetype(report.archetype || report.quadrant_code);
      const roleTitle = report.diagnostic_profile?.role_title || mythic.roleTitle;
      const praiseTagline = report.diagnostic_profile?.praise_tagline || mythic.praiseTagline;
      ogTitle = `${subjectName} 的元认知评测画像 · ${roleTitle} (${mythic.mythicTotem})`;
      ogDescription = `“${praiseTagline}” | 认知图腾：${mythic.mythicTotem} · ${mythic.totemAphorism} | 敏感度 d'=${dPrime.toFixed(2)}, 元认知效率 M-ratio=${mRatio.toFixed(2)}, 偏差=${biasSign}${bias.toFixed(2)}。测测你的二元认知流形。`;
    }
    ogImage = `${origin}/api/share/${sessionId}/og-image`;
  } else {
    if (isEn) {
      ogTitle = "Assessment Report Not Found · Self-Test";
      ogDescription = "The requested assessment report could not be found or has expired. Test your metacognition on Self-Test.";
    } else {
      ogTitle = "评测报告未找到 · Self-Test 思维星图";
      ogDescription = "该评测记录不存在或尚未完成。立即测测你的元认知流形与神兽图腾。";
    }
  }

  const rawHtml = await getIndexHtmlTemplate(c);

  const metaTags = [
    `<title>${escapeHtml(ogTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(ogDescription)}" />`,
    `<link rel="canonical" href="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Self-Test · 思维星图" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(ogDescription)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(ogTitle)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(ogDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
  ].join("\n    ");

  let modifiedHtml = rawHtml
    .replace(/<title>.*?<\/title>/gi, "")
    .replace(/<meta\s+property=["']og:title["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:description["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:image["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:image:.*?["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:url["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:site_name["'].*?>/gi, "")
    .replace(/<meta\s+property=["']og:type["'].*?>/gi, "")
    .replace(/<meta\s+name=["']description["'].*?>/gi, "")
    .replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, "");

  if (modifiedHtml.includes("<head>")) {
    modifiedHtml = modifiedHtml.replace("<head>", `<head>\n    ${metaTags}`);
  } else {
    modifiedHtml = `<head>\n    ${metaTags}\n  </head>\n` + modifiedHtml;
  }

  // Pre-render a crawler-friendly semantic block for crawlers or curl
  if (report) {
    const crawlerBlock = `\n    <noscript><div id="crawler-summary"><h1>${escapeHtml(ogTitle)}</h1><p>${escapeHtml(ogDescription)}</p><a href="/">测测我的认知</a></div></noscript>`;
    if (modifiedHtml.includes("</body>")) {
      modifiedHtml = modifiedHtml.replace("</body>", `${crawlerBlock}\n  </body>`);
    }
  }

  return c.html(modifiedHtml);
};

app.get("/share/:sessionId", handleSharePage);
app.get("/share/:sessionId/", handleSharePage);

app.get("/admin", serveAsset({ path: "./dist/index.html" }));
app.get("/admin/*", serveAsset({ path: "./dist/index.html" }));
app.get("/history", serveAsset({ path: "./dist/index.html" }));
app.get("/history/*", serveAsset({ path: "./dist/index.html" }));
app.get("/settings", serveAsset({ path: "./dist/index.html" }));
app.get("/settings/*", serveAsset({ path: "./dist/index.html" }));
app.get("/assets", serveAsset({ path: "./dist/index.html" }));
app.get("/assets/*", serveAsset({ path: "./dist/index.html" }));
app.get("/test", serveAsset({ path: "./dist/index.html" }));
app.get("/test/*", serveAsset({ path: "./dist/index.html" }));
app.get("/me", serveAsset({ path: "./dist/index.html" }));
app.get("/me/*", serveAsset({ path: "./dist/index.html" }));
app.get("/*", async (c, next) => {
  if (c.req.path.startsWith("/api")) {
    return next();
  }
  return serveAsset({ path: "./dist/index.html" })(c, next);
});

export { app };

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
};

// If run directly via `bun src/backend/server.ts`
if (typeof import.meta !== "undefined" && (import.meta as any).main) {
  // Startup bootstrap: ensure local database storage is checked and ready before serving requests
  getDefaultSessionManager();
  printAdminBanner(HOST, PORT);
}
