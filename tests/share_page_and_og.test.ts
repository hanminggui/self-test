import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { app } from "../src/backend/server";
import { SessionManager } from "../src/backend/session_manager";
import { LocalSqliteAdapter } from "../src/storage";
import { SubjectType, CognitiveArchetype } from "../src/backend/models";
import { SharePage } from "../src/frontend/pages/SharePage";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";

describe("GitHub Issue #8: Public Share Page & Dynamic OG Meta Tags Suite", () => {
  // Helper to create a completed test session
  async function createTestSession(
    archetype: CognitiveArchetype = CognitiveArchetype.SOVEREIGN,
    subjectName: string = "伏羲042",
    locale: string = "zh-CN"
  ) {
    const memDb = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(memDb);

    const session = await sm.createSessionAsync({
      sessionId: "sess_share_test_001",
      subjectName,
      subjectType: SubjectType.HUMAN,
      totalTrials: 10,
      warmupTrials: 2,
      metadata: { locale },
    });

    // Complete session
    for (let i = 0; i < 10; i++) {
      const trialReq = await sm.getTrialRequestAsync(session.sessionId, locale as any);
      await sm.submitPhase1Async(session.sessionId, "A");
      await sm.submitPhase2Async(
        session.sessionId,
        "HIGH_BET" as any,
        0.8,
        undefined,
        undefined,
        locale as any
      );
    }

    const report = await sm.getReportAsync(session.sessionId, locale as any);
    return { sm, session, report };
  }

  it("1. GET /api/share/:id 与 /api/sessions/:id 提供公开免鉴权只读评测报告", async () => {
    const { sm, session } = await createTestSession();

    // 1.1 GET /api/share/:id (无 Auth Header / Cookie)
    const reqShare = new Request(`http://localhost:8000/api/share/${session.sessionId}`);
    const resShare = await app.fetch(reqShare, { sessionManager: sm });
    expect(resShare.status).toBe(200);
    const bodyShare = await resShare.json();
    expect(bodyShare.session_id).toBe(session.sessionId);
    expect(bodyShare.subject_name).toBe("伏羲042");
    expect(bodyShare.quadrant_code).toBeDefined();
    expect(bodyShare.diagnostic_profile).toBeDefined();

    // 1.2 GET /api/sessions/:id (无 Auth Header / Cookie)
    const reqSession = new Request(`http://localhost:8000/api/sessions/${session.sessionId}`);
    const resSession = await app.fetch(reqSession, { sessionManager: sm });
    expect(resSession.status).toBe(200);
    const bodySession = await resSession.json();
    expect(bodySession.session_id).toBe(session.sessionId);

    // 1.3 不存在的会话返回 404
    const reqNotFound = new Request(`http://localhost:8000/api/share/non_existent_id`);
    const resNotFound = await app.fetch(reqNotFound, { sessionManager: sm });
    expect(resNotFound.status).toBe(404);
  });

  it("2. GET /share/:sessionId 动态注入完整 Open Graph 与 Twitter Card Meta 标签", async () => {
    const { sm, session, report } = await createTestSession(
      CognitiveArchetype.SOVEREIGN,
      "伏羲042",
      "zh-CN"
    );

    const req = new Request(`http://localhost:8000/share/${session.sessionId}`, {
      headers: {
        "Accept-Language": "zh-CN",
      },
    });

    const res = await app.fetch(req, { sessionManager: sm });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();

    // 2.1 检查 Open Graph 核心标签
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('property="og:site_name"');
    expect(html).toContain(`<meta property="og:url" content="http://localhost:8000/share/${session.sessionId}" />`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain(`property="og:image" content="http://localhost:8000/api/share/${session.sessionId}/og-image"`);

    // 2.2 检查 Twitter Card 核心标签
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="twitter:description"');
    expect(html).toContain(`name="twitter:image" content="http://localhost:8000/api/share/${session.sessionId}/og-image"`);

    // 2.3 检查内容包含受测者姓名与流形/图腾信息
    expect(html).toContain("伏羲042");
    expect(html).toContain(report.diagnostic_profile.role_title);
    expect(html).toContain(report.diagnostic_profile.praise_tagline);
    expect(html).toContain("元认知效率 M-ratio");
  });

  it("3. 社交网络爬虫 (curl, Discord, Twitter, WeChat, Linux Do) 抓取均能获得预渲染 OG 元数据与语义摘要", async () => {
    const { sm, session, report } = await createTestSession(
      CognitiveArchetype.SOVEREIGN,
      "女娲007",
      "zh-CN"
    );

    const crawlerUserAgents = [
      "curl/8.4.0",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "Twitterbot/1.0",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (compatible; LinuxDoBot/1.0; +https://linux.do)",
    ];

    for (const ua of crawlerUserAgents) {
      const req = new Request(`http://localhost:8000/share/${session.sessionId}`, {
        headers: {
          "User-Agent": ua,
          "Accept-Language": "zh-CN",
        },
      });

      const res = await app.fetch(req, { sessionManager: sm });
      expect(res.status).toBe(200);
      const html = await res.text();

      // 验证每个爬虫均获得 og:title, og:description, og:image
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain("女娲007");

      // 验证爬虫语义快照
      expect(html).toContain('id="crawler-summary"');
      expect(html).toContain("测测我的认知");
    }
  });

  it("4. 英文模式下动态注入纯正 Western Arcane 秘法称号与英文 OG 元数据", async () => {
    const { sm, session, report } = await createTestSession(
      CognitiveArchetype.SOVEREIGN,
      "Arthur042",
      "en-US"
    );

    const req = new Request(`http://localhost:8000/share/${session.sessionId}?lang=en-US`, {
      headers: {
        "Accept-Language": "en-US",
      },
    });

    const res = await app.fetch(req, { sessionManager: sm });
    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain("Arthur042&#39;s Cognitive Archetype");
    expect(html).toContain(report.diagnostic_profile.role_title);
    expect(html).toContain("Sensitivity d&#39;=");
    expect(html).toContain("M-ratio=");
    expect(html).not.toContain("九天应龙");
  });

  it("5. 当请求不存在的会话时，返回优雅的兜底 OG 元标签", async () => {
    const memDb = new LocalSqliteAdapter(":memory:");
    const sm = new SessionManager(memDb);

    const req = new Request(`http://localhost:8000/share/invalid_session_id`, {
      headers: { "Accept-Language": "zh-CN" },
    });

    const res = await app.fetch(req, { sessionManager: sm });
    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain("评测报告未找到");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain("logo-1024.png");
  });

  it("6. GET /api/share/:sessionId/og-image 生成合法 1200x630 独立矢量 SVG 卡片", async () => {
    const { sm, session, report } = await createTestSession(
      CognitiveArchetype.SOVEREIGN,
      "伏羲042",
      "zh-CN"
    );

    const req = new Request(`http://localhost:8000/api/share/${session.sessionId}/og-image`);
    const res = await app.fetch(req, { sessionManager: sm });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/svg+xml");
    expect(res.headers.get("cache-control")).toContain("public");

    const svg = await res.text();
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"');
    expect(svg).toContain("SELF-TEST · 思维星图");
    expect(svg).toContain("伏羲042");
    expect(svg).toContain(report.diagnostic_profile.role_title);
    expect(svg).toContain("一阶敏感度 d'");
    expect(svg).toContain("元认知效率 M-Ratio");
    expect(svg).toContain("决策校准偏差 Bias");
    expect(svg).toContain("测测我的认知");
  });

  it("7. 前端 SharePage 组件成功渲染海报与突出的‘测测我的认知’(Test My Metacognition) CTA 按钮", () => {
    // SSR 验证 SharePage 组件在客户端/独立渲染时的完整结构
    const html = renderToString(
      React.createElement(
        LocaleProvider,
        null,
        React.createElement(SharePage)
      )
    );

    // 7.1 验证顶部与主体包含 "测测我的认知" / "Test My Metacognition" CTA 按钮
    expect(html).toContain("测测我的认知");
    expect(html).toContain("思维星图");

    // 7.2 包含页脚与合法协议导航
    expect(html).toContain("隐私政策");
    expect(html).toContain("用户协议");
  });

  it("8. Cloudflare Workers 边缘环境 (ASSETS binding 注入) 下平稳支持动态 OG 注入", async () => {
    const { sm, session } = await createTestSession();

    const mockAssets = {
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        if (url.pathname === "/index.html") {
          return new Response(
            `<!DOCTYPE html><html><head><title>Original Title</title></head><body><div id="root"></div></body></html>`,
            { headers: { "Content-Type": "text/html" }, status: 200 }
          );
        }
        return new Response("Not Found", { status: 404 });
      },
    };

    const req = new Request(`http://localhost:8000/share/${session.sessionId}`);
    const res = await app.fetch(
      req,
      { ASSETS: mockAssets, sessionManager: sm }
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('name="twitter:card"');
    expect(html).not.toContain("Original Title");
    expect(html).toContain("伏羲042");
  });
});
