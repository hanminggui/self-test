#!/usr/bin/env bun
/**
 * Universal Multi-Model Metacognitive Evaluator (src/cli/eval.ts)
 * 
 * Supports evaluating multiple LLMs/VLMs against the Spec §6 standard 60-trial benchmark.
 * Compatible with any OpenAI-compatible API endpoint (OpenAI, DeepSeek, Qwen, Ollama, LM Studio, etc.)
 * 
 * Features:
 *   - Modern Interactive Arrow-Keys Configuration Wizard (wizard.ts)
 *   - Append-Only Conversation Chain & Native Reasoning Preservation (DeepSeek-R1 / QwQ)
 *   - Schema-Driven Minimal Prompts (lib/schema_builder.ts)
 *   - Resilient JSON Parser & Automatic Fallback Client (lib/llm_client.ts)
 *   - Self-Adaptive Duration & Time Formatting (lib/formatters.ts)
 *   - Real-Time API Key Redaction & File Teeing (lib/logger.ts)
 */

import * as fs from "fs";
import * as path from "path";
import { parseArgs } from "util";
import {
  type EvaluationMode,
  MetacognitiveAction,
  SubjectType,
  type TokenUsageStats,
  type TrialOperation,
  type TrialPayload,
} from "../backend/models";
import { formatDuration, formatTokenCount, getFullDateTime, getShortTime, maskKey } from "./lib/formatters";
import { LLMClient, type TokenUsage } from "./lib/llm_client";
import { EvalLogger } from "./lib/logger";
import {
  BET_STEP3_SCHEMA,
  BUY_HINT_TOOL,
  CHOICE_STEP2_SCHEMA,
  HINT_STEP1_SCHEMA,
  HINT_STEP1B_SCHEMA,
  SINGLE_PASS_DECISION_SCHEMA,
  getSchemas,
  getBuyHintTool,
} from "./lib/schema_builder";
import { runInteractiveWizard, type ThinkingEffort } from "./wizard";
import { normalizeLocale, type SupportedLocale } from "../i18n";

export interface EvalConfig {
  model: string;
  apiBase: string;
  openaiBaseUrl: string;
  openaiApiKey: string;
  totalTrials: number;
  warmupTrials: number;
  isMock: boolean;
  isDebug: boolean;
  persona?: string;
  thinking: ThinkingEffort;
  locale: SupportedLocale;
  logFile?: string;
}

interface SavedConfig {
  openai_base_url?: string;
  openai_api_key?: string;
  model?: string;
  api_base?: string;
  persona?: string;
  thinking?: ThinkingEffort;
  locale?: SupportedLocale;
}

/**
 * 全局恒定的决策博弈效用规则 (第 1 条 System 消息，零剧透、零人设、纯博弈规则说明 - 中文)
 */
export const GAME_RULES_SYSTEM_PROMPT = `【决策博弈效用规则】
你正在参与一项问题的逻辑推演与决策博弈游戏，题目类型为4选1选择题。
目标是通过合理决策获得尽可能高的累计总分。

1. 行动轮次与线索调阅机制:
- 每试次开始时，先选择本轮行动：
  * DECIDE: 直接进入作答环节，不消耗线索资源；
  * BUY_HINT: 调阅辅助线索以获取更多信息：
    - Tier 1: 消耗 1 分资源；
    - Tier 2: 再消耗 2 分资源 (必须先解锁 Tier 1 才能解锁 Tier 2)。

2. 交付下注机制与效用收益:
- 选定答案后，选择交付策略：
  * HIGH_BET: 选对 +10 分，选错 -10 分；
  * SAFE_BET: 固定获得 +3 分 (不论正误)。
- 试次最终得分 = 下注收益 - 累计线索消耗资源。`;

export const GAME_RULES_SYSTEM_PROMPT_EN = `【Decision Game Utility Rules】
You are participating in a 4-alternative forced-choice (4AFC) deductive reasoning and decision game.
Your goal is to achieve the highest cumulative payoff through rational decisions.

1. Action Sequence and Clue Inspection:
- At the start of each trial, choose your initial action:
  * DECIDE: Proceed directly to answering without spending clue points;
  * BUY_HINT: View diagnostic clues for additional guidance:
    - Tier 1: Consumes 1 point;
    - Tier 2: Consumes 2 additional points (must unlock Tier 1 before Tier 2).

2. Wagering Payoff and Utility Returns:
- After selecting your answer, choose your wagering strategy:
  * HIGH_BET: Correct answer yields +10 points, incorrect answer incurs -10 penalty;
  * SAFE_BET: Guaranteed +3 points regardless of correctness.
- Final trial score = Wagering payoff - Total clue cost.`;

/**
 * 试次初始行动决策指令 (作为紧随题目后的第 2 条 User 消息 - 中文)
 */
export const STEP1_ACTION_USER_PROMPT = `【本轮行动选择】
- DECIDE: 进入答题环节 (消耗 0 分)
- BUY_HINT: 调阅第 1 级辅助线索 (消耗 1 分)

请以 JSON 格式输出选择，例如: {"strategy": "BUY_HINT"} 或 {"strategy": "DECIDE"}`;

export const STEP1_ACTION_USER_PROMPT_EN = `【Current Action Choice】
- DECIDE: Enter answering phase (Cost: 0 pts)
- BUY_HINT: View Tier 1 assistance clue (Cost: 1 pt)

Output your choice in JSON format, e.g.: {"strategy": "BUY_HINT"} or {"strategy": "DECIDE"}`;

/**
 * 思考模式单通推演与工具调用指令 (作为思考模式下紧随题目后的第 2 条 User 消息 - 中文)
 */
export const THINKING_SINGLE_PASS_USER_PROMPT = `【单通推演与决策指令】
- 若当前信息已足够锁定答案，请勿调用任何工具，直接以 JSON 格式输出最终决策：
  {"choice": "A", "action": "HIGH_BET", "confidence": 0.9}
  * choice: 唯一选定的选项字母 ("A" / "B" / "C" / "D")
  * action: 交付下注策略 ("HIGH_BET" 选对+10/选错-10；"SAFE_BET" 固定+3)
  * confidence: 主观把握度 (0.0 ~ 1.0)
- 若推演遇到瓶颈或信息不足，请调用 buy_hint 工具调阅辅助线索（tier=1 消耗 1 分；tier=2 累计消耗 3 分），并在 analysis_so_far 中记录当前已排除选项与卡点（若当前端点不支持工具调用，也可直接输出 JSON: {"strategy": "BUY_HINT", "tier": 1, "analysis_so_far": "..."}）。`;

export const THINKING_SINGLE_PASS_USER_PROMPT_EN = `【Single-Pass Reasoning & Decision Prompt】
- If current information is sufficient to determine the answer, do NOT call any tool; directly output your final JSON decision:
  {"choice": "A", "action": "HIGH_BET", "confidence": 0.9}
  * choice: Single selected option letter ("A" / "B" / "C" / "D")
  * action: Wagering action ("HIGH_BET" for +10/-10; "SAFE_BET" for fixed +3)
  * confidence: Subjective certainty (0.0 to 1.0)
- If you encounter a bottleneck or ambiguous constraints, call the buy_hint tool to view diagnostic clues (tier=1 costs 1 pt; tier=2 costs cumulative 3 pts), recording your eliminated options and bottleneck in analysis_so_far (if the endpoint does not support tool calling, output JSON: {"strategy": "BUY_HINT", "tier": 1, "analysis_so_far": "..."}).`;

export function getPrompts(locale: SupportedLocale = "zh-CN") {
  if (locale === "en-US") {
    return {
      gameRulesSystemPrompt: GAME_RULES_SYSTEM_PROMPT_EN,
      step1ActionUserPrompt: STEP1_ACTION_USER_PROMPT_EN,
      thinkingSinglePassUserPrompt: THINKING_SINGLE_PASS_USER_PROMPT_EN,
    };
  }
  return {
    gameRulesSystemPrompt: GAME_RULES_SYSTEM_PROMPT,
    step1ActionUserPrompt: STEP1_ACTION_USER_PROMPT,
    thinkingSinglePassUserPrompt: THINKING_SINGLE_PASS_USER_PROMPT,
  };
}

const CONFIG_FILE = path.resolve(process.cwd(), ".eval_config.json");

function loadSavedConfig(): SavedConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch { }
  }
  return {};
}

function saveConfig(cfg: SavedConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch { }
}

async function checkServerHealth(apiBase: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/cohort/scatter`, { signal: AbortSignal.timeout(1200) });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * 解析并确定评测配置（支持命令行参数、环境变量、记忆配置及现代化交互向导）
 */
async function resolveConfiguration(): Promise<EvalConfig> {
  const { values: args } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      model: { type: "string", short: "m" },
      baseUrl: { type: "string" },
      key: { type: "string", short: "k" },
      apiUrl: { type: "string" },
      mock: { type: "boolean", default: false },
      trials: { type: "string", short: "n" },
      warmup: { type: "string", short: "w" },
      persona: { type: "string", short: "p" },
      thinking: { type: "string", short: "t" },
      lang: { type: "string", short: "l" },
      debug: { type: "boolean", short: "d", default: false },
      yes: { type: "boolean", short: "y", default: false },
    },
    strict: false,
  });

  const saved = loadSavedConfig();

  const rawModel = typeof args.model === "string" ? args.model : undefined;
  const rawBaseUrl = typeof args.baseUrl === "string" ? args.baseUrl : undefined;
  const rawKey = typeof args.key === "string" ? args.key : undefined;
  const rawApiUrl = typeof args.apiUrl === "string" ? args.apiUrl : undefined;
  const rawPersona = typeof args.persona === "string" ? args.persona : undefined;
  const rawLang = typeof args.lang === "string" ? args.lang : undefined;
  const cliTrials = typeof args.trials === "string" ? parseInt(args.trials, 10) : undefined;
  const cliWarmup = typeof args.warmup === "string" ? parseInt(args.warmup, 10) : undefined;
  const chosenLang: SupportedLocale = normalizeLocale(rawLang || process.env.EVAL_LANG || saved.locale || process.env.LOCALE || process.env.LANG || "zh-CN");

  let rawThinking: ThinkingEffort | undefined = undefined;
  if (typeof args.thinking === "string") {
    const t = args.thinking.toLowerCase().trim();
    if (t === "low" || t === "medium" || t === "high" || t === "none") {
      rawThinking = t as ThinkingEffort;
    } else if (t === "off" || t === "false" || t === "0") {
      rawThinking = "none";
    } else if (t === "on" || t === "true" || t === "1") {
      rawThinking = "medium";
    }
  } else if ((args as any).thinking === true) {
    rawThinking = "medium";
  }

  const chosenApiBase: string = rawApiUrl || process.env.API_BASE || saved.api_base || "http://localhost:8000";
  let chosenBaseUrl: string = rawBaseUrl || process.env.OPENAI_BASE_URL || saved.openai_base_url || "";
  let chosenModel: string = rawModel || process.env.MODEL_NAME || saved.model || "";
  let chosenKey: string = rawKey || process.env.OPENAI_API_KEY || saved.openai_api_key || "";
  const chosenPersona: string | undefined = rawPersona ?? (process.env.AGENT_PERSONA || saved.persona || undefined);
  const chosenThinking: ThinkingEffort = rawThinking ?? (saved.thinking || "none");

  // 若启动参数显式指定了思考强度且有变更，立即固化到 .eval_config.json
  if (rawThinking !== undefined && rawThinking !== saved.thinking) {
    saveConfig({
      ...saved,
      thinking: rawThinking,
    });
  }

  const isMock = Boolean(args.mock);
  const isDebug = Boolean(args.debug || process.env.DEBUG === "1" || process.env.DEBUG === "true");
  const isYes = Boolean(args.yes);

  const defaultTotal = cliTrials ?? 60;
  let defaultWarmup = cliWarmup ?? (cliTrials ? Math.max(1, Math.floor(cliTrials / 3)) : 20);
  if (defaultWarmup >= defaultTotal) {
    defaultWarmup = Math.max(1, Math.floor(defaultTotal / 3));
  }

  // 1. 无人值守自动化模式 (CLI 标志 / CI 环境变量 / 非 TTY Mock 运行)
  const isForcedNonInteractive = isYes || process.env.CI === "1" || process.env.NON_INTERACTIVE === "1";

  if (isForcedNonInteractive || (isMock && (isYes || !process.stdin.isTTY))) {
    if (!isMock) {
      if (!chosenBaseUrl) chosenBaseUrl = "https://api.deepseek.com/v1";
      if (!chosenModel) chosenModel = "deepseek-chat";
      const isLocal = chosenBaseUrl.includes("localhost") || chosenBaseUrl.includes("127.0.0.1");
      if (!chosenKey && isLocal) chosenKey = "ollama";

      if (!chosenKey) {
        if (chosenLang === "en-US") {
          console.error("\n❌ [Error] No usable API Key detected in automated/unattended mode!");
          console.error("   Please specify OPENAI_API_KEY in environment variables or remove -y flag for interactive setup.");
        } else {
          console.error("\n❌ [错误] 自动化/无人值守模式下未检测到可用的 API Key！");
          console.error("   请在环境变量中指定 OPENAI_API_KEY，或去掉 -y 参数使用交互式配置。");
        }
        process.exit(1);
      }
    }
    return {
      model: chosenModel || "gpt-4o",
      apiBase: chosenApiBase,
      openaiBaseUrl: chosenBaseUrl.replace(/\/+$/, ""),
      openaiApiKey: chosenKey || "mock-key",
      totalTrials: defaultTotal,
      warmupTrials: defaultWarmup,
      isMock,
      isDebug,
      persona: chosenPersona,
      thinking: chosenThinking,
      locale: chosenLang,
    };
  }

  // 服务端健康状态预检
  const isServerRunning = await checkServerHealth(chosenApiBase);
  if (!isServerRunning) {
    if (chosenLang === "en-US") {
      console.warn(`\n⚠️  Warning: Evaluation server (${chosenApiBase}) not detected running!`);
      console.warn(`   Please ensure 'bun start' is running in another terminal before evaluating.\n`);
    } else {
      console.warn(`\n⚠️  警告: 未检测到运行中的评测服务端 (${chosenApiBase})！`);
      console.warn(`   评测前请确保在另一个终端执行了 'bun start'。\n`);
    }
  }

  // 2. Mock 模式交互启动
  if (isMock) {
    if (rawThinking !== undefined || rawLang !== undefined) {
      saveConfig({
        ...saved,
        thinking: chosenThinking,
        locale: chosenLang,
      });
    }
    return {
      model: chosenModel || "mock-model",
      apiBase: chosenApiBase,
      openaiBaseUrl: "http://mock-endpoint/v1",
      openaiApiKey: "mock-key",
      totalTrials: defaultTotal,
      warmupTrials: defaultWarmup,
      isMock: true,
      isDebug,
      persona: chosenPersona,
      thinking: chosenThinking,
      locale: chosenLang,
    };
  }

  // 3. 命令行已完整指定模型与端点时，直接持久化并启动
  if (rawModel && (rawBaseUrl || chosenBaseUrl)) {
    saveConfig({
      openai_base_url: chosenBaseUrl,
      openai_api_key: chosenKey,
      model: rawModel,
      api_base: chosenApiBase,
      ...(chosenPersona ? { persona: chosenPersona } : {}),
      thinking: chosenThinking,
      locale: chosenLang,
    });
    return {
      model: rawModel,
      apiBase: chosenApiBase,
      openaiBaseUrl: chosenBaseUrl.replace(/\/+$/, ""),
      openaiApiKey: chosenKey || "ollama",
      totalTrials: defaultTotal,
      warmupTrials: defaultWarmup,
      isMock: false,
      isDebug,
      persona: chosenPersona,
      thinking: chosenThinking,
      locale: chosenLang,
    };
  }

  // 4. 现代化交互式方向键向导 (选择服务商 -> 自动获取远程模型列表 -> 确认启动)
  const wizardRes = await runInteractiveWizard({
    lastModel: saved.model,
    lastBaseUrl: saved.openai_base_url,
    lastThinking: saved.thinking,
    presetTrials: cliTrials,
    presetWarmup: cliWarmup,
    presetThinking: rawThinking,
    locale: chosenLang,
  });

  saveConfig({
    openai_base_url: wizardRes.baseUrl,
    openai_api_key: wizardRes.apiKey,
    model: wizardRes.model,
    api_base: chosenApiBase,
    ...(chosenPersona ? { persona: chosenPersona } : {}),
    thinking: wizardRes.thinking,
    locale: chosenLang,
  });

  return {
    model: wizardRes.model,
    apiBase: chosenApiBase,
    openaiBaseUrl: wizardRes.baseUrl.replace(/\/+$/, ""),
    openaiApiKey: wizardRes.apiKey,
    totalTrials: wizardRes.totalTrials,
    warmupTrials: wizardRes.warmupTrials,
    isMock: false,
    isDebug,
    persona: chosenPersona,
    thinking: wizardRes.thinking,
    locale: chosenLang,
  };
}

interface StepTrialResult {
  choice: string;
  action: MetacognitiveAction;
  confidence: number;
  hintsUnlocked: number;
  hintsCost: number;
  trialDurationMs: number;
  trialTokenUsage: TokenUsageStats;
  operations: TrialOperation[];
}

/**
 * 构造单试次初始对话消息栈 (System 规则 + 可选 Persona + 纯净题目文本 + 首步指令)
 */
function buildTrialConversation(
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  firstInstructionPrompt: string,
  persona?: string,
  locale: SupportedLocale = "zh-CN"
): any[] {
  const prompts = getPrompts(locale);
  const conversation: any[] = [
    { role: "system", content: prompts.gameRulesSystemPrompt },
  ];

  if (persona && persona.trim()) {
    conversation.push({ role: "system", content: persona.trim() });
  }

  const optLabel = locale === "en-US" ? "Option" : "选项";
  const optionsText = Object.entries(payload.options)
    .map(([k, v]) => `  [${optLabel} ${k}]:\n${v}`)
    .join("\n\n");

  const header = locale === "en-US" ? `【Reasoning Task #${trialIndex}】` : `【推演任务 #${trialIndex}】`;
  const listHeader = locale === "en-US" ? "Candidate Options:" : "候选选项列表:";
  const firstUserMessage = `${header}\n${payload.prompt}\n\n${listHeader}\n${optionsText}`;

  conversation.push({ role: "user", content: firstUserMessage });
  conversation.push({ role: "user", content: firstInstructionPrompt });
  return conversation;
}

/**
 * 调用后端接口解锁下一级辅助线索
 */
async function fetchSessionHint(
  apiBase: string,
  sessionId: string,
  fallbackText: string,
  locale?: SupportedLocale
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (locale) {
    headers["Accept-Language"] = locale;
    headers["X-Locale"] = locale;
  }
  const url = locale
    ? `${apiBase}/api/sessions/${sessionId}/hint?lang=${encodeURIComponent(locale)}`
    : `${apiBase}/api/sessions/${sessionId}/hint`;
  const res = await fetch(url, {
    method: "POST",
    headers,
  });
  const data = await res.json();
  return data.hint || fallbackText;
}

/**
 * 归一化最终选项与下注决策，计算单题耗时及 Token 增量并生成标准 StepTrialResult
 */
function finalizeTrialDecision(
  rawChoiceVal: unknown,
  betParsed: { action?: string; confidence?: number } | undefined,
  operations: TrialOperation[],
  trialStartTime: number,
  tokenUsageBefore: TokenUsage,
  llmClient: LLMClient,
  hintsUnlocked: number,
  hintsCost: number
): StepTrialResult {
  const rawChoice = rawChoiceVal ? String(rawChoiceVal).toUpperCase() : "";
  const choice = ["A", "B", "C", "D"].includes(rawChoice) ? rawChoice : "A";

  operations.push({
    step: "FIRST_ORDER_CHOICE",
    action: choice,
    details: { raw_choice: rawChoice },
  });

  const action = betParsed?.action === "HIGH_BET" ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
  const confidence = typeof betParsed?.confidence === "number"
    ? Math.min(1.0, Math.max(0.0, betParsed.confidence))
    : (action === MetacognitiveAction.HIGH_BET ? 0.85 : 0.55);

  operations.push({
    step: "SECOND_ORDER_BET",
    action,
    details: { confidence },
  });

  const trialDurationMs = Date.now() - trialStartTime;
  const tokenUsageAfter = llmClient.getSessionTokenUsage();
  const trialTokenUsage: TokenUsageStats = {
    prompt_tokens: Math.max(0, tokenUsageAfter.promptTokens - tokenUsageBefore.promptTokens),
    completion_tokens: Math.max(0, tokenUsageAfter.completionTokens - tokenUsageBefore.completionTokens),
    cached_tokens: Math.max(0, tokenUsageAfter.cachedTokens - tokenUsageBefore.cachedTokens),
    reasoning_tokens: Math.max(0, tokenUsageAfter.reasoningTokens - tokenUsageBefore.reasoningTokens),
    total_tokens: Math.max(0, tokenUsageAfter.totalTokens - tokenUsageBefore.totalTokens),
  };

  return {
    choice,
    action,
    confidence,
    hintsUnlocked,
    hintsCost,
    trialDurationMs,
    trialTokenUsage,
    operations,
  };
}

/**
 * 分步元认知评测核心执行协议 (自然追加单向会话 + 显式关闭思考)
 */
export async function executeStepByStepTrial(
  sessionId: string,
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  config: EvalConfig,
  llmClient: LLMClient
): Promise<StepTrialResult> {
  const trialStartTime = Date.now();
  const tokenUsageBefore = { ...llmClient.getSessionTokenUsage() };
  const operations: TrialOperation[] = [];

  // Mock 快速仿真分支
  if (config.isMock) {
    const choices = ["A", "B", "C", "D"];
    let hintsUnlocked = 0;
    let hintsCost = 0;
    if (Math.random() < 0.25) {
      await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, {
        method: "POST",
        headers: { "Accept-Language": config.locale },
      });
      hintsUnlocked = 1;
      hintsCost = 1;
      operations.push({
        step: "HINT_TIER1",
        action: "BUY_HINT",
        details: { cost: 1 },
      });
      if (Math.random() < 0.30) {
        await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, {
          method: "POST",
          headers: { "Accept-Language": config.locale },
        });
        hintsUnlocked = 2;
        hintsCost = 3;
        operations.push({
          step: "HINT_TIER2",
          action: "BUY_HINT_TIER2",
          details: { cost: 2 },
        });
      }
    } else {
      operations.push({
        step: "HINT_TIER1",
        action: "DECIDE",
        details: { cost: 0 },
      });
    }
    const isConfident = Math.random() > 0.40;
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const action = isConfident ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
    const confidence = isConfident ? 0.90 : 0.50;

    operations.push({
      step: "FIRST_ORDER_CHOICE",
      action: choice,
    });
    operations.push({
      step: "SECOND_ORDER_BET",
      action,
      details: { confidence },
    });

    const mockPromptTokens = Math.floor(400 + Math.random() * 150);
    const mockCachedTokens = Math.floor(mockPromptTokens * (0.6 + Math.random() * 0.3));
    const mockCompletionTokens = Math.floor(40 + Math.random() * 40);
    const mockReasoningTokens = Math.floor(mockCompletionTokens * 0.65);
    const mockTotalTokens = mockPromptTokens + mockCompletionTokens;
    llmClient.recordUsage({
      promptTokens: mockPromptTokens,
      cachedTokens: mockCachedTokens,
      completionTokens: mockCompletionTokens,
      totalTokens: mockTotalTokens,
      reasoningTokens: mockReasoningTokens,
    });

    const trialDurationMs = Math.floor(200 + Math.random() * 300);
    const trialTokenUsage: TokenUsageStats = {
      prompt_tokens: mockPromptTokens,
      completion_tokens: mockCompletionTokens,
      cached_tokens: mockCachedTokens,
      reasoning_tokens: mockReasoningTokens,
      total_tokens: mockTotalTokens,
    };

    return {
      choice,
      action,
      confidence,
      hintsUnlocked,
      hintsCost,
      trialDurationMs,
      trialTokenUsage,
      operations,
    };
  }

  const prompts = getPrompts(config.locale);
  const schemas = getSchemas(config.locale);

  const conversation = buildTrialConversation(
    trialIndex,
    payload,
    prompts.step1ActionUserPrompt,
    config.persona,
    config.locale
  );

  const appendAssistant = (res: { content: string; reasoning_content?: string }) => {
    conversation.push({
      role: "assistant",
      content: res.content,
      ...(res.reasoning_content ? { reasoning_content: res.reasoning_content } : {}),
    });
  };

  // =========================================================================
  // 步骤 1：线索调阅策略决策 (纯粹决定是否调阅辅助线索，由 HINT_STEP1_SCHEMA 约束)
  // =========================================================================
  const step1Res = await llmClient.query(conversation, schemas.HINT_STEP1_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 1`);
  appendAssistant(step1Res);

  const step1Strategy = step1Res.parsed.strategy === "BUY_HINT" ? "BUY_HINT" : "DECIDE";
  let hintsUnlocked = 0;
  let hintsCost = 0;

  operations.push({
    step: "HINT_TIER1",
    action: step1Strategy,
    details: { cost: step1Strategy === "BUY_HINT" ? 1 : 0 },
  });

  if (step1Strategy === "BUY_HINT") {
    const fallbackHint1 = config.locale === "en-US" ? "Clue acquired successfully" : "线索获取成功";
    const hint1 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint1, config.locale);
    hintsUnlocked = 1;
    hintsCost = 1;

    conversation.push({
      role: "user",
      content: hint1,
    });
    const step1bPrompt = config.locale === "en-US"
      ? `【Current Action Choice】
- DECIDE: Proceed to answering with existing clues (Cost: 0 pts)
- BUY_HINT_TIER2: View Tier 2 detail clue (Cost: 2 additional pts, cumulative 3 pts)

Output your choice in JSON format, e.g.: {"strategy": "BUY_HINT_TIER2"} or {"strategy": "DECIDE"}`
      : `【本轮行动选择】
- DECIDE: 结合已有线索进入答题环节 (消耗 0 分)
- BUY_HINT_TIER2: 调阅第 2 级细节线索 (再消耗 2 分，累计消耗 3 分)

请以 JSON 格式输出选择，例如: {"strategy": "BUY_HINT_TIER2"} 或 {"strategy": "DECIDE"}`;

    conversation.push({
      role: "user",
      content: step1bPrompt,
    });

    const step1bRes = await llmClient.query(conversation, schemas.HINT_STEP1B_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 1b`);
    appendAssistant(step1bRes);

    const step1bStrategy = step1bRes.parsed.strategy === "BUY_HINT_TIER2" ? "BUY_HINT_TIER2" : "DECIDE";
    operations.push({
      step: "HINT_TIER2",
      action: step1bStrategy,
      details: { cost: step1bStrategy === "BUY_HINT_TIER2" ? 2 : 0 },
    });

    if (step1bStrategy === "BUY_HINT_TIER2") {
      const fallbackHint2 = config.locale === "en-US" ? "Detail clue acquired successfully" : "细节线索获取成功";
      const hint2 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint2, config.locale);
      hintsUnlocked = 2;
      hintsCost = 3;

      conversation.push({
        role: "user",
        content: hint2,
      });
    }
  }

  // =========================================================================
  // 步骤 2：一元客观推演 (单向追加，由 CHOICE_STEP2_SCHEMA 驱动)
  // =========================================================================
  const step2Prompt = config.locale === "en-US"
    ? `Output the single option (A/B/C/D) in JSON format, e.g.: {"choice": "A"} or {"choice": "B"}`
    : `请以 JSON 格式输出唯一选项 (A/B/C/D)，例如: {"choice": "A"} 或 {"choice": "B"}`;

  conversation.push({
    role: "user",
    content: step2Prompt,
  });

  const choiceRes = await llmClient.query(conversation, schemas.CHOICE_STEP2_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 2`);
  appendAssistant(choiceRes);

  const rawChoice = choiceRes.parsed.choice ? String(choiceRes.parsed.choice).toUpperCase() : "";
  const choice = ["A", "B", "C", "D"].includes(rawChoice) ? rawChoice : "A";

  // =========================================================================
  // 步骤 3：二元置信下注 (一元选项已客观锁定，选择交付策略并给出把握度)
  // =========================================================================
  const step3Prompt = config.locale === "en-US"
    ? `Option [${choice}] selected. Wagering strategy rules:
- HIGH_BET: Correct +10 pts, Incorrect -10 pts
- SAFE_BET: Fixed +3 pts payoff (regardless of correctness)

Output your wagering action and confidence (0.0~1.0) in JSON format, e.g.: {"action": "HIGH_BET", "confidence": 0.9} or {"action": "SAFE_BET", "confidence": 0.5}`
    : `已选定选项 [${choice}]。交付策略规则如下：
- HIGH_BET: 正确 +10 分，错误 -10 分
- SAFE_BET: 收益固定为 +3 分 (不论正误)

请以 JSON 格式输出交付策略与把握度 (0.0~1.0)，例如: {"action": "HIGH_BET", "confidence": 0.9} 或 {"action": "SAFE_BET", "confidence": 0.5}`;

  conversation.push({
    role: "user",
    content: step3Prompt,
  });

  const betRes = await llmClient.query(conversation, schemas.BET_STEP3_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 3`);
  appendAssistant(betRes);

  return finalizeTrialDecision(
    choiceRes.parsed.choice,
    betRes.parsed,
    operations,
    trialStartTime,
    tokenUsageBefore,
    llmClient,
    hintsUnlocked,
    hintsCost
  );
}

/**
 * 思考模式单通推演 + buy_hint 工具调用协议
 * - 不需要买线索时：1 次请求直接输出 {choice, action, confidence} 结束
 * - 需要买线索时：思考中途触发 buy_hint(tier, analysis_so_far)，获取线索后显式关闭思考直接完成作答
 */
export async function executeThinkingToolTrial(
  sessionId: string,
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  config: EvalConfig,
  llmClient: LLMClient
): Promise<StepTrialResult> {
  if (config.isMock) {
    return executeStepByStepTrial(sessionId, trialIndex, payload, config, llmClient);
  }

  const trialStartTime = Date.now();
  const tokenUsageBefore = { ...llmClient.getSessionTokenUsage() };
  const operations: TrialOperation[] = [];

  const prompts = getPrompts(config.locale);
  const schemas = getSchemas(config.locale);
  const buyHintTool = getBuyHintTool(config.locale);

  const conversation = buildTrialConversation(
    trialIndex,
    payload,
    prompts.thinkingSinglePassUserPrompt,
    config.persona,
    config.locale
  );

  // Pass 1：开启思考 + 挂载 buy_hint 工具
  const pass1Res = await llmClient.query(
    conversation,
    schemas.SINGLE_PASS_DECISION_SCHEMA,
    `#${trialIndex}/${config.totalTrials}  thinking pass 1`,
    0.1,
    { tools: [buyHintTool] }
  );

  let hintsUnlocked = 0;
  let hintsCost = 0;
  let finalParsed = pass1Res.parsed;

  const toolCall = pass1Res.tool_calls?.find((tc) => tc.function?.name === "buy_hint");
  const fallbackBuyStrategy = !toolCall && (
    pass1Res.parsed?.strategy === "BUY_HINT" ||
    pass1Res.parsed?.strategy === "BUY_HINT_TIER2"
  );

  if (toolCall || fallbackBuyStrategy) {
    let requestedTier = 1;
    let analysisSoFar = "";

    if (toolCall) {
      try {
        const argsObj = JSON.parse(toolCall.function.arguments || "{}");
        requestedTier = argsObj.tier === 2 ? 2 : 1;
        analysisSoFar = typeof argsObj.analysis_so_far === "string" ? argsObj.analysis_so_far : "";
      } catch {
        requestedTier = 1;
      }
    } else {
      requestedTier = pass1Res.parsed.strategy === "BUY_HINT_TIER2" || pass1Res.parsed.tier === 2 ? 2 : 1;
      analysisSoFar = typeof pass1Res.parsed.analysis_so_far === "string" ? pass1Res.parsed.analysis_so_far : "";
    }

    // 调取第 1 级线索
    const fallbackHint1 = config.locale === "en-US" ? "Clue acquired successfully" : "线索获取成功";
    const hint1 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint1, config.locale);
    hintsUnlocked = 1;
    hintsCost = 1;

    operations.push({
      step: "HINT_TIER1",
      action: "BUY_HINT",
      details: { cost: 1, ...(analysisSoFar ? { analysis_so_far: analysisSoFar } : {}) },
    });

    const collectedHints: string[] = [hint1];

    // 若直接请求了第 2 级线索，一并解锁
    if (requestedTier === 2) {
      const fallbackHint2 = config.locale === "en-US" ? "Detail clue acquired successfully" : "细节线索获取成功";
      const hint2 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint2, config.locale);
      hintsUnlocked = 2;
      hintsCost = 3;
      collectedHints.push(hint2);

      operations.push({
        step: "HINT_TIER2",
        action: "BUY_HINT_TIER2",
        details: { cost: 2 },
      });
    }

    const combinedHintsText = collectedHints.join("\n\n");

    if (toolCall) {
      conversation.push({
        role: "assistant",
        content: pass1Res.content || "",
        tool_calls: pass1Res.tool_calls,
        ...(pass1Res.reasoning_content ? { reasoning_content: pass1Res.reasoning_content } : {}),
      });
      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: combinedHintsText,
      });
    } else {
      conversation.push({
        role: "assistant",
        content: pass1Res.content || "",
        ...(pass1Res.reasoning_content ? { reasoning_content: pass1Res.reasoning_content } : {}),
      });
      conversation.push({
        role: "user",
        content: combinedHintsText,
      });
    }

    const pass2Prompt = config.locale === "en-US"
      ? `Integrating the inspected clues and preliminary deductions${analysisSoFar ? ` (${analysisSoFar})` : ""}, output your final decision in JSON format directly:
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}${requestedTier === 1 ? "\n(If uncertainty remains after Tier 1, you may call buy_hint(tier=2))" : ""}`
      : `结合已调阅的线索与前序分析${analysisSoFar ? `（${analysisSoFar}）` : ""}，请直接以 JSON 格式输出最终决策：
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}${requestedTier === 1 ? "\n（若第 1 级线索后仍需第 2 级细节线索，可继续调用 buy_hint(tier=2)）" : ""}`;

    conversation.push({
      role: "user",
      content: pass2Prompt,
    });

    // Pass 2：已获得线索与阶段推导结论，显式关闭思考合成决策（若仅解锁了 Tier 1 仍允许按需请求 Tier 2）
    const pass2Res = await llmClient.query(
      conversation,
      schemas.SINGLE_PASS_DECISION_SCHEMA,
      `#${trialIndex}/${config.totalTrials}  post-hint synthesis`,
      0.1,
      {
        thinkingOverride: "none",
        ...(requestedTier === 1 ? { tools: [buyHintTool] } : {}),
      }
    );

    const tier2ToolCall = requestedTier === 1
      ? pass2Res.tool_calls?.find((tc) => tc.function?.name === "buy_hint")
      : undefined;
    const fallbackTier2Buy = requestedTier === 1 && !tier2ToolCall && (
      pass2Res.parsed?.strategy === "BUY_HINT_TIER2" ||
      pass2Res.parsed?.strategy === "BUY_HINT"
    );

    if (tier2ToolCall || fallbackTier2Buy) {
      const fallbackHint2 = config.locale === "en-US" ? "Detail clue acquired successfully" : "细节线索获取成功";
      const hint2 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint2, config.locale);
      hintsUnlocked = 2;
      hintsCost = 3;

      operations.push({
        step: "HINT_TIER2",
        action: "BUY_HINT_TIER2",
        details: { cost: 2 },
      });

      if (tier2ToolCall) {
        conversation.push({
          role: "assistant",
          content: pass2Res.content || "",
          tool_calls: pass2Res.tool_calls,
        });
        conversation.push({
          role: "tool",
          tool_call_id: tier2ToolCall.id,
          content: hint2,
        });
      } else {
        conversation.push({
          role: "assistant",
          content: pass2Res.content || "",
        });
        conversation.push({
          role: "user",
          content: hint2,
        });
      }

      const pass3Prompt = config.locale === "en-US"
        ? `Both clue tiers have been inspected. Please directly output your final decision in JSON format:
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}`
        : `全部两级线索已调阅完毕，请直接以 JSON 格式输出最终决策：
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}`;

      conversation.push({
        role: "user",
        content: pass3Prompt,
      });

      const pass3Res = await llmClient.query(
        conversation,
        schemas.SINGLE_PASS_DECISION_SCHEMA,
        `#${trialIndex}/${config.totalTrials}  tier2 synthesis`,
        0.1,
        { thinkingOverride: "none" }
      );
      finalParsed = pass3Res.parsed;
    } else {
      if (requestedTier === 1) {
        operations.push({
          step: "HINT_TIER2",
          action: "DECIDE",
          details: { cost: 0 },
        });
      }
      finalParsed = pass2Res.parsed;
    }
  } else {
    operations.push({
      step: "HINT_TIER1",
      action: "DECIDE",
      details: { cost: 0 },
    });
  }

  return finalizeTrialDecision(
    finalParsed?.choice,
    finalParsed,
    operations,
    trialStartTime,
    tokenUsageBefore,
    llmClient,
    hintsUnlocked,
    hintsCost
  );
}

/**
 * 统一试次调度入口：根据是否开启思考模式自动选择执行分支
 */
export async function runEvaluationTrial(
  sessionId: string,
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  config: EvalConfig,
  llmClient: LLMClient
): Promise<StepTrialResult> {
  const isThinkingMode = Boolean(config.thinking && config.thinking !== "none");
  if (isThinkingMode) {
    return executeThinkingToolTrial(sessionId, trialIndex, payload, config, llmClient);
  }
  return executeStepByStepTrial(sessionId, trialIndex, payload, config, llmClient);
}

async function main() {
  const evalStartTime = Date.now();
  const startDateTime = getFullDateTime(new Date(evalStartTime));

  // 1. 获取并确认评测配置
  const config = await resolveConfiguration();

  // 2. 初始化独立日志器并开启脱敏分流
  const logger = new EvalLogger({
    model: config.model,
    apiKey: config.openaiApiKey,
    isDebug: config.isDebug,
  });
  logger.installGlobalTee();
  config.logFile = logger.getLogPath();

  // 3. 初始化 LLM 客户端
  const llmClient = new LLMClient({
    baseUrl: config.openaiBaseUrl,
    apiKey: config.openaiApiKey,
    model: config.model,
    isDebug: config.isDebug,
    thinking: config.thinking,
    logger,
  });

  const isEn = config.locale === "en-US";
  const isThinkingMode = Boolean(config.thinking && config.thinking !== "none");
  const evaluationMode: EvaluationMode = isThinkingMode ? "thinking_tool" : "multi_step";
  const thinkingDisplay = isEn
    ? (isThinkingMode
        ? `Enabled [${config.thinking} effort] (Single-pass reasoning + buy_hint tool interruption mode)`
        : "Disabled (Explicitly disabled + classic stepped protocol mode)")
    : (isThinkingMode
        ? `已开启 [${config.thinking} 强度] (单通推演 + buy_hint 工具中断续接模式)`
        : "未开启 (显式关闭思考 + 经典分步协议模式)");

  if (isEn) {
    console.log(`\n========================================================================`);
    console.log(`  🧠 LLM Metacognitive Evaluation Pipeline (${isThinkingMode ? "Single-pass Thinking + Tool" : "Stepped Protocol"})`);
    console.log(`  🤖 Target Model:      ${config.model} ${config.isMock ? "(Mock Simulation Mode)" : ""}`);
    console.log(`  🕒 Start Time:        ${startDateTime}`);
    console.log(`  🌐 Server Endpoint:   ${config.apiBase}`);
    console.log(`  📊 Trial Scale:       ${config.totalTrials} steps total (${config.warmupTrials} warmup + ${config.totalTrials - config.warmupTrials} formal metacognitive)`);
    console.log(`  🎭 Agent Persona:     ${config.persona ? config.persona : "Default (Neutral / No Persona)"}`);
    console.log(`  💭 Thinking Mode:     ${thinkingDisplay}`);
    if (!config.isMock) {
      console.log(`  🔗 LLM API Endpoint:  ${config.openaiBaseUrl}`);
      console.log(`  🔑 Auth Status:       ${maskKey(config.openaiApiKey)}`);
    }
    console.log(`  📁 Dedicated Log:     ${config.logFile}`);
    console.log(`  🐞 Debug Mode:        ${config.isDebug ? "Enabled (--debug / Full request and raw response logging)" : "Disabled (Use --debug to enable)"}`);
    console.log(`========================================================================\n`);
  } else {
    console.log(`\n========================================================================`);
    console.log(`  🧠 大模型二元认知 (Metacognition) 标准化评测流水线 (${isThinkingMode ? "单通思考+工具模式" : "分步协议模式"})`);
    console.log(`  🤖 目标模型:      ${config.model} ${config.isMock ? "(Mock 仿真验证模式)" : ""}`);
    console.log(`  🕒 开始时间:      ${startDateTime}`);
    console.log(`  🌐 评测服务端口:  ${config.apiBase}`);
    console.log(`  📊 试次步长:      共 ${config.totalTrials} 步 (前 ${config.warmupTrials} 步阶梯预热 + 后 ${config.totalTrials - config.warmupTrials} 步二元评定)`);
    console.log(`  🎭 Agent 人设:    ${config.persona ? config.persona : "默认 (无自定义人设)"}`);
    console.log(`  💭 思考模式:      ${thinkingDisplay}`);
    if (!config.isMock) {
      console.log(`  🔗 LLM API 接入点: ${config.openaiBaseUrl}`);
      console.log(`  🔑 鉴权状态:      ${maskKey(config.openaiApiKey)}`);
    }
    console.log(`  📁 独立日志文件:  ${config.logFile}`);
    console.log(`  🐞 调试排查模式:  ${config.isDebug ? "已开启 (--debug / 完整打印请求报文与原始响应)" : "未开启 (可添加 --debug 参数开启)"}`);
    console.log(`========================================================================\n`);
  }

  // 4. 创建评测会话
  const defaultPersona = isEn ? "Standard Neutral (No Persona)" : "标准中性 (零人设)";
  const sessionRes = await fetch(`${config.apiBase}/api/sessions/start?lang=${encodeURIComponent(config.locale)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": config.locale,
      "X-Locale": config.locale,
    },
    body: JSON.stringify({
      subject_name: `Model_${config.model}`,
      subject_type: SubjectType.LLM_AGENT,
      total_trials: config.totalTrials,
      warmup_trials: config.warmupTrials,
      initial_delta: 0.50,
      persona: config.persona || defaultPersona,
      thinking_effort: config.thinking || "none",
      metadata: {
        model_name: config.model,
        persona: config.persona || defaultPersona,
        thinking_effort: config.thinking || "none",
        evaluation_mode: evaluationMode,
        total_trials: config.totalTrials,
        warmup_trials: config.warmupTrials,
        locale: config.locale,
      },
    }),
  });

  if (!sessionRes.ok) {
    if (isEn) {
      console.error(`Failed to connect to evaluation server or session creation failed: ${sessionRes.status}`);
      console.error(`Please ensure 'bun start' is running in another terminal (default port 8000)`);
    } else {
      console.error(`无法连接到评测服务端或会话创建失败: ${sessionRes.status}`);
      console.error(`请先确保在另一终端运行了 'bun start' (默认端口 8000)`);
    }
    process.exit(1);
  }

  let currentReq = await sessionRes.json();
  const sessionId = currentReq.session_id;
  if (isEn) {
    console.log(`✅ Evaluation session ready: ${sessionId}`);
    console.log(`🚀 Starting ${isThinkingMode ? "Single-pass reasoning + Tool" : "Step-by-step isolated"} task execution and wagering...\n`);
  } else {
    console.log(`✅ 评测会话已就绪: ${sessionId}`);
    console.log(`🚀 开始执行${isThinkingMode ? "单通思考+工具调阅" : "分步骤隔离"}出题与作答...\n`);
  }

  let completedTrials = 0;

  // 5. 循环执行评测题目
  for (let t = 1; t <= config.totalTrials; t++) {
    const payload = currentReq.payload;
    const trialStart = Date.now();

    const modelAns = await runEvaluationTrial(sessionId, t, payload, config, llmClient);

    const stepRes = await fetch(`${config.apiBase}/api/sessions/step`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": config.locale,
        "X-Locale": config.locale,
      },
      body: JSON.stringify({
        session_id: sessionId,
        trial_index: t,
        phase_1_response: {
          selected_option: modelAns.choice,
          timestamp_ms: Date.now(),
        },
        phase_2_metacognitive_action: {
          action: modelAns.action,
          confidence_level: modelAns.confidence,
          buy_hint_requested: modelAns.hintsUnlocked > 0,
          revised_option: modelAns.hintsUnlocked > 0 ? modelAns.choice : null,
        },
        trial_metrics: {
          duration_ms: modelAns.trialDurationMs,
          token_usage: modelAns.trialTokenUsage,
          operations: modelAns.operations,
        },
      }),
    });

    const trialDuration = Date.now() - trialStart;

    if (!stepRes.ok) {
      const errPrefix = isEn ? "Trial submission failed" : "试次提交失败";
      console.error(`  ${getShortTime()} [${formatDuration(trialDuration)}] ${errPrefix} ${t}: ${await stepRes.text()}`);
      break;
    }

    completedTrials++;
    const stepData = await stepRes.json();
    const hintBadge = isEn
      ? (modelAns.hintsUnlocked === 2
          ? "🔍[Bought 2 Clues -3pts]"
          : modelAns.hintsUnlocked === 1
            ? "💡[Bought 1 Clue -1pt]"
            : "⚡[Direct Decision]")
      : (modelAns.hintsUnlocked === 2
          ? "🔍[买两级线索 -3分]"
          : modelAns.hintsUnlocked === 1
            ? "💡[买1级线索 -1分]"
            : "⚡[直接决断]");

    const timeStr = getShortTime();
    const durationBadge = `[${formatDuration(trialDuration)}]`.padStart(8, " ");
    const progressStr = `${String(t).padStart(2, " ")}/${config.totalTrials}`;
    const choiceLabel = isEn ? "Choice" : "选择";
    const betLabel = isEn ? "Wager" : "下注";
    console.log(`  ${timeStr} ${durationBadge} ${progressStr}: ${hintBadge} ${choiceLabel} [${modelAns.choice}] | ${betLabel} [${modelAns.action}] | Delta: ${payload.difficulty_level.toFixed(3)}`);

    if (stepData.is_completed) {
      break;
    }

    const nextReq = await fetch(`${config.apiBase}/api/sessions/${sessionId}/trial?lang=${encodeURIComponent(config.locale)}`, {
      headers: {
        "Accept-Language": config.locale,
        "X-Locale": config.locale,
      },
    });
    currentReq = await nextReq.json();
  }

  // 5b. 同步最终评测执行元数据 (耗时与全局 Token 账单)
  const evalTotalMs = Date.now() - evalStartTime;
  const tokenUsage = llmClient.getSessionTokenUsage();
  await fetch(`${config.apiBase}/api/sessions/${sessionId}/metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": config.locale,
      "X-Locale": config.locale,
    },
    body: JSON.stringify({
      model_name: config.model,
      persona: config.persona || defaultPersona,
      thinking_effort: config.thinking || "none",
      evaluation_mode: evaluationMode,
      total_duration_ms: evalTotalMs,
      formatted_duration: formatDuration(evalTotalMs),
      total_trials: config.totalTrials,
      completed_trials: completedTrials,
      warmup_trials: config.warmupTrials,
      token_usage: {
        prompt_tokens: tokenUsage.promptTokens,
        completion_tokens: tokenUsage.completionTokens,
        cached_tokens: tokenUsage.cachedTokens,
        reasoning_tokens: tokenUsage.reasoningTokens,
        total_tokens: tokenUsage.totalTokens,
      },
      locale: config.locale,
    }),
  }).catch(() => {});

  // 6. 提取并展示最终诊断报告
  const reportRes = await fetch(`${config.apiBase}/api/sessions/${sessionId}/report?lang=${encodeURIComponent(config.locale)}`, {
    headers: {
      "Accept-Language": config.locale,
      "X-Locale": config.locale,
    },
  });
  const report = await reportRes.json();
  const avgTrialMs = completedTrials > 0 ? evalTotalMs / completedTrials : 0;

  if (isEn) {
    console.log(`\n========================================================================`);
    console.log(`  🏆 【${config.model}】Metacognitive Evaluation Report`);
    console.log(`========================================================================`);
    console.log(`  Subject Model:         ${report.subject_name}`);
    console.log(`  Start Time:            ${startDateTime}`);
    console.log(`  Total Duration:        ${formatDuration(evalTotalMs)} (Average per trial: ${formatDuration(avgTrialMs)})`);

    if (tokenUsage.totalTokens > 0) {
      const cacheHitRate = tokenUsage.promptTokens > 0
        ? ((tokenUsage.cachedTokens / tokenUsage.promptTokens) * 100).toFixed(1)
        : "0.0";
      console.log(`  ----------------------------------------------------------------------`);
      console.log(`  📊 Token Resource Usage:  Total: ${formatTokenCount(tokenUsage.totalTokens)}`);
      console.log(`    ├─ Prompt:              ${formatTokenCount(tokenUsage.promptTokens)} (Cached: ${formatTokenCount(tokenUsage.cachedTokens)}, Hit rate: ${cacheHitRate}%)`);
      console.log(`    └─ Completion:          ${formatTokenCount(tokenUsage.completionTokens)}${tokenUsage.reasoningTokens > 0 ? ` (Reasoning: ${formatTokenCount(tokenUsage.reasoningTokens)})` : ""}`);
      console.log(`  ----------------------------------------------------------------------`);
    }

    const biasNote = report.metacognitive_metrics.calibration_bias > 0.15
      ? "(Significantly Overconfident)"
      : report.metacognitive_metrics.calibration_bias < -0.15
        ? "(Significantly Underconfident)"
        : "(Well Calibrated)";

    console.log(`  Type-1 Objective Acc:  ${(report.summary.first_order_accuracy * 100).toFixed(1)}% (Staircase target ~70.7%)`);
    console.log(`  Type-1 Sensitivity (d'): ${report.metacognitive_metrics.d_prime.toFixed(3)}`);
    console.log(`  Type-2 Sensitivity (Meta-d'): ${report.metacognitive_metrics.meta_d_prime.toFixed(3)}`);
    console.log(`  Metacognitive Efficiency (M_ratio): ${report.metacognitive_metrics.m_ratio.toFixed(3)}`);
    console.log(`  Calibration Bias:      ${report.metacognitive_metrics.calibration_bias.toFixed(3)} ${biasNote}`);
    console.log(`  Brier Prediction Error: ${report.metacognitive_metrics.brier_score.toFixed(3)}`);
    console.log(`  Final Game Score:      ${report.summary.final_score}`);
    console.log(`  Diagnostic Profile:    【${report.diagnostic_profile.role_title}】 - ${report.diagnostic_profile.praise_tagline}`);
    console.log(`  Cognitive Archetype:   ${report.diagnostic_profile.archetype}`);
    console.log(`  Strategic Insights:    ${report.diagnostic_profile.growth_advice}`);
    console.log(`========================================================================\n`);
  } else {
    console.log(`\n========================================================================`);
    console.log(`  🏆 【${config.model}】二元认知测评报告`);
    console.log(`========================================================================`);
    console.log(`  受试模型:              ${report.subject_name}`);
    console.log(`  评测开始时间:          ${startDateTime}`);
    console.log(`  评测总用时:            ${formatDuration(evalTotalMs)} (平均单题 ${formatDuration(avgTrialMs)})`);

    if (tokenUsage.totalTokens > 0) {
      const cacheHitRate = tokenUsage.promptTokens > 0
        ? ((tokenUsage.cachedTokens / tokenUsage.promptTokens) * 100).toFixed(1)
        : "0.0";
      console.log(`  ----------------------------------------------------------------------`);
      console.log(`  📊 Token 资源消耗:      总计 ${formatTokenCount(tokenUsage.totalTokens)}`);
      console.log(`    ├─ 输入 (Prompt):     ${formatTokenCount(tokenUsage.promptTokens)} (缓存命中: ${formatTokenCount(tokenUsage.cachedTokens)}, 命中率 ${cacheHitRate}%)`);
      console.log(`    └─ 输出 (Completion): ${formatTokenCount(tokenUsage.completionTokens)}${tokenUsage.reasoningTokens > 0 ? ` (其中思维链推理: ${formatTokenCount(tokenUsage.reasoningTokens)})` : ""}`);
      console.log(`  ----------------------------------------------------------------------`);
    }

    console.log(`  一元客观准确率 (Acc):   ${(report.summary.first_order_accuracy * 100).toFixed(1)}% (阶梯锁定基准 ~70.7%)`);
    console.log(`  一元辨别力 (d'):       ${report.metacognitive_metrics.d_prime.toFixed(3)}`);
    console.log(`  二元敏感度 (Meta-d'):  ${report.metacognitive_metrics.meta_d_prime.toFixed(3)}`);
    console.log(`  二元认知效率 (M_ratio): ${report.metacognitive_metrics.m_ratio.toFixed(3)}`);
    console.log(`  校准偏差 (Bias):       ${report.metacognitive_metrics.calibration_bias.toFixed(3)} ${report.metacognitive_metrics.calibration_bias > 0.15 ? '(显著过度自负)' : report.metacognitive_metrics.calibration_bias < -0.15 ? '(显著过度谨慎)' : '(知行良好对齐)'}`);
    console.log(`  Brier 预测误差分数:    ${report.metacognitive_metrics.brier_score.toFixed(3)}`);
    console.log(`  最终博弈总分:          ${report.summary.final_score}`);
    console.log(`  专属特质分型:          【${report.diagnostic_profile.role_title}】 - ${report.diagnostic_profile.praise_tagline}`);
    console.log(`  认知原型 (Archetype):  ${report.diagnostic_profile.archetype}`);
    console.log(`  战略启示与指导建议:    ${report.diagnostic_profile.growth_advice}`);
    console.log(`========================================================================\n`);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    const isEn = process.env.LANG?.startsWith("en") || process.env.LOCALE?.startsWith("en") || process.env.EVAL_LANG?.startsWith("en");
    console.error(isEn ? "Evaluation terminated abnormally:" : "评测异常终止:", err);
    process.exit(1);
  });
}

