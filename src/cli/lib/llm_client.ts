/**
 * OpenAI-compatible LLM Client with Structured Debug Tracing (src/cli/lib/llm_client.ts)
 */

import type { ThinkingEffort } from "../wizard";
import { formatDuration, formatTokenCount, getShortTime } from "./formatters";
import { cleanAndExtractJson, type ParsedLLMDecision } from "./json_parser";
import type { EvalLogger } from "./logger";

export interface LLMClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  isDebug?: boolean;
  thinking?: ThinkingEffort;
  logger?: EvalLogger;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
}

export interface LLMQueryResult<T = ParsedLLMDecision> {
  content: string;
  reasoning_content: string;
  parsed: T;
  usage?: TokenUsage;
}

export class LLMClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private isDebug: boolean;
  private thinking: ThinkingEffort;
  private logger?: EvalLogger;
  private totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
  };

  constructor(options: LLMClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.isDebug = Boolean(options.isDebug);
    this.thinking = options.thinking || "none";
    this.logger = options.logger;
  }

  public getSessionTokenUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  public recordUsage(usage: Partial<TokenUsage>) {
    this.totalUsage.promptTokens += usage.promptTokens || 0;
    this.totalUsage.completionTokens += usage.completionTokens || 0;
    this.totalUsage.totalTokens += usage.totalTokens || 0;
    this.totalUsage.cachedTokens += usage.cachedTokens || 0;
    this.totalUsage.reasoningTokens += usage.reasoningTokens || 0;
  }

  public resetSessionTokenUsage() {
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
    };
  }

  private log(msg: string) {
    if (this.logger) {
      this.logger.log(msg);
    } else {
      console.log(msg);
    }
  }

  private warn(msg: string) {
    if (this.logger) {
      this.logger.warn(msg);
    } else {
      console.warn(msg);
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
   * 执行单次结构化查询
   * 采用人类与模型极易比对的层级式 Debug 格式:
   * 
   * ----[DEBUG]  #num/allnum  step 1 ----
   * [req] time
   *   [system] xxxx
   *   [user] xxxx
   *   [schema]
   * [resp] time [duration]
   *   [reasoning] xxxx
   *   [content] xxxx
   *   [parsed] xxxx
   * --------
   */
  async query<T = ParsedLLMDecision>(
    messages: any[],
    schema: any,
    contextTag: string,
    temperature = 0.1
  ): Promise<LLMQueryResult<T>> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const isThinkingActive = Boolean(this.thinking && this.thinking !== "none");

    let currentPayload: Record<string, any> = {
      model: this.model,
      response_format: schema,
      messages,
    };

    if (isThinkingActive) {
      currentPayload.reasoning_effort = this.thinking;
    } else {
      currentPayload.temperature = temperature;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey && this.apiKey !== "ollama" && this.apiKey !== "lm-studio" && this.apiKey !== "none") {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const reqStartTime = Date.now();
    const reqTimeStr = getShortTime(new Date(reqStartTime));

    if (this.isDebug) {
      this.log(`\n----[DEBUG]  ${contextTag} ----`);
      this.log(`[req] ${reqTimeStr}`);
      if (isThinkingActive) {
        this.log(`  [thinking] ${this.thinking} (reasoning_effort: "${this.thinking}")`);
      }
      
      // 逐条输出会话消息
      for (const m of messages) {
        this.log(`  [${m.role}]`);
        const contentStr = String(m.content || "");
        for (const line of contentStr.split("\n")) {
          this.log(`    ${line}`);
        }
        if (m.reasoning_content) {
          this.log(`  [reasoning_context]`);
          for (const line of String(m.reasoning_content).split("\n")) {
            this.log(`    ${line}`);
          }
        }
      }

      // 输出结构化约束要求
      if (schema) {
        this.log(`  [schema]`);
        const properties = schema?.json_schema?.schema?.properties || schema;
        for (const line of JSON.stringify(properties, null, 2).split("\n")) {
          this.log(`    ${line}`);
        }
      }
    }

    let response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(currentPayload),
    });

    let rawResponseText = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(rawResponseText);
    } catch { }

    // 400 Bad Request 兼容性多级自适应降级重试
    if (!response.ok && response.status === 400) {
      const lowerErr = rawResponseText.toLowerCase();

      // 1. temperature 与推理模型冲突 (例如 OpenAI o1/o3 报错: temperature is not supported)
      if (lowerErr.includes("temperature") && currentPayload.temperature !== undefined) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (模型不支持自定义 temperature，剔除该参数重试)`);
        }
        delete currentPayload.temperature;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(currentPayload),
        });
        rawResponseText = await response.text();
        try { json = JSON.parse(rawResponseText); } catch { }
      }

      // 2. reasoning_effort 不受当前端点或模型支持
      if (!response.ok && response.status === 400 && (lowerErr.includes("reasoning_effort") || lowerErr.includes("unknown parameter"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 reasoning_effort 参数，剔除并降级重试)`);
        }
        delete currentPayload.reasoning_effort;
        currentPayload.temperature = temperature;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(currentPayload),
        });
        rawResponseText = await response.text();
        try { json = JSON.parse(rawResponseText); } catch { }
      }

      // 3. strict json_schema 不受支持，降级为 json_object 重试
      if (!response.ok && response.status === 400 && currentPayload.response_format?.type === "json_schema") {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (strict json_schema 不受支持，降级为 json_object 重试)`);
        }
        currentPayload.response_format = { type: "json_object" };
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(currentPayload),
        });
        rawResponseText = await response.text();
        try { json = JSON.parse(rawResponseText); } catch { }
      }
    }

    const durationMs = Date.now() - reqStartTime;
    const respTimeStr = getShortTime();
    const durationBadge = formatDuration(durationMs);

    if (!response.ok) {
      if (this.isDebug) {
        this.error(`[resp:error] ${respTimeStr} [${durationBadge}] HTTP ${response.status}`);
        for (const line of rawResponseText.split("\n")) {
          this.error(`  ${line}`);
        }
        this.error(`--------\n`);
      }
      throw new Error(`LLM API returned ${response.status}: ${rawResponseText}`);
    }

    const message = json?.choices?.[0]?.message;
    let rawContent = message?.content || "";
    let reasoningContent = message?.reasoning_content || message?.reasoning || "";

    // 针对本地模型或部分端点将思考过程放入 <think>...</think> 标签的情况进行兼容剥离
    if (!reasoningContent && typeof rawContent === "string" && rawContent.includes("<think>")) {
      const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        reasoningContent = thinkMatch[1].trim();
        rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      }
    }

    let parsed: T = {} as T;
    let parseError: string | null = null;
    try {
      parsed = cleanAndExtractJson(rawContent) as T;
    } catch (err: any) {
      parseError = err.message;
    }

    const rawUsage = json?.usage;
    let stepUsage: TokenUsage | undefined = undefined;
    if (rawUsage) {
      const promptTokens = Number(rawUsage.prompt_tokens ?? rawUsage.prompt_eval_count ?? 0);
      const completionTokens = Number(rawUsage.completion_tokens ?? rawUsage.eval_count ?? 0);
      const totalTokens = Number(rawUsage.total_tokens ?? (promptTokens + completionTokens));

      const cachedTokens = Number(
        rawUsage.prompt_tokens_details?.cached_tokens ??
        rawUsage.prompt_cache_hit_tokens ??
        rawUsage.cache_read_input_tokens ??
        rawUsage.cached_tokens ??
        0
      );

      const reasoningTokens = Number(
        rawUsage.completion_tokens_details?.reasoning_tokens ?? 0
      );

      stepUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
        cachedTokens,
        reasoningTokens,
      };

      this.recordUsage(stepUsage);
    }

    if (this.isDebug) {
      this.log(`[resp] ${respTimeStr} [${durationBadge}] HTTP ${response.status}`);
      
      if (stepUsage) {
        const cachedStr = stepUsage.cachedTokens > 0 ? ` (cached: ${formatTokenCount(stepUsage.cachedTokens, false)})` : "";
        const reasoningStr = stepUsage.reasoningTokens > 0 ? ` (reasoning: ${formatTokenCount(stepUsage.reasoningTokens, false)})` : "";
        this.log(`  [tokens] prompt: ${formatTokenCount(stepUsage.promptTokens, false)}${cachedStr}, completion: ${formatTokenCount(stepUsage.completionTokens, false)}${reasoningStr}, total: ${formatTokenCount(stepUsage.totalTokens, false)}`);
      }

      if (reasoningContent) {
        this.log(`  [reasoning]`);
        for (const line of String(reasoningContent).split("\n")) {
          this.log(`    ${line}`);
        }
      }

      this.log(`  [content]`);
      for (const line of String(rawContent).split("\n")) {
        this.log(`    ${line}`);
      }

      if (parsed && Object.keys(parsed).length > 0) {
        this.log(`  [parsed]`);
        for (const line of JSON.stringify(parsed, null, 2).split("\n")) {
          this.log(`    ${line}`);
        }
      }

      if (parseError) {
        this.warn(`  [parse_error] ${parseError}`);
      }

      this.log(`--------\n`);
    }

    return { content: rawContent, reasoning_content: reasoningContent, parsed, usage: stepUsage };
  }
}
