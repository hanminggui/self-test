/**
 * OpenAI-compatible LLM Client with Structured Debug Tracing (src/cli/lib/llm_client.ts)
 */

import type { ThinkingEffort } from "../wizard";
import { formatDuration, formatTokenCount, getShortTime } from "./formatters";
import { cleanAndExtractJson, rescueOptionFromReasoning, type ParsedLLMDecision } from "./json_parser";
import type { EvalLogger } from "./logger";
import { formatSamplingParams, type SamplingParams } from "./sampling_profiles";

export interface LLMClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  isDebug?: boolean;
  thinking?: ThinkingEffort;
  samplingParams?: SamplingParams;
  logger?: EvalLogger;
  timeoutMs?: number | false;
  stream?: boolean;
  contextLimit?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
}

export interface SpeedStats {
  avgTps: number;
  peakTps: number;
  totalCompletionTokens: number;
  totalGenerationMs: number;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMQueryOptions {
  tools?: any[];
  thinkingOverride?: ThinkingEffort;
  stream?: boolean;
  contextLimit?: number;
  contentReserve?: number;
}

/**
 * 高效死循环重复检测算法 (Degenerative Repetition Loop Detector)
 * 在模型发生车轱辘话死循环（如连续机械重复同一套分析模板）时提前识别并截断
 */
export function detectReasoningRepetition(text: string): boolean {
  if (!text || text.length < 100) return false;
  const windowSizes = [30, 60, 100, 150];
  for (const w of windowSizes) {
    if (text.length < w * 3) continue;
    const target = text.slice(-w);
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(target, pos)) !== -1) {
      count++;
      pos += 1;
      if (count >= 3) return true;
    }
  }
  return false;
}

/**
 * 将多轮对话、工具调用与零散思考片段展平为纯净的 2 条终结消息
 * 彻底消除中间 tool_calls / tool 回包的 schema 与 token 冗余，
 * 保持思考原文 100% 完整保留。
 */
export function flattenMessagesForSettlement(
  messages: any[],
  currentReasoning: string = ""
): any[] {
  const systemMsg = messages.find(m => m.role === "system");
  const firstUserMsg = messages.find(m => m.role === "user");

  const pastReasonings: string[] = [];
  for (const m of messages) {
    if (m.role === "assistant") {
      let r = m.reasoning_content || m.reasoning || "";
      if (!r && typeof m.content === "string" && m.content.includes("<think>")) {
        const match = m.content.match(/<think>([\s\S]*?)<\/think>/i);
        if (match) r = match[1].trim();
      }
      if (r && r.trim()) pastReasonings.push(r.trim());
    }
  }
  if (currentReasoning && currentReasoning.trim()) {
    pastReasonings.push(currentReasoning.trim());
  }
  const fullReasoning = pastReasonings.join("\n\n---\n\n");

  const baseUserContent = firstUserMsg?.content || "";
  const flattenedUserContent = `${baseUserContent}\n\n` +
    `【已完成的历史思考与推演草稿】\n` +
    `${fullReasoning}\n\n` +
    `【终结指令】\n` +
    `你此前已完成逻辑推演草稿。注意：即使推演草稿中存在未决事项或死循环重复，你也必须从 A、B、C、D 中做出最终裁决，绝不允许弃权或输出空内容！严禁继续思考，严禁调用任何工具，严格按以下 JSON 格式直接输出最终决策结果：\n` +
    `{"choice": "唯一选定的选项字母A/B/C/D", "action": "HIGH_BET或SAFE_BET", "confidence": 0.0到1.0之间的数值}`;

  const settlementMessages: any[] = [];
  if (systemMsg) {
    settlementMessages.push({
      role: "system",
      content: systemMsg.content,
    });
  }
  settlementMessages.push({
    role: "user",
    content: flattenedUserContent,
  });

  return settlementMessages;
}

export interface LLMQueryResult<T = ParsedLLMDecision> {
  content: string;
  reasoning_content: string;
  parsed: T;
  tool_calls?: LLMToolCall[];
  usage?: TokenUsage;
  durationMs: number;
  tokensPerSecond?: number;
}

export class LLMClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private isDebug: boolean;
  private thinking: ThinkingEffort;
  private samplingParams?: SamplingParams;
  private logger?: EvalLogger;
  private timeoutMs: number | false;
  private isStream: boolean;
  private contextLimit: number;
  private totalUsage: TokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
  };
  private totalGenerationMs: number = 0;
  private peakTps: number = 0;

  constructor(options: LLMClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.isDebug = Boolean(options.isDebug);
    this.thinking = options.thinking || "none";
    this.samplingParams = options.samplingParams;
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? false;
    this.isStream = options.stream ?? true;
    this.contextLimit = options.contextLimit ?? 8192;
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
    temperature = 0.1,
    queryOptions?: LLMQueryOptions
  ): Promise<LLMQueryResult<T>> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const effectiveThinking = queryOptions?.thinkingOverride ?? this.thinking;
    const isThinkingActive = Boolean(effectiveThinking && effectiveThinking !== "none");
    const hasTools = Boolean(queryOptions?.tools && queryOptions.tools.length > 0);
    const isLocalEndpoint = /^(https?:\/\/)?(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/i.test(this.baseUrl) ||
      this.baseUrl.includes("1234") || this.baseUrl.includes("11434");

    let currentPayload: Record<string, any> = {
      model: this.model,
      messages,
    };

    if (hasTools) {
      currentPayload.tools = queryOptions!.tools;
    }

    if (isThinkingActive) {
      currentPayload.reasoning_effort = effectiveThinking;
      currentPayload.chat_template_kwargs = { enable_thinking: true };
      // 本地推理引擎或挂载了 tools 时，不强加 strict response_format，防止拦截 <think> 或与 tool_calls 冲突
      if (!isLocalEndpoint && !hasTools && schema) {
        currentPayload.response_format = schema;
      }
    } else {
      // 显式关闭思考：防止自带思考权重的模型在多步模式或后置合成步骤偷跑 <think>
      currentPayload.reasoning_effort = "none";
      currentPayload.chat_template_kwargs = { enable_thinking: false };
      if (!hasTools && schema) {
        currentPayload.response_format = schema;
      }
      currentPayload.temperature = this.samplingParams?.temperature ?? temperature;
      if (this.samplingParams?.top_p !== undefined) currentPayload.top_p = this.samplingParams.top_p;
      if (this.samplingParams?.top_k !== undefined) currentPayload.top_k = this.samplingParams.top_k;
      if (this.samplingParams?.min_p !== undefined) currentPayload.min_p = this.samplingParams.min_p;
      if (this.samplingParams?.frequency_penalty !== undefined) currentPayload.frequency_penalty = this.samplingParams.frequency_penalty;
      if (this.samplingParams?.presence_penalty !== undefined) currentPayload.presence_penalty = this.samplingParams.presence_penalty;
      if (this.samplingParams?.repeat_penalty !== undefined) currentPayload.repeat_penalty = this.samplingParams.repeat_penalty;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey && this.apiKey !== "ollama" && this.apiKey !== "lm-studio" && this.apiKey !== "none") {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const reqStartTime = Date.now();
    const reqTimeStr = getShortTime(new Date(reqStartTime));

    const useStream = Boolean(queryOptions?.stream ?? this.isStream);
    if (useStream) {
      try {
        return await this.queryStream<T>(
          currentPayload,
          headers,
          schema,
          contextTag,
          temperature,
          queryOptions,
          reqStartTime
        );
      } catch (err: any) {
        if (this.isDebug) {
          this.warn(`  [stream:fallback] 流式请求未完成 (${err.message})，端点不支持或传输中断，自动降级为非流式请求重试`);
        }
        if (err.message && (err.message.includes("400") || err.message.toLowerCase().includes("stream"))) {
          this.isStream = false;
        }
        delete currentPayload.stream;
        delete currentPayload.stream_options;
      }
    }

    // 非流式思考请求安全防爆：注入 max_tokens 避免小模型无限死循环耗尽 contextLimit
    const estimatedPromptTokens = Math.max(10, Math.ceil(JSON.stringify(messages).length / 3));
    const effectiveContextLimit = queryOptions?.contextLimit ?? this.contextLimit ?? 8192;
    const effectiveContentReserve = queryOptions?.contentReserve ?? 800;
    const safeMaxTokens = Math.max(400, effectiveContextLimit - estimatedPromptTokens - effectiveContentReserve);
    if (isThinkingActive && currentPayload.max_tokens === undefined) {
      currentPayload.max_tokens = safeMaxTokens;
    }

    let response!: Response;
    let rawResponseText = "";
    let lowerErr = "";
    let json: any = null;

    const sendRequest = async () => {
      const fetchOptions: any = {
        method: "POST",
        headers,
        body: JSON.stringify(currentPayload),
      };

      if (this.timeoutMs === false || this.timeoutMs === 0) {
        // Bun 默认对 fetch 施加 300 秒（5分钟）硬超时。显式设置 timeout: false 彻底解除该限制
        fetchOptions.timeout = false;
      } else if (typeof this.timeoutMs === "number" && this.timeoutMs > 0) {
        fetchOptions.timeout = this.timeoutMs;
        fetchOptions.signal = AbortSignal.timeout(this.timeoutMs);
      }

      if (this.isDebug) {
        const reqTime = getShortTime();
        this.log(`\n---- [DEBUG REQUEST] ${contextTag} (${reqTime}) ----`);
        this.log(`POST ${endpoint}`);
        this.log(JSON.stringify(currentPayload, null, 2));
      }

      const reqStart = Date.now();
      response = await fetch(endpoint, fetchOptions);
      const reqDuration = Date.now() - reqStart;
      const respTime = getShortTime();
      rawResponseText = await response.text();
      lowerErr = rawResponseText.toLowerCase();
      json = null;
      try {
        json = JSON.parse(rawResponseText);
      } catch { }

      if (this.isDebug) {
        this.log(`\n---- [DEBUG RESPONSE] ${contextTag} (${respTime}) [${formatDuration(reqDuration)}] HTTP ${response.status} ----`);
        if (json) {
          this.log(JSON.stringify(json, null, 2));
        } else {
          this.log(rawResponseText);
        }
        this.log(`--------------------------------------------------------------------------------\n`);
      }
    };

    await sendRequest();

    // 400 Bad Request 兼容性多级自适应降级重试
    if (!response.ok && response.status === 400) {
      // 1. chat_template_kwargs 不受当前端点支持
      if (currentPayload.chat_template_kwargs !== undefined && (lowerErr.includes("chat_template_kwargs") || lowerErr.includes("enable_thinking") || lowerErr.includes("unknown") || lowerErr.includes("unrecognized") || lowerErr.includes("extra_forbidden"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 chat_template_kwargs 参数，剔除并重试)`);
        }
        delete currentPayload.chat_template_kwargs;
        await sendRequest();
      }

      // 2. temperature 与推理模型冲突 (例如 OpenAI o1/o3 报错: temperature is not supported)
      if (!response.ok && response.status === 400 && lowerErr.includes("temperature") && currentPayload.temperature !== undefined) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (模型不支持自定义 temperature，剔除该参数重试)`);
        }
        delete currentPayload.temperature;
        await sendRequest();
      }

      // 3. reasoning_effort 不受当前端点或模型支持
      if (!response.ok && response.status === 400 && currentPayload.reasoning_effort !== undefined && (lowerErr.includes("reasoning_effort") || lowerErr.includes("unknown") || lowerErr.includes("unrecognized") || lowerErr.includes("invalid"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 reasoning_effort 参数，剔除并降级重试)`);
        }
        delete currentPayload.reasoning_effort;
        if (!isThinkingActive) {
          currentPayload.temperature = temperature;
        }
        await sendRequest();
      }

      // 4. tools 不受当前模型或端点支持
      if (!response.ok && response.status === 400 && currentPayload.tools !== undefined && (lowerErr.includes("tool") || lowerErr.includes("function"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 tools 参数，剔除并降级重试)`);
        }
        delete currentPayload.tools;
        await sendRequest();
      }

      // 5. strict json_schema 不受支持，降级为 json_object 重试
      if (!response.ok && response.status === 400 && currentPayload.response_format?.type === "json_schema") {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (strict json_schema 不受支持，降级为 json_object 重试)`);
        }
        currentPayload.response_format = { type: "json_object" };
        await sendRequest();
      }

      // 6. max_tokens 不受部分端点支持或要求 max_completion_tokens
      if (!response.ok && response.status === 400 && currentPayload.max_tokens !== undefined && (lowerErr.includes("max_tokens") || lowerErr.includes("max_completion_tokens"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (max_tokens 冲突，转换为 max_completion_tokens 重试)`);
        }
        currentPayload.max_completion_tokens = currentPayload.max_tokens;
        delete currentPayload.max_tokens;
        await sendRequest();
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
    let toolCalls: LLMToolCall[] | undefined = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0
      ? message.tool_calls
      : undefined;

    // 针对本地模型或部分端点将思考过程放入 <think>...</think> 标签的情况进行兼容剥离
    if (!reasoningContent && typeof rawContent === "string" && rawContent.includes("<think>")) {
      const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        reasoningContent = thinkMatch[1].trim();
        rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      }
    }

    // 针对本地模型将工具调用输出为 <tool_call>...</tool_call> 文本标签的情况做兼容提取
    // 关键防御：仅当本次请求显式挂载了 tools (hasTools === true) 时才允许提取工具调用
    if (hasTools && !toolCalls && typeof rawContent === "string" && rawContent.includes("<tool_call>")) {
      const tcMatch = rawContent.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
      if (tcMatch) {
        try {
          const body = tcMatch[1].trim();
          // 兼容 Qwen 原生 <function=tool_name>args</function> 标签格式
          const qwenMatch = body.match(/<function=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/function>/i);
          if (qwenMatch) {
            toolCalls = [
              {
                id: `call_${Date.now()}`,
                type: "function",
                function: {
                  name: qwenMatch[1],
                  arguments: qwenMatch[2].trim() || "{}",
                },
              },
            ];
            rawContent = rawContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/i, "").trim();
          } else {
            const tcObj = JSON.parse(body);
            if (tcObj && tcObj.name) {
              toolCalls = [
                {
                  id: `call_${Date.now()}`,
                  type: "function",
                  function: {
                    name: tcObj.name,
                    arguments: typeof tcObj.arguments === "string" ? tcObj.arguments : JSON.stringify(tcObj.arguments || {}),
                  },
                },
              ];
              rawContent = rawContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/i, "").trim();
            }
          }
        } catch { }
      }
    } else if (!hasTools && typeof rawContent === "string" && rawContent.includes("<tool_call>")) {
      // 本次未提供 tools，模型若残留输出 <tool_call> 伪代码，安全剥离掉防止污染 JSON 解析
      rawContent = rawContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/i, "").trim();
    }

    let parsed: T = {} as T;
    let parseError: string | null = null;
    if (!toolCalls || toolCalls.length === 0 || rawContent.trim().length > 0) {
      try {
        parsed = cleanAndExtractJson(rawContent) as T;
      } catch (err: any) {
        if (reasoningContent && String(reasoningContent).trim() && (!toolCalls || toolCalls.length === 0)) {
          try {
            parsed = cleanAndExtractJson(reasoningContent) as T;
          } catch {
            parseError = err.message;
          }
        } else if (!toolCalls || toolCalls.length === 0) {
          parseError = err.message;
        }
      }
    }

    // 非流式截断或思考死循环防爆保底：若本次为思考请求，且未解析出有效决策但存在推演草稿
    const isFinishLength = json?.choices?.[0]?.finish_reason === "length";
    const needsNonStreamSettlement = isThinkingActive &&
      (!toolCalls || toolCalls.length === 0) &&
      (!parsed || !(parsed as any).choice) &&
      Boolean(reasoningContent);

    if (needsNonStreamSettlement) {
      if (this.isDebug) {
        this.log(`  [non-stream:breaker-settle] 非流式思考${isFinishLength ? "触碰长度截断(finish_reason: length)" : "未解析出决策"}，自动平铺推演原文 (${reasoningContent.length} 字符)，发起 Phase 2 快速终结...`);
      }
      const settlementMessages = flattenMessagesForSettlement(messages, reasoningContent);
      try {
        const settleRes = await this.query<T>(
          settlementMessages,
          schema,
          `${contextTag} [nonstream-settle]`,
          temperature,
          {
            thinkingOverride: "none",
            tools: undefined,
            stream: false,
          }
        );
        parsed = settleRes.parsed;
        rawContent = settleRes.content;
      } catch (settleErr: any) {
        if (this.isDebug) {
          this.warn(`  [non-stream:breaker-settle:fallback] Phase 2 终结失败: ${settleErr.message}`);
        }
      }
    }

    // 针对截断残局的兜底抢救：若解析失败且存在未完成的思考，尝试从思考文本抢救推导出的客观选项
    if ((!parsed || !(parsed as any).choice) && reasoningContent && (!toolCalls || toolCalls.length === 0)) {
      const rescuedChoice = rescueOptionFromReasoning(reasoningContent);
      if (rescuedChoice) {
        parsed = {
          ...(parsed || {}),
          choice: rescuedChoice,
          action: (parsed as any)?.action || "SAFE_BET",
          confidence: (parsed as any)?.confidence ?? 0.5,
        } as T;
      }
    }

    const rawUsage = json?.usage;
    let stepUsage: TokenUsage | undefined = undefined;
    let tokensPerSecond: number | undefined = undefined;
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

      if (completionTokens > 0) {
        const effectiveMs = Math.max(1, durationMs);
        tokensPerSecond = Math.round((completionTokens / (effectiveMs / 1000)) * 10) / 10;
      }

      this.recordUsage(stepUsage, durationMs);
    }

    if (this.isDebug && parseError) {
      this.warn(`  [parse_error] ${parseError}`);
    }

    return {
      content: rawContent,
      reasoning_content: reasoningContent,
      parsed,
      tool_calls: toolCalls,
      usage: stepUsage,
      durationMs,
      tokensPerSecond,
    };
  }

  /**
   * 流式请求并实时监控思考 token 预算，若接近上下文上限主动触发熔断并转入 Phase 2 结算
   */
  private async queryStream<T = ParsedLLMDecision>(
    payload: Record<string, any>,
    headers: Record<string, string>,
    schema: any,
    contextTag: string,
    temperature: number,
    queryOptions: LLMQueryOptions | undefined,
    reqStartTime: number
  ): Promise<LLMQueryResult<T>> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const streamPayload = {
      ...payload,
      stream: true,
      stream_options: { include_usage: true },
    };

    const isLocalEndpoint = /^(https?:\/\/)?(127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.)/i.test(this.baseUrl) ||
      this.baseUrl.includes("1234") || this.baseUrl.includes("11434");

    const abortController = new AbortController();
    let response!: Response;
    let rawResponseText = "";
    let lowerErr = "";

    const sendStreamRequest = async () => {
      const fetchOptions: any = {
        method: "POST",
        headers,
        body: JSON.stringify(streamPayload),
        signal: abortController.signal,
      };

      if (this.timeoutMs === false || this.timeoutMs === 0) {
        fetchOptions.timeout = false;
      } else if (typeof this.timeoutMs === "number" && this.timeoutMs > 0) {
        fetchOptions.timeout = this.timeoutMs;
      }

      if (this.isDebug) {
        const reqTime = getShortTime();
        this.log(`\n---- [DEBUG REQUEST] [STREAM] ${contextTag} (${reqTime}) ----`);
        this.log(`POST ${endpoint}`);
        this.log(JSON.stringify(streamPayload, null, 2));
      }

      response = await fetch(endpoint, fetchOptions);
      if (!response.ok) {
        rawResponseText = await response.text();
        lowerErr = rawResponseText.toLowerCase();
      }
    };

    const messages = streamPayload.messages || [];
    const estimatedPromptTokens = Math.max(10, Math.ceil(JSON.stringify(messages).length / 3));
    const effectiveThinking = queryOptions?.thinkingOverride ?? this.thinking;
    const isThinkingActive = effectiveThinking !== "none" && Boolean(effectiveThinking);

    await sendStreamRequest();

    // 400 Bad Request 兼容性多级自适应降级重试 (保持流式)
    if (!response.ok && response.status === 400) {
      // 1. 若错误明确指向 stream 不支持，直接抛错以便上层降级为非流式
      if (lowerErr.includes("stream") || lowerErr.includes("streaming")) {
        throw new Error(`Endpoint does not support streaming: ${rawResponseText}`);
      }

      // 2. chat_template_kwargs 不受支持
      if (streamPayload.chat_template_kwargs !== undefined && (lowerErr.includes("chat_template_kwargs") || lowerErr.includes("enable_thinking") || lowerErr.includes("unknown") || lowerErr.includes("unrecognized") || lowerErr.includes("extra_forbidden"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 chat_template_kwargs 参数，剔除并重试流式)`);
        }
        delete streamPayload.chat_template_kwargs;
        await sendStreamRequest();
      }

      // 3. temperature 与推理模型冲突
      if (!response.ok && response.status === 400 && lowerErr.includes("temperature") && streamPayload.temperature !== undefined) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (模型不支持自定义 temperature，剔除该参数重试流式)`);
        }
        delete streamPayload.temperature;
        await sendStreamRequest();
      }

      // 4. reasoning_effort 不受支持
      if (!response.ok && response.status === 400 && streamPayload.reasoning_effort !== undefined && (lowerErr.includes("reasoning_effort") || lowerErr.includes("unknown") || lowerErr.includes("unrecognized") || lowerErr.includes("invalid"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 reasoning_effort 参数，剔除并重试流式)`);
        }
        delete streamPayload.reasoning_effort;
        if (!isThinkingActive) {
          streamPayload.temperature = temperature;
        }
        await sendStreamRequest();
      }

      // 5. tools 不受支持
      if (!response.ok && response.status === 400 && streamPayload.tools !== undefined && (lowerErr.includes("tool") || lowerErr.includes("function"))) {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (端点不支持 tools 参数，剔除并重试流式)`);
        }
        delete streamPayload.tools;
        await sendStreamRequest();
      }

      // 6. strict json_schema 不受支持
      if (!response.ok && response.status === 400 && streamPayload.response_format?.type === "json_schema") {
        if (this.isDebug) {
          this.warn(`  [resp:fallback] HTTP 400 (strict json_schema 不受支持，降级为 json_object 重试流式)`);
        }
        streamPayload.response_format = { type: "json_object" };
        await sendStreamRequest();
      }
    }

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}: ${rawResponseText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable for streaming");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let totalRawText = "";
    let sseChunkCount = 0;
    let accumulatedReasoning = "";
    let accumulatedContent = "";
    const toolCallsMap = new Map<number, { id: string; name: string; args: string }>();
    let streamUsage: TokenUsage | undefined = undefined;
    let finishReason: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value, { stream: true });
        totalRawText += decoded;
        buffer += decoded;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(dataStr);
            sseChunkCount++;
            if (chunk.usage) {
              streamUsage = {
                promptTokens: Number(chunk.usage.prompt_tokens ?? chunk.usage.prompt_eval_count ?? 0),
                completionTokens: Number(chunk.usage.completion_tokens ?? chunk.usage.eval_count ?? 0),
                totalTokens: Number(chunk.usage.total_tokens ?? 0),
                cachedTokens: Number(chunk.usage.cached_tokens ?? 0),
                reasoningTokens: Number(chunk.usage.completion_tokens_details?.reasoning_tokens ?? 0),
              };
            }

            const choice = chunk.choices?.[0];
            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }

            const delta = choice?.delta;
            if (!delta) continue;

            if (delta.reasoning_content) {
              accumulatedReasoning += delta.reasoning_content;
            } else if (delta.reasoning) {
              accumulatedReasoning += delta.reasoning;
            }

            if (delta.content) {
              accumulatedContent += delta.content;
            }

            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsMap.has(idx)) {
                  toolCallsMap.set(idx, {
                    id: tc.id || `call_${Date.now()}_${idx}`,
                    name: tc.function?.name || "",
                    args: tc.function?.arguments || "",
                  });
                } else {
                  const cur = toolCallsMap.get(idx)!;
                  if (tc.id) cur.id = tc.id;
                  if (tc.function?.name) cur.name += tc.function.name;
                  if (tc.function?.arguments) cur.args += tc.function.arguments;
                }
              }
            }
          } catch { }
        }
      }
    } catch (readErr: any) {
      throw readErr;
    }

    // -------------------------------------------------------------------------
    // 流式自然接收完成逻辑与后验判断
    // -------------------------------------------------------------------------
    let rawContent = accumulatedContent;
    let reasoningContent = accumulatedReasoning;
    let toolCalls: LLMToolCall[] | undefined = undefined;

    // 若未收到任何 SSE 数据行，兼容检查是否为端点忽略 stream 参数直接返回的普通 JSON
    if (sseChunkCount === 0) {
      try {
        const json = JSON.parse(totalRawText.trim());
        if (json && Array.isArray(json.choices)) {
          const message = json.choices[0]?.message;
          if (message) {
            rawContent = message.content || "";
            reasoningContent = message.reasoning_content || message.reasoning || "";
            if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
              toolCalls = message.tool_calls;
            }
            if (json.choices[0]?.finish_reason) {
              finishReason = json.choices[0].finish_reason;
            }
            if (json.usage) {
              streamUsage = {
                promptTokens: Number(json.usage.prompt_tokens ?? json.usage.prompt_eval_count ?? 0),
                completionTokens: Number(json.usage.completion_tokens ?? json.usage.eval_count ?? 0),
                totalTokens: Number(json.usage.total_tokens ?? 0),
                cachedTokens: Number(json.usage.cached_tokens ?? 0),
                reasoningTokens: Number(json.usage.completion_tokens_details?.reasoning_tokens ?? 0),
              };
            }
          }
        } else {
          throw new Error("No SSE chunks or valid choices received");
        }
      } catch (e: any) {
        throw new Error(`Endpoint did not return Server-Sent Events (SSE): ${totalRawText.slice(0, 100)}`);
      }
    }

    if (!reasoningContent && typeof rawContent === "string" && rawContent.includes("<think>")) {
      const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        reasoningContent = thinkMatch[1].trim();
        rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      }
    }

    if (toolCallsMap.size > 0) {
      toolCalls = Array.from(toolCallsMap.values()).map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: tc.args || "{}",
        },
      }));
    }

    let parsed: T = {} as T;
    let parseError: string | null = null;
    if (rawContent.trim().length > 0) {
      try {
        parsed = cleanAndExtractJson(rawContent) as T;
      } catch (err: any) {
        parseError = err.message;
      }
    }

    // 统一后验结算：若未产生有效正文决策，但存在思考推演草稿，发起 Phase 2 终结
    const isFinishLength = finishReason === "length";
    const needsStreamSettlement = isThinkingActive &&
      (!toolCalls || toolCalls.length === 0) &&
      (!parsed || !(parsed as any).choice) &&
      Boolean(reasoningContent && reasoningContent.trim());

    if (needsStreamSettlement) {
      if (this.isDebug) {
        this.log(`  [stream:settle] 流式思考${isFinishLength ? "触碰长度截断(finish_reason: length)" : "未解析出决策"}，自动平铺推演原文 (${reasoningContent.length} 字符)，发起 Phase 2 快速终结...`);
      }
      const settlementMessages = flattenMessagesForSettlement(messages, reasoningContent);
      try {
        const settleRes = await this.query<T>(
          settlementMessages,
          schema,
          `${contextTag} [stream-settle]`,
          temperature,
          {
            thinkingOverride: "none",
            tools: undefined, // 严格禁止挂载 tools，防止模型再次调用工具陷入循环
            stream: false,
          }
        );
        parsed = settleRes.parsed;
        rawContent = settleRes.content;
      } catch (settleErr: any) {
        if (this.isDebug) {
          this.warn(`  [stream:settle:fallback] Phase 2 结算失败 (${settleErr.message})，转入思考原文启发式兜底抢救...`);
        }
        const rescued = rescueOptionFromReasoning(reasoningContent);
        if (rescued) {
          return {
            content: `{"choice":"${rescued}","action":"SAFE_BET","confidence":0.5}`,
            parsed: {
              choice: rescued,
              action: "SAFE_BET",
              confidence: 0.5,
            } as unknown as T,
            reasoning_content: reasoningContent,
            toolCalls: undefined,
            usage: streamUsage,
            durationMs: (Date.now() - reqStartTime),
          };
        }
        throw settleErr;
      }

      // 若结算结果缺少有效 choice，尝试从思考原文末尾兜底抢救
      if ((!parsed || !(parsed as any).choice) && reasoningContent) {
        const rescuedChoice = rescueOptionFromReasoning(reasoningContent);
        if (rescuedChoice) {
          parsed = {
            ...(parsed || {}),
            choice: rescuedChoice,
            action: (parsed as any)?.action || "SAFE_BET",
            confidence: (parsed as any)?.confidence ?? 0.5,
          } as unknown as T;
        }
      }

      return {
        content: rawContent,
        parsed,
        reasoning_content: reasoningContent,
        toolCalls: undefined,
        usage: streamUsage,
        durationMs: (Date.now() - reqStartTime),
      };
    }

    // 兜底抢救
    if ((!parsed || !(parsed as any).choice) && reasoningContent && (!toolCalls || toolCalls.length === 0)) {
      const rescuedChoice = rescueOptionFromReasoning(reasoningContent);
      if (rescuedChoice) {
        parsed = {
          ...(parsed || {}),
          choice: rescuedChoice,
          action: (parsed as any)?.action || "SAFE_BET",
          confidence: (parsed as any)?.confidence ?? 0.5,
        } as T;
      }
    }

    const durationMs = Date.now() - reqStartTime;
    const completionTokens = streamUsage?.completionTokens ||
      Math.ceil((rawContent.length + reasoningContent.length) / 2.5);
    const stepUsage: TokenUsage = streamUsage || {
      promptTokens: estimatedPromptTokens,
      completionTokens,
      totalTokens: estimatedPromptTokens + completionTokens,
      cachedTokens: 0,
      reasoningTokens: Math.ceil(reasoningContent.length / 2.5),
    };

    if (completionTokens > 0) {
      this.recordUsage(stepUsage, durationMs);
    }

    if (this.isDebug) {
      const respTime = getShortTime();
      this.log(`\n---- [DEBUG RESPONSE] [STREAM] ${contextTag} (${respTime}) [${formatDuration(durationMs)}] HTTP 200 ----`);
      this.log(JSON.stringify({
        choices: [{
          message: {
            role: "assistant",
            content: rawContent,
            reasoning_content: reasoningContent,
            tool_calls: toolCalls,
          }
        }],
        usage: stepUsage,
      }, null, 2));
      this.log(`--------------------------------------------------------------------------------\n`);
    }

    return {
      content: rawContent,
      reasoning_content: reasoningContent,
      parsed,
      tool_calls: toolCalls,
      usage: stepUsage,
      durationMs,
      tokensPerSecond: durationMs > 0 && completionTokens > 0 ? Math.round((completionTokens / (durationMs / 1000)) * 10) / 10 : undefined,
    };
  }
}
