/**
 * Session Route & Permalink Utility (src/frontend/utils/sessionRoute.ts)
 * 
 * Provides dedicated routing helpers for retrieving and bookmarking
 * specific session reports:
 * - Path routes: /report/:id, /session/:id, /session/:id/report, /result/:id
 * - Query routes: ?session_id=:id, ?session=:id, ?report=:id, ?id=:id
 * - Hash routes: #/report/:id, #session_id=:id
 * - Local storage persistence for session recovery
 */

const STORAGE_KEY_LAST_SESSION = "metacognitive_last_completed_session_id";
const STORAGE_KEY_LAST_TIMESTAMP = "metacognitive_last_completed_timestamp";

/**
 * 从当前 URL (pathname, search, hash) 解析目标会话 ID
 */
export function extractSessionIdFromUrl(
  pathname: string = typeof window !== "undefined" ? window.location.pathname : "",
  search: string = typeof window !== "undefined" ? window.location.search : "",
  hash: string = typeof window !== "undefined" ? window.location.hash : ""
): string | null {
  // 1. 优先解析 Query 参数: ?session_id=xxx, ?session=xxx, ?report=xxx, ?id=xxx
  if (search) {
    const searchParams = new URLSearchParams(search);
    const candidate =
      searchParams.get("session_id") ||
      searchParams.get("session") ||
      searchParams.get("report") ||
      searchParams.get("report_id") ||
      searchParams.get("id");
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  // 2. 解析专用路径路由: /share/:id, /report/:id, /session/:id, /session/:id/report, /result/:id
  if (pathname) {
    const parts = pathname.split("/").filter(Boolean);
    
    // 匹配 /share/:id
    const shareIdx = parts.indexOf("share");
    if (shareIdx !== -1 && parts[shareIdx + 1]) {
      return parts[shareIdx + 1].trim();
    }

    // 匹配 /report/:id
    const reportIdx = parts.indexOf("report");
    if (reportIdx !== -1 && parts[reportIdx + 1]) {
      return parts[reportIdx + 1].trim();
    }

    // 匹配 /session/:id 或 /session/:id/report
    const sessionIdx = parts.indexOf("session");
    if (sessionIdx !== -1 && parts[sessionIdx + 1] && parts[sessionIdx + 1] !== "report") {
      return parts[sessionIdx + 1].trim();
    }

    // 匹配 /result/:id
    const resultIdx = parts.indexOf("result");
    if (resultIdx !== -1 && parts[resultIdx + 1]) {
      return parts[resultIdx + 1].trim();
    }
  }

  // 3. 兼容 Hash 路由模式: #/report/:id 或 #session_id=xxx
  if (hash) {
    const cleanHash = hash.replace(/^#\/?/, "");
    if (cleanHash.startsWith("report/")) {
      const parts = cleanHash.split("/");
      if (parts[1] && parts[1].trim()) return parts[1].trim();
    }
    const queryPart = cleanHash.includes("?") ? cleanHash.split("?")[1] : cleanHash;
    const hashParams = new URLSearchParams(queryPart);
    const candidate =
      hashParams.get("session_id") ||
      hashParams.get("session") ||
      hashParams.get("report");
    if (candidate && candidate.trim()) return candidate.trim();
  }

  return null;
}

/**
 * 组装专属会话报告的绝对或相对永久链接
 */
export function buildSessionReportUrl(sessionId: string, baseUrl?: string): string {
  const cleanId = encodeURIComponent(sessionId.trim());
  if (baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return `${cleanBase}/report/${cleanId}`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/report/${cleanId}`;
  }
  return `/report/${cleanId}`;
}

/**
 * 组装专属公开分享着陆页 (Public Share Page) 的绝对或相对永久链接
 */
export function buildSessionShareUrl(sessionId: string, baseUrl?: string): string {
  const cleanId = encodeURIComponent(sessionId.trim());
  if (baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return `${cleanBase}/share/${cleanId}`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/share/${cleanId}`;
  }
  return `/share/${cleanId}`;
}

/**
 * 将已完成会话持久化到本地存储（防止误关窗口丢失）
 */
export function saveLastCompletedSession(sessionId: string): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SESSION, sessionId.trim());
    localStorage.setItem(STORAGE_KEY_LAST_TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.warn("Could not save session to localStorage:", e);
  }
}

/**
 * 读取最近一次完成的会话 ID
 */
export function getLastCompletedSession(): { sessionId: string; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionId = localStorage.getItem(STORAGE_KEY_LAST_SESSION);
    if (!sessionId) return null;
    const tsStr = localStorage.getItem(STORAGE_KEY_LAST_TIMESTAMP);
    const timestamp = tsStr ? parseInt(tsStr, 10) : 0;
    return { sessionId, timestamp };
  } catch {
    return null;
  }
}

/**
 * 清除最近一次的本地会话记录
 */
export function clearLastCompletedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_SESSION);
    localStorage.removeItem(STORAGE_KEY_LAST_TIMESTAMP);
  } catch {}
}

export type AppViewType =
  | "landing"
  | "test"
  | "report"
  | "history"
  | "settings"
  | "assets"
  | "share"
  | "privacy"
  | "terms"
  | "admin";

export interface ResolvedRouteView {
  view: AppViewType;
  inAppLayout: boolean;
  redirectTo?: string;
}

/**
 * 统一路由与 App Layout 边界判定
 * 唯一标准：当前是否已登录 (isAuthenticated) + 访问的页面是否属于应用工作台路由
 */
export function resolveRouteView(
  pathname: string = typeof window !== "undefined" ? window.location.pathname : "/",
  isAuthenticated: boolean = false,
  search: string = typeof window !== "undefined" ? window.location.search : "",
  hash: string = typeof window !== "undefined" ? window.location.hash : ""
): ResolvedRouteView {
  const cleanPath = (pathname || "/").replace(/\/+$/, "") || "/";

  // 1. 始终在 App Layout 外的特殊/公共页面
  if (cleanPath === "/admin" || cleanPath.startsWith("/admin/")) {
    return { view: "admin", inAppLayout: false };
  }
  if (cleanPath === "/privacy" || cleanPath.startsWith("/privacy/")) {
    return { view: "privacy", inAppLayout: false };
  }
  if (cleanPath === "/terms" || cleanPath.startsWith("/terms/")) {
    return { view: "terms", inAppLayout: false };
  }
  if (cleanPath === "/share" || cleanPath.startsWith("/share/")) {
    return { view: "share", inAppLayout: false };
  }

  // 2. 独立路由：历史记录 (/history) 与 个人偏好 (/settings) 与 认知资产 (/assets)
  // 兼容旧路径 /me 与 /me/settings
  if (cleanPath === "/me/settings" || cleanPath.startsWith("/me/settings/")) {
    return {
      view: "settings",
      inAppLayout: isAuthenticated,
      redirectTo: "/settings",
    };
  }
  if (cleanPath === "/me" || cleanPath.startsWith("/me/")) {
    return {
      view: "history",
      inAppLayout: isAuthenticated,
      redirectTo: "/history",
    };
  }
  if (cleanPath === "/history" || cleanPath.startsWith("/history/")) {
    return { view: "history", inAppLayout: isAuthenticated };
  }
  if (cleanPath === "/settings" || cleanPath.startsWith("/settings/")) {
    return { view: "settings", inAppLayout: isAuthenticated };
  }
  if (cleanPath === "/assets" || cleanPath.startsWith("/assets/")) {
    return { view: "assets", inAppLayout: isAuthenticated };
  }

  // 3. 报告详情页路由 (/report/:id, /session/:id, /result/:id 或携带 session_id query)
  const extractedReportId = extractSessionIdFromUrl(cleanPath, search, hash);
  if (
    extractedReportId &&
    (cleanPath.startsWith("/report/") ||
      cleanPath.startsWith("/session/") ||
      cleanPath.startsWith("/result/") ||
      Boolean(search) ||
      Boolean(hash))
  ) {
    return {
      view: "report",
      inAppLayout: isAuthenticated,
    };
  }

  // 4. 答题测试页 (/test)
  if (cleanPath === "/test" || cleanPath.startsWith("/test/")) {
    return {
      view: "test",
      inAppLayout: isAuthenticated,
    };
  }

  // 5. 首页 (/)：未登录时为游客引导官网 (landing, Layout 外)，已登录时进入 App 测评台 (test, Layout 内)
  if (!isAuthenticated) {
    return {
      view: "landing",
      inAppLayout: false,
    };
  }

  return {
    view: "test",
    inAppLayout: true,
  };
}

/**
 * 游客单画像限制判定：
 * 游客只能保有一个未认领画像，当未登录且本地存在未认领画像会话 ID 时，不能开启新测试，需登录认领
 */
export function canGuestStartNewSession(
  isAuthenticated: boolean,
  unclaimedSessionId: string | null | undefined
): boolean {
  if (isAuthenticated) return true;
  return !unclaimedSessionId || !unclaimedSessionId.trim();
}

