/**
 * Dedicated Evaluation Logger with Real-Time Redaction & File Teeing (src/cli/lib/logger.ts)
 */

import * as fs from "fs";
import * as path from "path";

export interface LoggerOptions {
  model: string;
  apiKey?: string;
  logsDir?: string;
  isDebug?: boolean;
  disabled?: boolean;
}

export class EvalLogger {
  private logFilePath: string;
  private apiKey?: string;
  private isDebug: boolean;
  private disabled: boolean;
  private origLog = console.log.bind(console);
  private origWarn = console.warn.bind(console);
  private origError = console.error.bind(console);

  constructor(options: LoggerOptions) {
    this.disabled = Boolean(
      options.disabled ||
      process.env.NODE_ENV === "test" ||
      process.env.BUN_TEST === "1" ||
      process.env.EVAL_DISABLE_LOG === "1" ||
      process.env.EVAL_NO_LOG === "1"
    );

    this.apiKey = options.apiKey;
    this.isDebug = Boolean(options.isDebug);

    if (this.disabled) {
      this.logFilePath = "";
      return;
    }

    const logsDir = options.logsDir || path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const now = new Date();
    const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const safeModelStr = options.model.replace(/[^a-zA-Z0-9_-]/g, "_");
    this.logFilePath = path.join(logsDir, `eval_${safeModelStr}_${timeStr}.log`);
  }

  getLogPath(): string {
    return this.logFilePath;
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  /**
   * 安全脱敏：杜绝短串及本地关键词误杀，严格替换真实密钥与令牌
   */
  public redact(text: string): string {
    let cleaned = text;
    const key = this.apiKey;
    if (
      key &&
      key.length >= 8 &&
      key !== "mock-key" &&
      key !== "ollama" &&
      key !== "lm-studio" &&
      !["1", "2", "3", "test", "none"].includes(key)
    ) {
      cleaned = cleaned.replaceAll(key, "sk-***[REDACTED_API_KEY]");
    }
    cleaned = cleaned.replace(/sk-[a-zA-Z0-9_\-]{8,}/g, "sk-***[REDACTED]");
    cleaned = cleaned.replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{8,}/gi, "$1[REDACTED_TOKEN]");
    cleaned = cleaned.replace(/("Authorization"\s*:\s*")[^"]+(")/gi, '$1Bearer [REDACTED]$2');
    return cleaned;
  }

  private append(text: string) {
    if (this.disabled || !this.logFilePath) return;
    try {
      fs.appendFileSync(this.logFilePath, this.redact(text) + "\n", "utf-8");
    } catch { }
  }

  private formatArgs(args: any[]): string {
    return args
      .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
      .join(" ");
  }

  log(...args: any[]) {
    const raw = this.formatArgs(args);
    this.origLog(this.redact(raw));
    this.append(raw);
  }

  warn(...args: any[]) {
    const raw = this.formatArgs(args);
    this.origWarn(this.redact(raw));
    this.append(raw);
  }

  error(...args: any[]) {
    const raw = this.formatArgs(args);
    this.origError(this.redact(raw));
    this.append(raw);
  }

  debug(...args: any[]) {
    if (!this.isDebug) return;
    this.log(...args);
  }

  /**
   * 安装全局 Console 重定向（用于无侵入拦截第三方库打印并统一脱敏落盘）
   */
  installGlobalTee() {
    if (this.disabled) return;
    console.log = (...args: any[]) => this.log(...args);
    console.warn = (...args: any[]) => this.warn(...args);
    console.error = (...args: any[]) => this.error(...args);
  }

  uninstallGlobalTee() {
    console.log = this.origLog;
    console.warn = this.origWarn;
    console.error = this.origError;
  }
}
