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
}

export class EvalLogger {
  private logFilePath: string;
  private apiKey?: string;
  private isDebug: boolean;
  private origLog = console.log.bind(console);
  private origWarn = console.warn.bind(console);
  private origError = console.error.bind(console);

  constructor(options: LoggerOptions) {
    const logsDir = options.logsDir || path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const now = new Date();
    const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const safeModelStr = options.model.replace(/[^a-zA-Z0-9_-]/g, "_");
    this.logFilePath = path.join(logsDir, `eval_${safeModelStr}_${timeStr}.log`);

    this.apiKey = options.apiKey;
    this.isDebug = Boolean(options.isDebug);
  }

  getLogPath(): string {
    return this.logFilePath;
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
    console.log = (...args: any[]) => this.log(...args);
    console.warn = (...args: any[]) => this.warn(...args);
    console.error = (...args: any[]) => this.error(...args);
  }
}
