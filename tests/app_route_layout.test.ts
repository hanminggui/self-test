import { describe, expect, it } from "bun:test";
import {
  resolveRouteView,
  canGuestStartNewSession,
} from "../src/frontend/utils/sessionRoute";

describe("App Layout Boundary & Dual-Mode Route Resolution", () => {
  it("未登录访问 / 时解析为独立的游客引导官网 (landing) 且不在 Layout 内", () => {
    const route = resolveRouteView("/", false);
    expect(route.view).toBe("landing");
    expect(route.inAppLayout).toBe(false);
  });

  it("已登录访问 / 与 /test 时解析为测评视图 (test) 且在 App Layout 内", () => {
    const homeRoute = resolveRouteView("/", true);
    expect(homeRoute.view).toBe("test");
    expect(homeRoute.inAppLayout).toBe(true);

    const testRoute = resolveRouteView("/test", true);
    expect(testRoute.view).toBe("test");
    expect(testRoute.inAppLayout).toBe(true);
  });

  it("未登录访问 /test 时允许游客访问答题页，但严格在 App Layout 外", () => {
    const route = resolveRouteView("/test", false);
    expect(route.view).toBe("test");
    expect(route.inAppLayout).toBe(false);
  });

  it("访问专属报告 /report/:id 时，根据当前是否登录决定是否在 App Layout 内", () => {
    const guestReport = resolveRouteView("/report/sess_123", false);
    expect(guestReport.view).toBe("report");
    expect(guestReport.inAppLayout).toBe(false);

    const userReport = resolveRouteView("/report/sess_123", true);
    expect(userReport.view).toBe("report");
    expect(userReport.inAppLayout).toBe(true);
  });

  it("历史记录 (/history)、个人偏好 (/settings) 与认知资产 (/assets) 为独立路由，登录时在 Layout 内，未登录时不在 Layout 内", () => {
    expect(resolveRouteView("/history", true)).toEqual({
      view: "history",
      inAppLayout: true,
    });
    expect(resolveRouteView("/settings", true)).toEqual({
      view: "settings",
      inAppLayout: true,
    });
    expect(resolveRouteView("/assets", true)).toEqual({
      view: "assets",
      inAppLayout: true,
    });

    expect(resolveRouteView("/history", false).inAppLayout).toBe(false);
    expect(resolveRouteView("/settings", false).inAppLayout).toBe(false);
    expect(resolveRouteView("/assets", false).inAppLayout).toBe(false);
  });

  it("兼容旧路由 /me 与 /me/settings 自动映射到独立路由 /history 与 /settings", () => {
    const meRoute = resolveRouteView("/me", true);
    expect(meRoute.view).toBe("history");
    expect(meRoute.inAppLayout).toBe(true);
    expect(meRoute.redirectTo).toBe("/history");

    const meSettingsRoute = resolveRouteView("/me/settings", true);
    expect(meSettingsRoute.view).toBe("settings");
    expect(meSettingsRoute.inAppLayout).toBe(true);
    expect(meSettingsRoute.redirectTo).toBe("/settings");
  });

  it("分享页 (/share/:id)、隐私协议 (/privacy)、服务协议 (/terms) 与管理后台 (/admin) 无论是否登录均在 App Layout 外", () => {
    for (const isAuthenticated of [false, true]) {
      expect(resolveRouteView("/share/sess_999", isAuthenticated)).toEqual({
        view: "share",
        inAppLayout: false,
      });
      expect(resolveRouteView("/privacy", isAuthenticated)).toEqual({
        view: "privacy",
        inAppLayout: false,
      });
      expect(resolveRouteView("/terms", isAuthenticated)).toEqual({
        view: "terms",
        inAppLayout: false,
      });
      expect(resolveRouteView("/admin", isAuthenticated)).toEqual({
        view: "admin",
        inAppLayout: false,
      });
    }
  });

  it("游客单画像限制：未登录且本地已有未认领画像时禁止开启新测试，需登录认领", () => {
    expect(canGuestStartNewSession(false, null)).toBe(true);
    expect(canGuestStartNewSession(false, "sess_unclaimed_001")).toBe(false);
    expect(canGuestStartNewSession(true, "sess_unclaimed_001")).toBe(true);
  });
});
