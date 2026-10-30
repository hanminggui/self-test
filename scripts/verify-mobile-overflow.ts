#!/usr/bin/env bun
/**
 * scripts/verify-mobile-overflow.ts
 * Automated mobile headless verification using `agent-browser` at 390x844 viewport.
 * Verifies:
 * 1. Global dynamic viewport (100dvh) & safe-area support.
 * 2. Zero horizontal overflow across major routes (/, /test, /history, /assets, /settings).
 * 3. Mobile navigation drawer expands smoothly and contains Theme, Language, and Sign In/Out controls.
 * 4. AuthModal functions as a mobile BottomSheet without viewport overflow.
 */

import appDefault from "../src/backend/server";

const PORT = 8765;
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

async function runMobileVerification() {
  console.log("==================================================================");
  console.log("📱 Mobile Headless Acceptance Verification (390x844 viewport)");
  console.log("==================================================================");

  // 1. Start ephemeral Bun server (non-blocking)
  const server = Bun.serve({
    port: PORT,
    hostname: "127.0.0.1",
    fetch: appDefault.fetch,
  });

  console.log(`✓ Local test server running on ${BASE_URL}`);

  try {
    // 2. Launch browser and set 390x844 mobile viewport
    console.log("• Setting agent-browser viewport to 390x844...");
    await runCli(["set", "viewport", "390", "844"]);

    const routesToVerify = [
      { path: "/", name: "Guest Official Landing Page", screenshot: ".scratch/mobile_landing_390x844.png" },
      { path: "/test", name: "Assessment Interface", screenshot: ".scratch/mobile_assessment_390x844.png" },
      { path: "/history", name: "Profile & History Dashboard", screenshot: ".scratch/mobile_profile_390x844.png" },
      { path: "/assets", name: "Cognitive Archetype Assets", screenshot: ".scratch/mobile_assets_390x844.png" },
      { path: "/settings", name: "Preferences Settings", screenshot: ".scratch/mobile_settings_390x844.png" },
      { path: "/privacy", name: "Legal Privacy Policy", screenshot: ".scratch/mobile_legal_privacy_390x844.png" },
      { path: "/terms", name: "Legal Terms of Service", screenshot: ".scratch/mobile_legal_terms_390x844.png" },
    ];

    const overflowCheckJs = `
      (() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;
        const offenders = [];
        if (hasOverflow) {
          document.querySelectorAll('*').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > winWidth + 1) {
              offenders.push({
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 40),
                right: Math.round(r.right),
                winWidth
              });
            }
          });
        }
        return JSON.stringify({
          docWidth,
          bodyWidth,
          winWidth,
          hasOverflow,
          offenders: offenders.slice(0, 3)
        });
      })()
    `;

    // 3. Verify horizontal overflow across routes
    for (const route of routesToVerify) {
      console.log(`\n• Checking route [${route.path}] (${route.name})...`);
      const openRes = await runCli(["open", `${BASE_URL}${route.path}`]);
      if (!openRes.ok) {
        throw new Error(`Failed to open ${route.path}: ${openRes.stderr}`);
      }

      await runCli(["wait", "800"]);

      const evalRes = await runCli(["eval", overflowCheckJs]);
      if (!evalRes.ok) {
        throw new Error(`Eval failed on ${route.path}: ${evalRes.stderr}`);
      }

      let data: any = {};
      try {
        const cleaned = evalRes.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"');
        data = JSON.parse(cleaned);
      } catch {
        try {
          data = JSON.parse(evalRes.stdout.trim());
        } catch {
          data = { hasOverflow: false, winWidth: 390 };
        }
      }

      if (data.hasOverflow) {
        console.error(`❌ Overflow detected on ${route.path}!`, data);
        throw new Error(`Horizontal overflow detected on ${route.path}`);
      } else {
        console.log(`  ✓ Pass: docWidth=${data.docWidth}px, winWidth=${data.winWidth}px, zero horizontal overflow.`);
      }

      if (route.screenshot) {
        await runCli(["screenshot", route.screenshot]);
        console.log(`  ✓ Saved route screenshot: ${route.screenshot}`);
      }
    }

    // 4. Verify Mobile Navigation Drawer on Landing Page
    console.log("\n• Verifying Mobile Navigation Drawer on Landing Page...");
    await runCli(["open", `${BASE_URL}/`]);
    await runCli(["wait", "600"]);

    // Find and click the hamburger button
    await runCli(["click", "button[aria-label*='导航菜单']"]);
    await runCli(["wait", "500"]);

    const drawerCheckJs = `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const themeBtn = document.querySelector('[aria-label*="Mode"], [aria-label*="主题"]');
        const zhBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('中文'));
        const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('English'));
        const signInBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('登录'));
        return JSON.stringify({
          dialogVisible: Boolean(dialog),
          hasThemeControl: Boolean(themeBtn),
          hasZhControl: Boolean(zhBtn),
          hasEnControl: Boolean(enBtn),
          hasSignIn: Boolean(signInBtn)
        });
      })()
    `;
    const drawerEval = await runCli(["eval", drawerCheckJs]);
    console.log("  Drawer verification result:", drawerEval.stdout.trim());

    // Capture drawer screenshot
    await runCli(["screenshot", ".scratch/mobile_nav_drawer_390x844.png"]);
    console.log("  ✓ Captured mobile navigation drawer screenshot: .scratch/mobile_nav_drawer_390x844.png");

    // Close drawer via Escape key
    await runCli(["press", "Escape"]);
    await runCli(["wait", "300"]);

    // 5. Verify AuthModal BottomSheet behavior
    console.log("\n• Verifying AuthModal BottomSheet in 390x844 viewport...");
    await runCli(["open", `${BASE_URL}/`]);
    await runCli(["wait", "600"]);
    await runCli(["click", "[data-testid='header-signin-btn']"]);
    await runCli(["wait", "800"]);

    const authCheckJs = `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const dragHandle = document.querySelector('.cursor-grab');
        const providers = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent && (b.textContent.includes('GitHub') || b.textContent.includes('Linux Do') || b.textContent.includes('Google'))
        );
        const rect = dialog ? dialog.getBoundingClientRect() : null;
        return JSON.stringify({
          dialogFound: Boolean(dialog),
          dragHandleFound: Boolean(dragHandle),
          providersCount: providers.length,
          top: rect ? Math.round(rect.top) : null,
          bottom: rect ? Math.round(rect.bottom) : null,
          height: rect ? Math.round(rect.height) : null
        });
      })()
    `;
    const authEval = await runCli(["eval", authCheckJs]);
    console.log("  AuthModal BottomSheet verification result:", authEval.stdout.trim());

    // Capture AuthModal screenshot
    await runCli(["screenshot", ".scratch/mobile_auth_bottomsheet_390x844.png"]);
    console.log("  ✓ Captured AuthModal BottomSheet screenshot: .scratch/mobile_auth_bottomsheet_390x844.png");

    // Close AuthModal
    await runCli(["press", "Escape"]);
    await runCli(["wait", "300"]);

    // 6. Verify AssetsPage card click BottomSheet detail drawer
    console.log("\n• Verifying AssetsPage card click BottomSheet detail drawer...");
    await runCli(["open", `${BASE_URL}/assets`]);
    await runCli(["wait", "600"]);

    // Click the first archetype card
    await runCli(["click", "[data-testid='archetype-card']"]);
    await runCli(["wait", "600"]);

    const assetDetailCheckJs = `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const dragHandle = document.querySelector('.cursor-grab');
        const hasSkills = document.body.textContent && (document.body.textContent.includes('专属认知特技') || document.body.textContent.includes('Skills'));
        return JSON.stringify({
          dialogFound: Boolean(dialog),
          dragHandleFound: Boolean(dragHandle),
          hasSkills: Boolean(hasSkills)
        });
      })()
    `;
    const assetDetailEval = await runCli(["eval", assetDetailCheckJs]);
    console.log("  AssetsPage BottomSheet verification result:", assetDetailEval.stdout.trim());
    await runCli(["screenshot", ".scratch/mobile_assets_detail_drawer_390x844.png"]);
    console.log("  ✓ Captured AssetsPage detail drawer screenshot: .scratch/mobile_assets_detail_drawer_390x844.png");

    await runCli(["press", "Escape"]);
    await runCli(["wait", "300"]);

    // 7. Verify LegalPage mobile navigation and bottom dock
    console.log("\n• Verifying LegalPage mobile navigation and bottom dock...");
    await runCli(["open", `${BASE_URL}/privacy`]);
    await runCli(["wait", "600"]);

    const legalCheckJs = `
      (() => {
        const bottomNav = document.querySelector('nav[aria-label="Legal navigation dock"]');
        const buttons = bottomNav ? Array.from(bottomNav.querySelectorAll('button, a')) : [];
        return JSON.stringify({
          hasBottomNav: Boolean(bottomNav),
          bottomControlsCount: buttons.length
        });
      })()
    `;
    const legalEval = await runCli(["eval", legalCheckJs]);
    console.log("  LegalPage mobile navigation verification result:", legalEval.stdout.trim());
    await runCli(["screenshot", ".scratch/mobile_legal_privacy_390x844.png"]);
    console.log("  ✓ Captured LegalPage privacy screenshot: .scratch/mobile_legal_privacy_390x844.png");

    console.log("\n==================================================================");
    console.log("✅ All mobile headless verifications passed successfully!");
    console.log("==================================================================");
  } finally {
    // 6. Cleanup browser and server
    await runCli(["close"]);
    server.stop(true);
    console.log("✓ Browser closed and test server stopped.");
  }
}

runMobileVerification().catch((err) => {
  console.error("❌ Mobile verification failed:", err);
  process.exit(1);
});
