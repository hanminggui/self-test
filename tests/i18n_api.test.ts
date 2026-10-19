import { describe, expect, it } from "bun:test";
import app, { sessionManager, ADMIN_PASSWORD } from "../src/backend/server";

describe("Seam 4: Hono API Middleware & Dynamic Trial/Hint/Report Endpoints", () => {
  it("POST /api/sessions/start 支持 ?lang=en-US 并返回英文题干，且可随时无损中途切换为中文", async () => {
    // 1. 启动会话并指定英文
    const startRes = await app.fetch(
      new Request("http://localhost/api/sessions/start?lang=en-US", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_type: "LLM_AGENT",
          total_trials: 10,
          warmup_trials: 2,
          seed: 42,
        }),
      })
    );
    expect(startRes.status).toBe(200);
    const startData = (await startRes.json()) as any;
    expect(startData.session_id).toBeDefined();
    const sid = startData.session_id;

    // 验证初始题干为英文
    expect(startData.payload.prompt).toMatch(/[A-Za-z]/);
    expect(startData.payload.prompt).not.toMatch(/[\u4e00-\u9fa5]/);

    // 2. 查验 Mid-Trial 动态切换语言：请求中文
    const trialZHRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/trial?lang=zh-CN`)
    );
    expect(trialZHRes.status).toBe(200);
    const trialZH = (await trialZHRes.json()) as any;
    expect(trialZH.payload.prompt).toMatch(/[\u4e00-\u9fa5]/);
    expect(trialZH.payload.stimulus_id).toBe(startData.payload.stimulus_id);

    // 3. 再次切换回英文：通过 Accept-Language 请求头
    const trialENRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/trial`, {
        headers: { "Accept-Language": "en-US,en;q=0.9" },
      })
    );
    expect(trialENRes.status).toBe(200);
    const trialEN = (await trialENRes.json()) as any;
    expect(trialEN.payload.prompt).toMatch(/[A-Za-z]/);
    expect(trialEN.payload.prompt).not.toMatch(/[\u4e00-\u9fa5]/);
    expect(trialEN.payload.stimulus_id).toBe(startData.payload.stimulus_id);
  });

  it("POST /api/sessions/:id/hint 遵循请求语言返回双语线索与提示信息", async () => {
    const startRes = await app.fetch(
      new Request("http://localhost/api/sessions/start?lang=en-US", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_trials: 5,
          warmup_trials: 1,
          seed: 123,
        }),
      })
    );
    const { session_id: sid } = (await startRes.json()) as any;

    // 1. 请求英文线索
    const hintENRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/hint?lang=en-US`, {
        method: "POST",
      })
    );
    expect(hintENRes.status).toBe(200);
    const hintEN = (await hintENRes.json()) as any;
    expect(hintEN.tier).toBe(1);
    expect(hintEN.hint).toContain("Macro Direction");
    expect(hintEN.message).toContain("Unlocked Tier 1");

    // 2. 解锁 Tier 2，通过 X-Locale 请求头指定 zh-CN
    const hintZHRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/hint`, {
        method: "POST",
        headers: { "X-Locale": "zh-CN" },
      })
    );
    expect(hintZHRes.status).toBe(200);
    const hintZH = (await hintZHRes.json()) as any;
    expect(hintZH.tier).toBe(2);
    expect(hintZH.hint).toContain("微观细节穿透");
    expect(hintZH.message).toContain("已解锁第 2 级");
  });

  it("GET /api/sessions/:id/report 与 /api/admin/sessions 动态支持双语参数", async () => {
    const session = sessionManager.createSession({
      subjectType: "LLM_AGENT",
      subjectName: "Bilingual Agent",
      totalTrials: 2,
      warmupTrials: 0,
      seed: 888,
    });
    const sid = session.sessionId;

    // 提交答案使 session 产生报告
    const correctOpt = session.currentTask!.correct_option;
    sessionManager.processStep({
      session_id: sid,
      trial_index: 1,
      phase_1_response: { selected_option: correctOpt },
      phase_2_metacognitive_action: {
        action: "HIGH_BET" as any,
        confidence_level: 0.99,
      },
    });

    sessionManager.finalizeReport(session);

    // 1. 获取英文报告
    const repENRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/report?lang=en-US`)
    );
    expect(repENRes.status).toBe(200);
    const repEN = (await repENRes.json()) as any;
    expect(repEN.diagnostic_profile.role_title).toMatch(/The /);
    expect(repEN.diagnostic_profile.skills[0].type).toMatch(/Trait|Aptitude|Mastery|Synergy/);

    // 2. 获取中文报告
    const repZHRes = await app.fetch(
      new Request(`http://localhost/api/sessions/${sid}/report?lang=zh-CN`)
    );
    expect(repZHRes.status).toBe(200);
    const repZH = (await repZHRes.json()) as any;
    expect(repZH.diagnostic_profile.role_title).not.toMatch(/The /);
    expect(repZH.diagnostic_profile.skills[0].type).toMatch(/技能|特技|绝技|羁绊/);

    // 3. 管理端散点列表支持英文
    const adminRes = await app.fetch(
      new Request(`http://localhost/api/admin/sessions?token=${ADMIN_PASSWORD}&lang=en-US`)
    );
    expect(adminRes.status).toBe(200);
    const adminData = (await adminRes.json()) as any;
    const item = adminData.sessions.find((s: any) => s.id === sid);
    expect(item).toBeDefined();
    expect(item.role_title).toMatch(/The /);
  });
});
