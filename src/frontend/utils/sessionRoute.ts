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
