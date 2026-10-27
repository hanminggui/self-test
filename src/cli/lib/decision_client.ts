/**
 * TypeSafe AI System One Decision Models Client (src/cli/lib/decision_client.ts)
 * 
 * Powered by @typesafe-ai/sdk (choice, noul, score, TypeSafeClient)
 * The origin of System One probabilistic classification & scoring models (Jev series & Baseten deployments).
 * Provides zero-overhead, multi-question inference and implements compatible TokenUsage/SpeedStats with LLMClient.
 */

import {
  choice,
  noul,
  score,
  TypeSafeClient,
  type ChoiceCriteria,
  type ChoiceQuestion,
  type ChoiceResponse,
  type NoulQuestion,
  type NoulResponse,
  type Question,
  type Questions,
  type ScoreCriteria,
  type ScoreQuestion,
  type ScoreResponse,
  type SystemOneResult,
} from "@typesafe-ai/sdk";
import { formatDuration, getShortTime } from "./formatters";
import type { SpeedStats, TokenUsage } from "./llm_client";
import type { EvalLogger } from "./logger";

export { choice, noul, score, TypeSafeClient };
export type { ChoiceCriteria, ChoiceQuestion, ChoiceResponse, NoulQuestion, NoulResponse, ScoreCriteria, ScoreQuestion, ScoreResponse };

export interface DecisionResult {
  answers: Record<string, any>;
  usage?: TokenUsage;
  durationMs: number;
  tokensPerSecond?: number;
  model: string;
}

export interface DecisionClientOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  isDebug?: boolean;
  logger?: EvalLogger;
  timeoutMs?: number | false;
  isMock?: boolean;
}

export class DecisionModelClient {
  private client: TypeSafeClient;
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private isDebug: boolean;
  private logger?: EvalLogger;
  private timeoutMs: number | false;
  private isMock: boolean;

  private totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
  };
  private totalGenerationMs: number = 0;
  private peakTps: number = 0;

  constructor(options: DecisionClientOptions) {
    const rawBase = (options.baseUrl || process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai").trim().replace(/\/+$/, "");
    let cleanBase = rawBase;
    // 递归剔除多余的 /v1/systemone, /systemone 或 /v1 后缀，确保给 SDK 的 baseURL 纯净（SDK 内部会自动追加 /v1/systemone）
    while (cleanBase.endsWith("/v1/systemone") || cleanBase.endsWith("/systemone") || cleanBase.endsWith("/v1")) {
      if (cleanBase.endsWith("/v1/systemone")) {
        cleanBase = cleanBase.slice(0, -"/v1/systemone".length).replace(/\/+$/, "");
      } else if (cleanBase.endsWith("/systemone")) {
        cleanBase = cleanBase.slice(0, -"/systemone".length).replace(/\/+$/, "");
      } else if (cleanBase.endsWith("/v1")) {
        cleanBase = cleanBase.slice(0, -"/v1".length).replace(/\/+$/, "");
      }
    }
    this.baseUrl = cleanBase || "https://api.typesafe.ai";
    this.apiKey = options.apiKey || process.env.TYPESAFE_API_KEY || process.env.BASETEN_API_KEY || process.env.OPENAI_API_KEY || (options.isMock ? "mock-key" : "");
    this.model = options.model || process.env.TYPESAFE_DEFAULT_MODEL || "jev-latest";
    this.isDebug = Boolean(options.isDebug);
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? false;
    this.isMock = Boolean(options.isMock);

    const effectiveKey = this.apiKey || (this.isMock ? "mock-key" : "");
    if (!effectiveKey && !this.isMock) {
      throw new Error("Missing TypeSafe API key. Set TYPESAFE_API_KEY or BASETEN_API_KEY in environment variables or pass apiKey.");
    }

    const wrappedFetch = async (url: string, init?: RequestInit): Promise<Response> => {
      // 1. Mock 快速仿真分支
      if (this.isMock) {
        let payload: any = {};
        try {
          payload = JSON.parse(String(init?.body || "{}"));
        } catch { }

        const questionsObj = payload.questions || {};
        const mockAnswers: Record<string, any> = {};

        for (const [qName, qDef] of Object.entries<any>(questionsObj)) {
          if (qDef.type === "choice") {
            let chosen = "A";
            let probs: Record<string, number> = {};
            if (qDef.criteria && typeof qDef.criteria === "object" && !Array.isArray(qDef.criteria)) {
              const keys = Object.keys(qDef.criteria);
              chosen = keys[Math.floor(Math.random() * keys.length)] || "A";
              const remainder = 0.15;
              const topProb = 0.85;
              const otherCount = Math.max(1, keys.length - 1);
              for (const k of keys) {
                probs[k] = k === chosen ? topProb : Math.round((remainder / otherCount) * 1000) / 1000;
              }
            } else {
              probs = { A: 0.85, B: 0.05, C: 0.05, D: 0.05 };
            }
            mockAnswers[qName] = {
              type: "choice",
              choice: chosen,
              confidence: probs[chosen] || 0.85,
              probabilities: probs,
            };
          } else if (qDef.type === "noul") {
            mockAnswers[qName] = {
              type: "noul",
              noul: 0.88,
            };
          } else if (qDef.type === "score") {
            mockAnswers[qName] = {
              type: "score",
              score: 0.75,
              confidence: 0.80,
            };
          }
        }

        const inputTokens = Math.floor(100 + Math.random() * 50);
        const outputTokens = Object.keys(questionsObj).length;
        const mockResponseBody = {
          model: this.model,
          answers: mockAnswers,
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
          },
        };

        const res = new Response(JSON.stringify(mockResponseBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        Object.defineProperty(res, "body", { get: () => undefined });
        return res;
      }

      // 2. 真实网络请求并消除 Bun 环境的流锁异常
      if (this.isDebug) {
        this.log(`  [TypeSafe fetch] ${init?.method || "POST"} ${url}`);
      }
      const rawRes = await globalThis.fetch(url, init);
      if (!rawRes.ok && this.isDebug) {
        this.error(`  [TypeSafe fetch:status] ${url} -> ${rawRes.status} ${rawRes.statusText}`);
      }
      Object.defineProperty(rawRes, "body", { get: () => undefined });
      return rawRes;
    };

    this.client = new TypeSafeClient({
      apiKey: effectiveKey,
      baseURL: this.baseUrl,
      defaultModel: this.model,
      timeout: typeof this.timeoutMs === "number" && this.timeoutMs > 0 ? this.timeoutMs : undefined,
      fetch: wrappedFetch,
    });
  }

  public getModel(): string {
    return this.model;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getSessionTokenUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  public recordUsage(usage: Partial<TokenUsage>, durationMs?: number) {
    this.totalUsage.promptTokens += usage.promptTokens || 0;
    this.totalUsage.completionTokens += usage.completionTokens || 0;
    this.totalUsage.totalTokens += usage.totalTokens || 0;
    this.totalUsage.cachedTokens += usage.cachedTokens || 0;
    this.totalUsage.reasoningTokens += usage.reasoningTokens || 0;

    if (durationMs !== undefined && durationMs >= 0 && (usage.completionTokens || 0) > 0) {
      const effectiveMs = Math.max(1, durationMs);
      this.totalGenerationMs += effectiveMs;
      const tps = Math.round(((usage.completionTokens || 0) / (effectiveMs / 1000)) * 10) / 10;
      if (tps > this.peakTps) {
        this.peakTps = tps;
      }
    }
  }

  public getSpeedStats(): SpeedStats {
    const avgTps = this.totalGenerationMs > 0 && this.totalUsage.completionTokens > 0
      ? Math.round((this.totalUsage.completionTokens / (this.totalGenerationMs / 1000)) * 10) / 10
      : 0;
    return {
      avgTps,
      peakTps: this.peakTps,
      totalCompletionTokens: this.totalUsage.completionTokens,
      totalGenerationMs: this.totalGenerationMs,
    };
  }

  public resetSessionTokenUsage() {
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
    };
    this.totalGenerationMs = 0;
    this.peakTps = 0;
  }

  private log(msg: string) {
    if (this.logger) {
      this.logger.log(msg);
    } else {
      console.log(msg);
    }
  }

  private error(msg: string) {
    if (this.logger) {
      this.logger.error(msg);
    } else {
      console.error(msg);
    }
  }

  /**
   * 使用 @typesafe-ai/sdk 执行 System One 决策提问
   */
  public async systemOne<Q extends Questions = Questions>(
    state: string | Record<string, any>,
    questions: Q,
    contextTag: string
  ): Promise<DecisionResult> {
    const reqStartTime = Date.now();
    const reqTimeStr = getShortTime(new Date(reqStartTime));

    if (this.isDebug) {
      this.log(`\n----[DEBUG]  ${contextTag} [TypeSafe AI System One] ----`);
      this.log(`[req] ${reqTimeStr}`);
      this.log(`  [model] ${this.model}`);
      this.log(`  [baseURL] ${this.baseUrl}`);
      this.log(`  [state]`);
      const statePreview = typeof state === "string" ? state : JSON.stringify(state, null, 2);
      for (const line of statePreview.split("\n").slice(0, 30)) {
        this.log(`    ${line}`);
      }
      this.log(`  [questions] (${Object.keys(questions).length} total)`);
      for (const [k, q] of Object.entries<any>(questions)) {
        this.log(`    - ${k} (${q.type}): ${q.instructions}`);
      }
    }

    let response: SystemOneResult<Q>;
    try {
      response = await this.client.systemOne({
        state,
        questions,
        model: this.model,
      });
    } catch (err: any) {
      const durationMs = Date.now() - reqStartTime;
      const respTimeStr = getShortTime();
      const durationBadge = formatDuration(durationMs);
      if (this.isDebug) {
        this.error(`[resp:error] ${respTimeStr} [${durationBadge}] ${err?.name || "Error"}: ${err?.message}`);
        this.error(`--------\n`);
      }
      if (err?.status === 404 || String(err?.message || "").includes("404")) {
        const enhancedErr = new Error(
          `Decision model endpoint 404 Not Found (Request target: ${this.baseUrl}/v1/systemone). Please ensure your Base URL does not include redundant /v1 or /v1/systemone.`
        );
        (enhancedErr as any).cause = err;
        throw enhancedErr;
      }
      if (err?.status === 451 || String(err?.message || "").includes("451")) {
        const enhancedErr = new Error(
          `TypeSafe API returned 451 (Unavailable in region). If you are accessing from an unsupported region, please configure an outbound proxy or evaluate via Baseten hosted models.`
        );
        (enhancedErr as any).cause = err;
        throw enhancedErr;
      }
      throw err;
    }

    const durationMs = Date.now() - reqStartTime;
    const respTimeStr = getShortTime();
    const durationBadge = formatDuration(durationMs);

    const inputTokens = Number(response.usage?.input_tokens ?? 0);
    const outputTokens = Number(response.usage?.output_tokens ?? Object.keys(questions).length);
    const totalTokens = inputTokens + outputTokens;

    const usage: TokenUsage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens,
      cachedTokens: 0,
      reasoningTokens: 0,
    };

    this.recordUsage(usage, durationMs);
    const tokensPerSecond = durationMs > 0 && outputTokens > 0
      ? Math.round((outputTokens / (durationMs / 1000)) * 10) / 10
      : undefined;

    if (this.isDebug) {
      this.log(`[resp] ${respTimeStr} [${durationBadge}] Success`);
      this.log(`  [answers]`);
      for (const [k, ans] of Object.entries<any>(response.answers)) {
        if (ans.type === "choice") {
          this.log(`    - ${k}: choice="${ans.choice}", conf=${ans.confidence ?? "N/A"}`);
        } else if (ans.type === "noul") {
          this.log(`    - ${k}: noul=${ans.noul}`);
        } else if (ans.type === "score") {
          this.log(`    - ${k}: score=${ans.score}, conf=${ans.confidence ?? "N/A"}`);
        }
      }
      this.log(`  [usage] input: ${inputTokens}, output: ${outputTokens}`);
      this.log(`--------\n`);
    }

    return {
      answers: response.answers as Record<string, any>,
      usage,
      durationMs,
      tokensPerSecond,
      model: response.model || this.model,
    };
  }

  /**
   * 别名方法，无缝兼容现有 decide 接口调用
   */
  public async decide(
    state: string | Record<string, any>,
    questions: any,
    contextTag: string
  ): Promise<DecisionResult> {
    return this.systemOne(state, questions, contextTag);
  }
}
