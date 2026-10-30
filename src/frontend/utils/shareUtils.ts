/**
 * src/frontend/utils/shareUtils.ts
 * Unified Mobile Web Share API & Clipboard Fallback Utility
 */

export interface NativeShareOptions {
  title: string;
  text: string;
  url: string;
  blob?: Blob | null;
  filename?: string;
  source?: string;
  medium?: string;
}

export interface ShareResult {
  success: boolean;
  method: "native" | "clipboard" | "cancelled";
  message: string;
}

/**
 * 组装带 UTM 移动端社交传播追踪的短链
 */
export function buildTrackingShareUrl(
  rawUrl: string,
  source: string = "mobile_share",
  medium: string = "social"
): string {
  if (!rawUrl) return "";
  try {
    const origin = typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost:8000";
    const parsed = new URL(rawUrl, origin);
    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", source);
    }
    if (!parsed.searchParams.has("utm_medium")) {
      parsed.searchParams.set("utm_medium", medium);
    }
    if (!parsed.searchParams.has("utm_campaign")) {
      parsed.searchParams.set("utm_campaign", "archetype_report");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * 拷贝文本至系统剪贴板（兼容各端环境）
 */
export async function copyTextFallback(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 降级使用 textarea
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.setAttribute("readonly", "");
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 优先调用移动端系统原生 Web Share API (navigator.share)，
 * 在不支持或失败环境下平滑降级为一键复制短链到剪贴板。
 */
export async function triggerNativeShare(options: NativeShareOptions): Promise<ShareResult> {
  const shareUrl = buildTrackingShareUrl(options.url, options.source || "mobile_share", options.medium || "social");
  const title = options.title || "Self-Test 认知流形诊断报告";
  const text = options.text || "";

  // 1. 优先尝试系统原生 Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const payload: any = {
      title,
      text,
      url: shareUrl,
    };

    // 如果附带海报图片 Blob 且环境支持文件直传，尝试挂载海报文件
    if (options.blob && typeof File !== "undefined" && typeof navigator.canShare === "function") {
      try {
        const file = new File([options.blob], options.filename || "cognitive-archetype.png", {
          type: "image/png",
        });
        if (navigator.canShare({ files: [file] })) {
          payload.files = [file];
        }
      } catch (e) {
        console.warn("Could not attach poster image to navigator.share payload:", e);
      }
    }

    try {
      await navigator.share(payload);
      return {
        success: true,
        method: "native",
        message: "已调起系统分享面板",
      };
    } catch (err: any) {
      // 用户主动取消分享（例如在系统面板点击“取消”），不提示错误也不强制降级弹窗
      if (err?.name === "AbortError") {
        return {
          success: false,
          method: "cancelled",
          message: "已取消分享",
        };
      }
      console.warn("navigator.share encountered error, smoothly falling back to clipboard:", err);
    }
  }

  // 2. 平滑降级：复制带 UTM 的分享短链与精美文案至系统剪贴板
  const combinedText = text ? `${text}\n${shareUrl}` : shareUrl;
  const copied = await copyTextFallback(combinedText);

  if (copied) {
    return {
      success: true,
      method: "clipboard",
      message: "已复制专属分享链接到剪贴板！",
    };
  }

  return {
    success: false,
    method: "clipboard",
    message: "复制链接失败，请手动长按复制",
  };
}
