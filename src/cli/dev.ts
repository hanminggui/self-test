#!/usr/bin/env bun
/**
 * Unified Local Development Runner (src/cli/dev.ts)
 * Concurrently spawns:
 * 1. Backend Hono REST API server (port 8000, with Bun --watch)
 * 2. Frontend Vite Dev Server (port 3000, with React Fast Refresh / HMR)
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */

import { spawn } from "child_process";
import * as path from "path";

const projectRoot = path.resolve(import.meta.dir, "../..");

console.log("🚀 Starting Metacognitive Testing Local Development Environment...");
console.log("  • Backend API:  http://127.0.0.1:8000 (with hot-reload)");
console.log("  • Frontend UI:   http://localhost:3000 (with Vite HMR)");
console.log("------------------------------------------------------------------");

const backend = spawn("bun", ["--watch", "src/backend/server.ts"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

const frontend = spawn("bunx", ["vite"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

function handleExit() {
  try {
    if (backend && !backend.killed) backend.kill();
    if (frontend && !frontend.killed) frontend.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    handleExit();
  }
});

frontend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    handleExit();
  }
});
