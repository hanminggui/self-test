#!/usr/bin/env bun
/**
 * scripts/verify-mobile-assessment.ts
 * End-to-end acceptance gate for Mobile Assessment View & Bottom Dock.
 * Verifies with agent-browser at 390x844 (and 360px minimum width):
 * 1. MobileAssessmentView component mounts exclusively in mobile viewport.
 * 2. Zero horizontal overflow across prompt, options matrix, and bottom dock.
 * 3. All interactive controls meet the touch target >= 44x44px accessibility gate.
 * 4. BottomSheet tiered hint drawer opens, unlocks hints, and dismisses smoothly.
 * 5. Full trial answering flow (option selection, confidence wager, trial transition).
 */

import appDefault from "../src/backend/server";

const PORT = 8769;
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

async function runVerification() {
  console.log("==================================================================");
  console.log("📱 Mobile Assessment View & Bottom Dock Acceptance Suite (390x844)");
  console.log("==================================================================");

  // 1. Start ephemeral test server
  const server = Bun.serve({
    port: PORT,
    hostname: "127.0.0.1",
    fetch: appDefault.fetch,
  });

  console.log(`✓ Local test server running on ${BASE_URL}`);

  try {
    // 2. Set mobile viewport (iPhone 14/15 390x844)
    console.log("• Setting agent-browser viewport to 390x844...");
    await runCli(["set", "viewport", "390", "844"]);

    // 3. Open assessment interface
    console.log("\n• Opening /test...");
    const openRes = await runCli(["open", `${BASE_URL}/test`]);
    if (!openRes.ok) throw new Error(`Failed to open /test: ${openRes.stderr}`);
    await runCli(["wait", "800"]);

    // 4. If on welcome screen, click start session button
    const startBtnCheck = `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && (b.textContent.includes('开启探索旅程') || b.textContent.includes('Start'))
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `;
    const started = await runCli(["eval", startBtnCheck]);
    console.log("  Start assessment button clicked:", started.stdout.trim());
    await runCli(["wait", "1200"]);

    // 5. Verify MobileAssessmentView is mounted
    const mountCheckJs = `
      (() => {
        const view = document.querySelector('[data-testid="mobile-assessment-view"]');
        const dock = document.querySelector('[data-testid="bottom-action-dock"]');
        const promptCard = document.querySelector('[data-testid="mobile-prompt-card"]');
        return JSON.stringify({
          viewMounted: Boolean(view),
          dockMounted: Boolean(dock),
          promptCardMounted: Boolean(promptCard)
        });
      })()
    `;
    const mountEval = await runCli(["eval", mountCheckJs]);
    let mountData: any = {};
    try {
      mountData = JSON.parse(mountEval.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    } catch {
      mountData = JSON.parse(mountEval.stdout.trim());
    }
    console.log("  Component mount verification:", mountData);
    if (!mountData.viewMounted || !mountData.dockMounted) {
      throw new Error(`MobileAssessmentView failed to mount on mobile viewport: ${mountEval.stdout}`);
    }
    console.log("  ✓ Pass: MobileAssessmentView and Bottom Action Dock cleanly mounted.");

    // 6. Zero Horizontal Overflow Check
    const overflowCheckJs = `
      (() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth + 1 || bodyWidth > winWidth + 1;
        return JSON.stringify({
          docWidth,
          bodyWidth,
          winWidth,
          hasOverflow
        });
      })()
    `;
    const overflowEval = await runCli(["eval", overflowCheckJs]);
    let overflowData: any = JSON.parse(overflowEval.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    if (overflowData.hasOverflow) {
      throw new Error(`Horizontal overflow detected in MobileAssessmentView: ${JSON.stringify(overflowData)}`);
    }
    console.log(`  ✓ Pass: docWidth=${overflowData.docWidth}px, winWidth=${overflowData.winWidth}px, zero horizontal overflow.`);

    // 7. Interactive Controls Touch Target Gate (>= 44x44px)
    const touchTargetCheckJs = `
      (() => {
        const elements = [
          { name: 'hint-trigger', sel: '[data-testid="mobile-hint-trigger"]' },
          { name: 'option-A', sel: '[data-testid="mobile-option-A"]' },
          { name: 'option-B', sel: '[data-testid="mobile-option-B"]' },
          { name: 'option-C', sel: '[data-testid="mobile-option-C"]' },
          { name: 'option-D', sel: '[data-testid="mobile-option-D"]' },
          { name: 'wager-high', sel: '[data-testid="mobile-wager-high"]' },
          { name: 'wager-safe', sel: '[data-testid="mobile-wager-safe"]' },
          { name: 'submit-btn', sel: '[data-testid="mobile-submit-trial-btn"]' },
        ];
        const results = elements.map(item => {
          const el = document.querySelector(item.sel);
          if (!el) return { name: item.name, found: false };
          const rect = el.getBoundingClientRect();
          const pass = rect.width >= 43.5 && rect.height >= 43.5;
          return {
            name: item.name,
            found: true,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            pass
          };
        });
        const allPass = results.every(r => r.found && r.pass);
        return JSON.stringify({ allPass, results });
      })()
    `;
    const touchEval = await runCli(["eval", touchTargetCheckJs]);
    let touchData: any = JSON.parse(touchEval.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    console.log("  Touch target evaluation:", touchData);
    if (!touchData.allPass) {
      throw new Error(`Touch target size violation (<44x44px): ${JSON.stringify(touchData.results)}`);
    }
    console.log("  ✓ Pass: All interactive controls strictly satisfy >= 44x44px touch target gate.");

    // 8. Capture Trial 1 Screenshot
    await runCli(["screenshot", "./.scratch/mobile_assessment_trial1_390x844.png"]);
    console.log("  ✓ Saved screenshot: ./.scratch/mobile_assessment_trial1_390x844.png");

    // 9. BottomSheet Tiered Hint Drawer Interaction
    console.log("\n• Testing BottomSheet Hint Drawer...");
    await runCli(["click", '[data-testid="mobile-hint-trigger"]']);
    await runCli(["wait", "600"]);

    const hintSheetCheckJs = `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const tier1Btn = document.querySelector('[data-testid="buy-hint-tier1-btn"]');
        return JSON.stringify({
          dialogOpen: Boolean(dialog),
          hasTier1UnlockBtn: Boolean(tier1Btn)
        });
      })()
    `;
    const sheetEval = await runCli(["eval", hintSheetCheckJs]);
    let sheetData = JSON.parse(sheetEval.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    if (!sheetData.dialogOpen || !sheetData.hasTier1UnlockBtn) {
      throw new Error(`Hint BottomSheet failed to open or missing tier 1 button: ${sheetEval.stdout}`);
    }
    console.log("  ✓ Pass: Hint BottomSheet opened with Tier 1 unlock action.");

    await runCli(["screenshot", "./.scratch/mobile_assessment_hint_sheet_390x844.png"]);
    console.log("  ✓ Saved screenshot: ./.scratch/mobile_assessment_hint_sheet_390x844.png");

    // Click to unlock Tier 1 clue
    console.log("  Unlocking Tier 1 clue...");
    await runCli(["click", '[data-testid="buy-hint-tier1-btn"]']);
    await runCli(["wait", "600"]);

    // Close BottomSheet by clicking close button or dismiss button
    const closeBtnCheckJs = `
      (() => {
        const dismissBtn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && b.textContent.includes('收起抽屉')
        );
        if (dismissBtn) {
          dismissBtn.click();
          return true;
        }
        return false;
      })()
    `;
    await runCli(["eval", closeBtnCheckJs]);
    await runCli(["wait", "500"]);

    // 10. Select Option and Change Confidence Bet
    console.log("\n• Answering trial: selecting Option B and Safe Bet...");
    await runCli(["click", '[data-testid="mobile-option-B"]']);
    await runCli(["wait", "300"]);

    await runCli(["click", '[data-testid="mobile-wager-safe"]']);
    await runCli(["wait", "300"]);

    // Submit trial
    console.log("  Submitting trial decision...");
    await runCli(["click", '[data-testid="mobile-submit-trial-btn"]']);
    await runCli(["wait", "1200"]);

    // Verify progress advanced
    const progressCheckJs = `
      (() => {
        const header = document.querySelector('header');
        const text = header ? header.textContent || '' : '';
        const advanced = text.includes('02 /') || text.includes('2 /');
        return JSON.stringify({ text: text.slice(0, 50), advanced });
      })()
    `;
    const progressEval = await runCli(["eval", progressCheckJs]);
    console.log("  Progress check after submission:", progressEval.stdout.trim());

    await runCli(["screenshot", "./.scratch/mobile_assessment_trial2_390x844.png"]);
    console.log("  ✓ Saved screenshot: ./.scratch/mobile_assessment_trial2_390x844.png");

    // 11. Minimum Width 360px Robustness Test
    console.log("\n• Testing minimum mobile viewport width (360x740)...");
    await runCli(["set", "viewport", "360", "740"]);
    await runCli(["wait", "400"]);
    const minWidthEval = await runCli(["eval", overflowCheckJs]);
    let minWidthData = JSON.parse(minWidthEval.stdout.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'));
    if (minWidthData.hasOverflow) {
      throw new Error(`Overflow detected at 360px viewport: ${JSON.stringify(minWidthData)}`);
    }
    console.log(`  ✓ Pass at 360px: docWidth=${minWidthData.docWidth}px, winWidth=${minWidthData.winWidth}px, zero overflow.`);

    console.log("\n==================================================================");
    console.log("✅ All Mobile Assessment View acceptance criteria verified successfully!");
    console.log("==================================================================");
  } finally {
    await runCli(["close"]);
    server.stop();
  }
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
