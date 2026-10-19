/**
 * Formatting and Display Utilities (src/cli/lib/formatters.ts)
 */

/**
 * 格式化时间戳 (时分秒 HH:mm:ss)
 */
export function getShortTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * 格式化完整日期时间 (YYYY-MM-DD HH:mm:ss)
 */
export function getFullDateTime(date: Date = new Date()): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d} ${getShortTime(date)}`;
}

/**
 * 自适应耗时格式化:
 * 32ms / 589ms / 1.2s / 39s / 2m21s / 1h15m20s
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.max(1, Math.round(ms))}ms`;
  }
  if (ms < 10000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) {
    return s > 0 ? `${m}m${s}s` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h${remM}m${s}s`;
}

/**
 * API Key 脱敏预览
 */
export function maskKey(key?: string): string {
  if (!key || key === "mock-key") return "无 / 未配置";
  if (key === "ollama" || key === "lm-studio") return "本地免鉴权";
  if (key.length <= 8) return "******";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * 人类友好的 Token 计数自适应格式化 (k/M 自动换算):
 * 580 -> "580 tokens"
 * 1234 -> "1.23k (1,234 tokens)"
 * 15420 -> "15.42k (15,420 tokens)"
 * 1250000 -> "1.25M (1,250,000 tokens)"
 */
export function formatTokenCount(tokens: number, includeExact = true): string {
  if (tokens <= 0 || isNaN(tokens)) return "0";
  let compact = "";
  if (tokens >= 1_000_000) {
    compact = `${(tokens / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  } else if (tokens >= 1_000) {
    compact = `${(tokens / 1_000).toFixed(2).replace(/\.?0+$/, "")}k`;
  } else {
    compact = `${tokens}`;
  }

  if (includeExact && tokens >= 1_000) {
    return `${compact} (${tokens.toLocaleString()} tokens)`;
  }
  return `${compact} tokens`;
}
