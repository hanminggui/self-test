/**
 * Bun + Hono Web API Server for Metacognitive Testing System.
 * Serves REST endpoints, independent admin portal, and built frontend SPA.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import * as path from "path";
import * as fs from "fs";
import { SessionManager } from "./session_manager";
import { MetacognitiveAction, SubjectType, TrialResponse } from "./models";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Admin credentials
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || Math.random().toString(36).substring(2, 10);
const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "8000", 10);

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

export const sessionManager = new SessionManager();

// --- REST API Routes ---

// 1. Start Session
app.post("/api/sessions/start", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const session = sessionManager.createSession({
    sessionId: body.session_id,
    subjectName: body.subject_name,
    subjectType: body.subject_type || SubjectType.HUMAN,
    totalTrials: body.total_trials ?? 30,
    warmupTrials: body.warmup_trials ?? 10,
    initialDelta: body.initial_delta ?? 0.50,
    seed: body.seed,
  });
  return c.json(sessionManager.getTrialRequest(session.sessionId));
});

// 2. Get current trial
app.get("/api/sessions/:id/trial", (c) => {
  const id = c.req.param("id");
  try {
    return c.json(sessionManager.getTrialRequest(id));
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// 3. Submit Phase 1
app.post("/api/sessions/:id/phase1", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  try {
    return c.json(sessionManager.submitPhase1(id, body.choice));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 4. Request Hint
app.post("/api/sessions/:id/hint", (c) => {
  const id = c.req.param("id");
  try {
    return c.json(sessionManager.requestHint(id));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5. Submit Phase 2
app.post("/api/sessions/:id/phase2", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  try {
    return c.json(sessionManager.submitPhase2(
      id,
      body.action as MetacognitiveAction,
      body.confidence_level,
      body.revised_choice
    ));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 6. Unified step
app.post("/api/sessions/step", async (c) => {
  const body = await c.req.json() as TrialResponse;
  try {
    return c.json(sessionManager.processStep(body));
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 7. Get Report
app.get("/api/sessions/:id/report", (c) => {
  const id = c.req.param("id");
  try {
    return c.json(sessionManager.getReport(id));
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }
});

// 8. Cohort Scatter
app.get("/api/cohort/scatter", (c) => {
  const currentSessionId = c.req.query("current_session_id");
  return c.json(sessionManager.getCohortScatterData(currentSessionId));
});

// 9. Admin Verify
app.post("/api/admin/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const valid = body.token === ADMIN_PASSWORD;
  return c.json({ valid });
});

// 10. Admin Sessions List
app.get("/api/admin/sessions", (c) => {
  const data = sessionManager.getCohortScatterData();
  return c.json({ sessions: data.subjects });
});

import { serveStatic } from "hono/bun";

// Static assets serving via hono/bun
app.use("/assets/*", serveStatic({ root: "./dist" }));
app.use("/favicon.ico", serveStatic({ root: "./dist" }));

// Admin path SPA entry
app.get("/admin", serveStatic({ path: "./dist/index.html" }));

// Fallback to SPA index.html
app.get("/*", serveStatic({ path: "./dist/index.html" }));

export default {
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
};

// If run directly via `bun src/backend/server.ts`
if (import.meta.main) {
  printAdminBanner(HOST, PORT);
}
