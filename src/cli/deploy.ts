#!/usr/bin/env bun
/**
 * Cloudflare Edge Zero-Config Deployment Automation
 * Dynamically resolves D1 database ID for the current Cloudflare account,
 * applies remote migrations, and deploys without hardcoding instance IDs in git.
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(import.meta.dir, "../..");
const wranglerTomlPath = path.join(projectRoot, "wrangler.toml");

function runCommand(cmd: string[], options: { capture?: boolean; env?: Record<string, string> } = {}) {
  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd: projectRoot,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf-8",
    env: { ...process.env, ...(options.env || {}) },
  });
  return result;
}

async function main() {
  // 0. Ensure frontend assets are built (dist/index.html)
  const distHtml = path.join(projectRoot, "dist", "index.html");
  if (!fs.existsSync(distHtml)) {
    console.log("📦 Frontend build missing. Executing: bun run build...");
    const buildRes = runCommand(["bun", "run", "build"]);
    if (buildRes.status !== 0) {
      console.error("❌ Frontend build failed.");
      process.exit(buildRes.status ?? 1);
    }
  }

  const content = fs.readFileSync(wranglerTomlPath, "utf-8");

  // 1. Check if database_id is already explicitly configured in wrangler.toml
  const hasDbId = /database_id\s*=\s*["'][^"']+["']/.test(content);

  let tempConfigPath: string | null = null;

  if (!hasDbId) {
    let dbId = process.env.D1_DATABASE_ID || process.env.CLOUDFLARE_DATABASE_ID;

    if (!dbId) {
      console.log("🔍 Checking D1 database 'self-test-db' in Cloudflare account...");
      const infoRes = runCommand(["bunx", "wrangler", "d1", "info", "self-test-db", "--json"], { capture: true });
      if (infoRes.status === 0 && infoRes.stdout) {
        try {
          const parsed = JSON.parse(infoRes.stdout);
          dbId = parsed.uuid;
          console.log(`✅ Found existing D1 database 'self-test-db' (${dbId})`);
        } catch {}
      }

      if (!dbId) {
        console.log("⚡ D1 database 'self-test-db' not found. Creating it automatically...");
        const createRes = runCommand(["bunx", "wrangler", "d1", "create", "self-test-db", "--json"], { capture: true });
        if (createRes.status === 0 && createRes.stdout) {
          try {
            const parsed = JSON.parse(createRes.stdout);
            dbId = parsed.uuid;
            console.log(`✅ Successfully created D1 database 'self-test-db' (${dbId})`);
          } catch {}
        }
      }
    }

    if (dbId) {
      // 2. Apply remote migrations to ensure target database has required schema
      console.log("📦 Applying remote migrations to D1 database...");
      runCommand(["bunx", "wrangler", "d1", "migrations", "apply", "self-test-db", "--remote"], {
        env: { CI: "true" },
      });

      // 3. Construct temporary config at project root with resolved database_id
      tempConfigPath = path.join(projectRoot, "wrangler.tmp.toml");
      const updatedConfig = content.replace(
        /database_name\s*=\s*["']self-test-db["']/,
        `database_name = "self-test-db"\ndatabase_id = "${dbId}"`
      );
      fs.writeFileSync(tempConfigPath, updatedConfig, "utf-8");
    }
  }

  // 4. Run wrangler deploy
  const extraArgs = process.argv.slice(2);
  const deployCmd = ["bunx", "wrangler", "deploy"];
  if (tempConfigPath) {
    deployCmd.push("--config", tempConfigPath);
  }
  deployCmd.push(...extraArgs);

  console.log(`🚀 Executing: ${deployCmd.join(" ")}`);
  let exitCode = 0;
  try {
    const deployResult = runCommand(deployCmd);
    exitCode = deployResult.status ?? 0;
  } finally {
    // 5. Cleanup temporary config
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      try {
        fs.unlinkSync(tempConfigPath);
      } catch {}
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
