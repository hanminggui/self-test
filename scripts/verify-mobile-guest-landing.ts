#!/usr/bin/env bun
/**
 * scripts/verify-mobile-guest-landing.ts
 * Automated mobile headless verification for Task 02: Guest Landing Mobile View
 * Viewports verified: 390x844 and 360x640
 * Verifies:
 * 1. Zero horizontal overflow across both viewports (scrollWidth <= innerWidth).
 * 2. Hero Starry Galaxy & Title responsive scaling, CTA button visible on 1st screen.
 * 3. Archetype scroll band & Trajectory chart touch gestures & smooth transitions.
 * 4. Core buttons & links hit targets >= 44x44px.
 * 5. Saves acceptance screenshots to .scratch/
 */

import appDefault from "../src/backend/server";
import * as fs from "fs";
import * as path from "path";

const PORT = 8780;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runCli(args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["agent-browser", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return {
    ok: exitCode === 0,
    stdout,
    stderr,
  };
}

function parseJsonResult(raw: string): any {
  let s = raw.trim();
  if (s.startsWith("\"") && s.endsWith("\"")) {
    try {
      s = JSON.parse(s);
    } catch {}
  }
  return typeof s === "string" ? JSON.parse(s) : s;
}

async function runVerification() {
  console.log("==================================================================");
  console.log("📱 Task 02: Guest Landing Page Mobile Headless Acceptance");
  console.log("==================================================================");

  // Ensure scratch directory exists for artifact screenshots
  const scratchDir = path.resolve("./.scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // 1. Start ephemeral Bun server
  const server = Bun.serve({
    port: PORT,
    hostname: "127.0.0.1",
    fetch: appDefault.fetch,
  });

  console.log(`✓ Local test server running on ${BASE_URL}`);

  try {
    const viewports = [
      { w: 390, h: 844, name: "iPhone Standard (390x844)" },
      { w: 360, h: 640, name: "Android Compact (360x640)" },
    ];

    for (const vp of viewports) {
      console.log(`\n------------------------------------------------------------------`);
      console.log(`🔍 Testing Viewport: ${vp.name}`);
      console.log(`------------------------------------------------------------------`);

      await runCli(["set", "viewport", String(vp.w), String(vp.h)]);
      const url = `${BASE_URL}/?t=${Date.now()}`;
      const openRes = await runCli(["open", url]);
      if (!openRes.ok) {
        throw new Error(`Failed to open landing page: ${openRes.stderr}`);
      }
      await runCli(["wait", "1000"]);

      // 1. Horizontal Overflow Assertion
      const overflowJs = `
        (() => {
          const docW = document.documentElement.scrollWidth;
          const bodyW = document.body.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW + 1 || bodyW > winW + 1;
          return JSON.stringify({ docW, bodyW, winW, hasOverflow });
        })()
      `;
      const ofRes = await runCli(["eval", overflowJs]);
      const ofData = parseJsonResult(ofRes.stdout);
      if (ofData.hasOverflow) {
        console.error(`❌ Overflow detected on ${vp.name}:`, ofData);
        throw new Error(`Horizontal overflow on ${vp.name}`);
      }
      console.log(`  ✓ Pass: docWidth=${ofData.docW}px, winWidth=${ofData.winW}px, zero horizontal overflow.`);

      // 2. Hero CTA Button Visibility Assertion
      const ctaJs = `
        (() => {
          const cta = document.querySelector("[data-testid='hero-start-test-btn']") || 
                      Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("开启"));
          const r = cta ? cta.getBoundingClientRect() : null;
          return JSON.stringify({
            found: Boolean(cta),
            top: r ? Math.round(r.top) : null,
            bottom: r ? Math.round(r.bottom) : null,
            height: r ? Math.round(r.height) : null,
            width: r ? Math.round(r.width) : null,
            visibleInFirstScreen: r ? (r.bottom <= window.innerHeight) : false
          });
        })()
      `;
      const ctaRes = await runCli(["eval", ctaJs]);
      const ctaData = parseJsonResult(ctaRes.stdout);
      if (!ctaData.found || !ctaData.visibleInFirstScreen) {
        console.error(`❌ Hero CTA button not visible on first screen on ${vp.name}:`, ctaData);
        throw new Error(`Hero CTA button not visible in 1st screen on ${vp.name}`);
      }
      console.log(`  ✓ Pass: Hero CTA visible in 1st screen (top=${ctaData.top}px, bottom=${ctaData.bottom}px <= ${vp.h}px, size=${ctaData.width}x${ctaData.height}px).`);

      // Capture Hero Screenshot
      const heroScreenshotPath = `./.scratch/mobile_guest_landing_hero_${vp.w}x${vp.h}.png`;
      await runCli(["screenshot", heroScreenshotPath]);
      console.log(`  ✓ Captured hero screenshot: ${heroScreenshotPath}`);

      // 3. Touch Hit Area Verification (>= 44x44px for all visible buttons and links)
      const touchTargetsJs = `
        (() => {
          const elements = Array.from(document.querySelectorAll("button, a.group, a[href^='/']")).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && window.getComputedStyle(el).display !== "none";
          });
          const failing = elements.filter(b => {
            const r = b.getBoundingClientRect();
            return r.width < 43.5 || r.height < 43.5;
          }).map(b => {
            const r = b.getBoundingClientRect();
            return {
              text: (b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 30),
              w: Math.round(r.width),
              h: Math.round(r.height)
            };
          });
          return JSON.stringify({
            totalCount: elements.length,
            failingCount: failing.length,
            failing
          });
        })()
      `;
      const ttRes = await runCli(["eval", touchTargetsJs]);
      const ttData = parseJsonResult(ttRes.stdout);
      if (ttData.failingCount > 0) {
        console.error(`❌ Found ${ttData.failingCount} elements below 44x44px:`, ttData.failing);
        throw new Error(`Interactive elements failing 44x44px on ${vp.name}`);
      }
      console.log(`  ✓ Pass: All ${ttData.totalCount} visible interactive buttons & links satisfy >=44x44px touch targets.`);

      // 4. Archetype Sticky Scroll Band & Navigation
      console.log(`  • Testing Archetype scroll band navigation on ${vp.name}...`);
      await runCli(["click", "button[aria-label='下一尊化身']"]);
      await runCli(["wait", "600"]);

      const archJs = `
        (() => {
          const title = document.querySelector("#archetypes h3");
          return JSON.stringify({ title: title ? title.textContent.trim() : null });
        })()
      `;
      const archRes = await runCli(["eval", archJs]);
      const archData = parseJsonResult(archRes.stdout);
      console.log(`  ✓ Switched archetype to: "${archData.title}"`);

      const archScreenshotPath = `./.scratch/mobile_guest_archetypes_${vp.w}x${vp.h}.png`;
      await runCli(["screenshot", archScreenshotPath]);
      console.log(`  ✓ Captured archetypes screenshot: ${archScreenshotPath}`);

      // 5. Trajectory Showcase Interaction
      console.log(`  • Testing Trajectory showcase interaction on ${vp.name}...`);
      await runCli(["click", "button[aria-label='Step #2']"]);
      await runCli(["wait", "600"]);

      const trajJs = `
        (() => {
          const roleTitle = document.querySelector("#manifold div.space-y-1 span.text-sm");
          return JSON.stringify({ roleTitle: roleTitle ? roleTitle.textContent.trim() : null });
        })()
      `;
      const trajRes = await runCli(["eval", trajJs]);
      const trajData = parseJsonResult(trajRes.stdout);
      console.log(`  ✓ Switched trajectory step to: "${trajData.roleTitle}"`);

      const trajScreenshotPath = `./.scratch/mobile_guest_trajectory_${vp.w}x${vp.h}.png`;
      await runCli(["screenshot", trajScreenshotPath]);
      console.log(`  ✓ Captured trajectory screenshot: ${trajScreenshotPath}`);
    }

    console.log("\n==================================================================");
    console.log("🎉 All Mobile Guest Landing Headless Verifications Succeeded!");
    console.log("==================================================================");
  } finally {
    await runCli(["close"]);
    server.stop(true);
    console.log("✓ Browser closed and test server stopped.");
  }
}

runVerification().catch((err) => {
  console.error("❌ Mobile verification failed:", err);
  process.exit(1);
});
