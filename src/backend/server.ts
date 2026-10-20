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
import { MetacognitiveAction, SubjectType, TrialResponse } from "./models";
import { runWithLocale, normalizeLocale, DEFAULT_LOCALE, type SupportedLocale } from "../i18n";

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

// User Completed Sessions
app.get("/api/auth/sessions", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const sessions = await sessionManager.getUserSessionsAsync(user.id);
  return c.json({ sessions });
});

// GitHub OAuth: Authorization Redirect
app.get("/api/auth/github", (c) => {
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/github/callback`;
  const authUrl = oauthService.getGithubAuthUrl(state, redirectUri);
  return c.redirect(authUrl);
});

// GitHub OAuth: Callback
app.get("/api/auth/github/callback", async (c) => {
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
    const profile = await oauthService.handleGithubCallback(code, redirectUri);
    const user = await userManager.upsertUser({
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
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  const authUrl = oauthService.getLinuxDoAuthUrl(state, redirectUri);
  return c.redirect(authUrl);
});

// LinuxDo OAuth: Callback
app.get("/api/auth/linuxdo/callback", async (c) => {
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
    const profile = await oauthService.handleLinuxDoCallback(code, redirectUri);
    const user = await userManager.upsertUser({
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
  const state = crypto.randomUUID();
  setCookie(c, "oauth_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  const origin = getOrigin(c);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = oauthService.getGoogleAuthUrl(state, redirectUri);
  return c.redirect(authUrl);
});

// Google Identity OAuth: Callback (with account deduplication by verified email)
app.get("/api/auth/google/callback", async (c) => {
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
    const profile = await oauthService.handleGoogleCallback(code, redirectUri);
    const user = await userManager.upsertUser({
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
app.get("/admin", serveAsset({ path: "./dist/index.html" }));
app.get("/admin/*", serveAsset({ path: "./dist/index.html" }));
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
