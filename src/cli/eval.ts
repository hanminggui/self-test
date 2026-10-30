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
  DEFAULT_CONFIDENCE_HIGH_BET,
  DEFAULT_CONFIDENCE_SAFE_BET,
} from "../backend/models";
import { formatDuration, formatTokenCount, getFullDateTime, getShortTime, maskKey } from "./lib/formatters";
import { LLMClient, type TokenUsage } from "./lib/llm_client";
import { cleanAndExtractJson, rescueOptionFromReasoning } from "./lib/json_parser";
import { choice, noul, score, DecisionModelClient } from "./lib/decision_client";
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
  getTier1HintTool,
  getTier2HintTool,
} from "./lib/schema_builder";
import { runInteractiveWizard, type ThinkingEffort } from "./wizard";
import { normalizeLocale, type SupportedLocale } from "../i18n";
import {
  formatSamplingParams,
  resolveSamplingParams,
  type SamplingParams,
} from "./lib/sampling_profiles";

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
  samplingProfile?: string;
  samplingParams?: SamplingParams;
  locale: SupportedLocale;
  logFile?: string;
  timeoutSeconds?: number;
  noLog?: boolean;
  isDecisionModel?: boolean;
  stream?: boolean;
  contextLimit?: number;
}

interface SavedConfig {
  openai_base_url?: string;
  openai_api_key?: string;
  model?: string;
  api_base?: string;
  persona?: string;
  thinking?: ThinkingEffort;
  sampling_profile?: string;
  sampling_params?: SamplingParams;
  locale?: SupportedLocale;
  timeout?: number;
  is_decision_model?: boolean;
  stream?: boolean;
  context_limit?: number;
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
 * 思考模式单通推演与决策输出指令 (零工具剧透，纯粹交付契约)
 */
export const THINKING_SINGLE_PASS_USER_PROMPT = `【单通决策输出规范】
请以 JSON 格式输出最终推演决策结果：
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}
* choice: 唯一选定的选项字母 ("A" / "B" / "C" / "D")
* action: 交付策略 ("HIGH_BET" 选对+10/选错-10；"SAFE_BET" 固定+3)
* confidence: 主观把握度 (0.0 ~ 1.0)`;

export const THINKING_SINGLE_PASS_USER_PROMPT_EN = `【Single-Pass Decision Output Specification】
Output your final deduction decision in JSON format directly:
{"choice": "A", "action": "HIGH_BET", "confidence": 0.9}
* choice: Single selected option letter ("A" / "B" / "C" / "D")
* action: Wagering action ("HIGH_BET" for +10/-10; "SAFE_BET" for fixed +3)
* confidence: Subjective certainty (0.0 to 1.0)`;

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

export function normalizeApiUrl(rawUrl?: string): string {
  if (!rawUrl) return "http://localhost:8000";
  return rawUrl.trim().replace(/\/+$/, "");
}

export async function checkServerHealth(apiBase: string): Promise<boolean> {
  const timeoutMs = apiBase.startsWith("http://localhost") || apiBase.startsWith("http://127.0.0.1") ? 1500 : 5000;
  try {
    const res = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) return true;
  } catch {}

  try {
    const res = await fetch(`${apiBase}/api/cohort/scatter`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export function isDecisionModelIdentifier(model?: string, baseUrl?: string, isDecisionFlag?: boolean): boolean {
  if (isDecisionFlag) return true;
  if (typeof model === "string") {
    const m = model.toLowerCase();
    if (
      m.startsWith("decision-models/") ||
      m.includes("elephant") ||
      m.includes("mammoth") ||
      m.includes("jev") ||
      m.includes("typesafe")
    ) {
      return true;
    }
  }
  if (typeof baseUrl === "string") {
    const b = baseUrl.toLowerCase();
    if (b.includes("typesafe.ai") || b.includes("baseten.co")) {
      return true;
    }
  }
  return false;
}

export function normalizeDecisionBaseUrl(rawUrl: string): string {
  let clean = (rawUrl || "").trim().replace(/\/+$/, "");
  while (clean.endsWith("/v1/systemone") || clean.endsWith("/systemone") || clean.endsWith("/v1")) {
    if (clean.endsWith("/v1/systemone")) {
      clean = clean.slice(0, -"/v1/systemone".length).replace(/\/+$/, "");
    } else if (clean.endsWith("/systemone")) {
      clean = clean.slice(0, -"/systemone".length).replace(/\/+$/, "");
    } else if (clean.endsWith("/v1")) {
      clean = clean.slice(0, -"/v1".length).replace(/\/+$/, "");
    }
  }
  return clean;
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
      decision: { type: "boolean", default: false },
      "decision-model": { type: "boolean", default: false },
      "system-one": { type: "boolean", default: false },
      typesafe: { type: "boolean", default: false },
      trials: { type: "string", short: "n" },
      warmup: { type: "string", short: "w" },
      persona: { type: "string", short: "p" },
      thinking: { type: "string", short: "t" },
      profile: { type: "string", short: "P" },
      temp: { type: "string" },
      temperature: { type: "string" },
      "top-p": { type: "string" },
      "top-k": { type: "string" },
      "min-p": { type: "string" },
      lang: { type: "string", short: "l" },
      timeout: { type: "string" },
      debug: { type: "boolean", short: "d", default: false },
      yes: { type: "boolean", short: "y", default: false },
      "no-log": { type: "boolean", default: false },
      stream: { type: "boolean" },
      "no-stream": { type: "boolean", default: false },
      "context-limit": { type: "string" },
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
  const rawTimeout = typeof args.timeout === "string" ? args.timeout : undefined;
  const cliTrials = typeof args.trials === "string" ? parseInt(args.trials, 10) : undefined;
  const cliWarmup = typeof args.warmup === "string" ? parseInt(args.warmup, 10) : undefined;
  const chosenLang: SupportedLocale = normalizeLocale(rawLang || process.env.EVAL_LANG || saved.locale || process.env.LOCALE || process.env.LANG || "zh-CN");

  const rawContextLimit = typeof args["context-limit"] === "string" ? parseInt(args["context-limit"], 10) : undefined;
  const chosenContextLimit = (rawContextLimit !== undefined && !isNaN(rawContextLimit) && rawContextLimit > 0)
    ? rawContextLimit
    : (saved.context_limit ?? 8192);

  const rawIsDecisionFlag = Boolean(args.decision || args["decision-model"] || args["system-one"] || args.typesafe);
  const isDecision = isDecisionModelIdentifier(
    rawModel || process.env.MODEL_NAME || saved.model,
    rawBaseUrl || process.env.OPENAI_BASE_URL || saved.openai_base_url,
    rawIsDecisionFlag || saved.is_decision_model
  );

  // 采样参数解析
  const rawProfile = typeof args.profile === "string" ? args.profile.trim().toLowerCase() : undefined;
  const rawTempStr = typeof args.temperature === "string" ? args.temperature : (typeof args.temp === "string" ? args.temp : undefined);
  const rawTopPStr = typeof args["top-p"] === "string" ? args["top-p"] : undefined;
  const rawTopKStr = typeof args["top-k"] === "string" ? args["top-k"] : undefined;
  const rawMinPStr = typeof args["min-p"] === "string" ? args["min-p"] : undefined;

  const cliSamplingOverrides: Partial<SamplingParams> = {};
  if (rawTempStr !== undefined && !isNaN(parseFloat(rawTempStr))) cliSamplingOverrides.temperature = parseFloat(rawTempStr);
  if (rawTopPStr !== undefined && !isNaN(parseFloat(rawTopPStr))) cliSamplingOverrides.top_p = parseFloat(rawTopPStr);
  if (rawTopKStr !== undefined && !isNaN(parseInt(rawTopKStr, 10))) cliSamplingOverrides.top_k = parseInt(rawTopKStr, 10);
  if (rawMinPStr !== undefined && !isNaN(parseFloat(rawMinPStr))) cliSamplingOverrides.min_p = parseFloat(rawMinPStr);

  const resolvedSampling = resolveSamplingParams(
    rawProfile || saved.sampling_profile || "optimal",
    Object.keys(cliSamplingOverrides).length > 0 ? cliSamplingOverrides : saved.sampling_params
  );

  const rawTimeoutStr = rawTimeout || process.env.EVAL_TIMEOUT || (saved.timeout !== undefined ? String(saved.timeout) : undefined);
  const isNoLog = Boolean(args["no-log"] || process.env.NODE_ENV === "test" || process.env.EVAL_NO_LOG === "1" || process.env.EVAL_DISABLE_LOG === "1");
  let chosenTimeout: number | undefined = undefined;
  if (rawTimeoutStr !== undefined) {
    const parsedT = parseInt(rawTimeoutStr, 10);
    if (!isNaN(parsedT) && parsedT >= 0) {
      chosenTimeout = parsedT;
    }
  }

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

  const defaultDecisionBase = "https://api.typesafe.ai";
  const defaultDecisionModel = "jev-latest";

  const chosenApiBase: string = normalizeApiUrl(rawApiUrl || process.env.API_BASE || saved.api_base);
  let chosenBaseUrl: string = rawBaseUrl || process.env.OPENAI_BASE_URL || saved.openai_base_url || (isDecision ? defaultDecisionBase : "");
  if (isDecision && chosenBaseUrl) {
    chosenBaseUrl = normalizeDecisionBaseUrl(chosenBaseUrl);
  }
  let chosenModel: string = rawModel || process.env.MODEL_NAME || saved.model || (isDecision ? defaultDecisionModel : "");
  let chosenKey: string = rawKey || (isDecision ? (process.env.TYPESAFE_API_KEY || process.env.BASETEN_API_KEY || "") : "") || process.env.OPENAI_API_KEY || saved.openai_api_key || "";
  const chosenPersona: string | undefined = rawPersona ?? (process.env.AGENT_PERSONA || saved.persona || undefined);
  const chosenThinking: ThinkingEffort = isDecision ? "none" : (rawThinking ?? (saved.thinking || "none"));

  // 若启动参数显式指定了思考强度且有变更，立即固化到 .eval_config.json
  if (rawThinking !== undefined && rawThinking !== saved.thinking) {
    saveConfig({
      ...saved,
      thinking: rawThinking,
      is_decision_model: isDecision,
    });
  }

  // 默认全面启用流式传输（若服务端不支持自动静默降级为非流式），仅在显式指定 --no-stream 时关闭
  const explicitNoStream = Boolean(args["no-stream"] || (args as any).stream === false || process.env.EVAL_NO_STREAM === "1");
  const chosenStream = !explicitNoStream;

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
      if (!chosenBaseUrl) chosenBaseUrl = isDecision ? defaultDecisionBase : "https://api.deepseek.com/v1";
      if (!chosenModel) chosenModel = isDecision ? defaultDecisionModel : "deepseek-chat";
      const isLocal = chosenBaseUrl.includes("localhost") || chosenBaseUrl.includes("127.0.0.1");
      if (!chosenKey && isLocal) chosenKey = "ollama";

      if (!chosenKey) {
        if (chosenLang === "en-US") {
          console.error("\n❌ [Error] No usable API Key detected in automated/unattended mode!");
          console.error(isDecision
            ? "   Please specify TYPESAFE_API_KEY (or BASETEN_API_KEY) in environment variables or remove -y flag for interactive setup."
            : "   Please specify OPENAI_API_KEY in environment variables or remove -y flag for interactive setup.");
        } else {
          console.error("\n❌ [错误] 自动化/无人值守模式下未检测到可用的 API Key！");
          console.error(isDecision
            ? "   请在环境变量中指定 TYPESAFE_API_KEY (或 BASETEN_API_KEY)，或去掉 -y 参数使用交互式配置。"
            : "   请在环境变量中指定 OPENAI_API_KEY，或去掉 -y 参数使用交互式配置。");
        }
        process.exit(1);
      }
    }
    return {
      model: chosenModel || (isDecision ? defaultDecisionModel : "gpt-4o"),
      apiBase: chosenApiBase,
      openaiBaseUrl: chosenBaseUrl.replace(/\/+$/, ""),
      openaiApiKey: chosenKey || "mock-key",
      totalTrials: defaultTotal,
      warmupTrials: defaultWarmup,
      isMock,
      isDebug,
      persona: chosenPersona,
      thinking: chosenThinking,
      samplingProfile: resolvedSampling.profileId,
      samplingParams: resolvedSampling.params,
      locale: chosenLang,
      timeoutSeconds: chosenTimeout,
      noLog: isNoLog,
      isDecisionModel: isDecision,
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
    if (rawThinking !== undefined || rawLang !== undefined || rawTimeout !== undefined || rawProfile !== undefined) {
      saveConfig({
        ...saved,
        thinking: chosenThinking,
        sampling_profile: resolvedSampling.profileId,
        sampling_params: resolvedSampling.params,
        locale: chosenLang,
        is_decision_model: isDecision,
        ...(chosenTimeout !== undefined ? { timeout: chosenTimeout } : {}),
      });
    }
    return {
      model: chosenModel || (isDecision ? defaultDecisionModel : "mock-model"),
      apiBase: chosenApiBase,
      openaiBaseUrl: isDecision ? defaultDecisionBase : "http://mock-endpoint/v1",
      openaiApiKey: "mock-key",
      totalTrials: defaultTotal,
      warmupTrials: defaultWarmup,
      isMock: true,
      isDebug,
      persona: chosenPersona,
      thinking: chosenThinking,
      samplingProfile: resolvedSampling.profileId,
      samplingParams: resolvedSampling.params,
      locale: chosenLang,
      timeoutSeconds: chosenTimeout,
      noLog: isNoLog,
      isDecisionModel: isDecision,
      stream: chosenStream,
      contextLimit: chosenContextLimit,
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
      sampling_profile: resolvedSampling.profileId,
      sampling_params: resolvedSampling.params,
      locale: chosenLang,
      is_decision_model: isDecision,
      context_limit: chosenContextLimit,
      ...(chosenTimeout !== undefined ? { timeout: chosenTimeout } : {}),
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
      samplingProfile: resolvedSampling.profileId,
      samplingParams: resolvedSampling.params,
      locale: chosenLang,
      timeoutSeconds: chosenTimeout,
      noLog: isNoLog,
      isDecisionModel: isDecision,
      stream: chosenStream,
      contextLimit: chosenContextLimit,
    };
  }

  // 4. 现代化交互式方向键向导 (选择服务商 -> 自动获取远程模型列表 -> 采样配置 -> 确认启动)
  const wizardRes = await runInteractiveWizard({
    lastModel: saved.model,
    lastBaseUrl: saved.openai_base_url,
    lastThinking: saved.thinking,
    lastSamplingProfile: saved.sampling_profile,
    lastSamplingParams: saved.sampling_params,
    presetTrials: cliTrials,
    presetWarmup: cliWarmup,
    presetThinking: rawThinking,
    presetSamplingProfile: rawProfile,
    presetSamplingParams: Object.keys(cliSamplingOverrides).length > 0 ? cliSamplingOverrides : undefined,
    locale: chosenLang,
  });

  const finalIsDecision = Boolean(
    wizardRes.isDecisionModel ||
    isDecisionModelIdentifier(wizardRes.model, wizardRes.baseUrl)
  );

  const effectiveWizardBase = finalIsDecision
    ? normalizeDecisionBaseUrl(wizardRes.baseUrl)
    : wizardRes.baseUrl.replace(/\/+$/, "");

  saveConfig({
    openai_base_url: effectiveWizardBase,
    openai_api_key: wizardRes.apiKey,
    model: wizardRes.model,
    api_base: chosenApiBase,
    ...(chosenPersona ? { persona: chosenPersona } : {}),
    thinking: wizardRes.thinking,
    sampling_profile: wizardRes.samplingProfileId,
    samplingParams: wizardRes.samplingParams,
    locale: chosenLang,
    is_decision_model: finalIsDecision,
    context_limit: chosenContextLimit,
    ...(chosenTimeout !== undefined ? { timeout: chosenTimeout } : {}),
  });

  return {
    model: wizardRes.model,
    apiBase: chosenApiBase,
    openaiBaseUrl: effectiveWizardBase,
    openaiApiKey: wizardRes.apiKey,
    totalTrials: wizardRes.totalTrials,
    warmupTrials: wizardRes.warmupTrials,
    isMock: false,
    isDebug,
    persona: chosenPersona,
    thinking: wizardRes.thinking,
    samplingProfile: wizardRes.samplingProfileId,
    samplingParams: wizardRes.samplingParams,
    locale: chosenLang,
    timeoutSeconds: chosenTimeout,
    noLog: isNoLog,
    isDecisionModel: finalIsDecision,
    stream: chosenStream,
    contextLimit: chosenContextLimit,
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
  trialTps?: number;
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
  locale: SupportedLocale = "zh-CN",
  instructionRole: "user" | "system" = "user"
): any[] {
  const prompts = getPrompts(locale);
  const systemContent = instructionRole === "system"
    ? `${prompts.gameRulesSystemPrompt}\n\n${firstInstructionPrompt}`
    : prompts.gameRulesSystemPrompt;

  const conversation: any[] = [
    { role: "system", content: systemContent },
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
  if (instructionRole === "user") {
    conversation.push({ role: "user", content: firstInstructionPrompt });
  }
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
  hintsCost: number,
  queryDurationMs?: number
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
    : (action === MetacognitiveAction.HIGH_BET ? DEFAULT_CONFIDENCE_HIGH_BET : DEFAULT_CONFIDENCE_SAFE_BET);

  operations.push({
    step: "SECOND_ORDER_BET",
    action,
    details: { confidence },
  });

  const trialDurationMs = Date.now() - trialStartTime;
  const tokenUsageAfter = llmClient.getSessionTokenUsage();
  const completionTokens = Math.max(0, tokenUsageAfter.completionTokens - tokenUsageBefore.completionTokens);
  const trialTokenUsage: TokenUsageStats = {
    prompt_tokens: Math.max(0, tokenUsageAfter.promptTokens - tokenUsageBefore.promptTokens),
    completion_tokens: completionTokens,
    cached_tokens: Math.max(0, tokenUsageAfter.cachedTokens - tokenUsageBefore.cachedTokens),
    reasoning_tokens: Math.max(0, tokenUsageAfter.reasoningTokens - tokenUsageBefore.reasoningTokens),
    total_tokens: Math.max(0, tokenUsageAfter.totalTokens - tokenUsageBefore.totalTokens),
  };

  const effectiveDurationMs = (queryDurationMs && queryDurationMs > 0) ? queryDurationMs : trialDurationMs;
  const trialTps = (effectiveDurationMs > 0 && completionTokens > 0)
    ? Math.round((completionTokens / (effectiveDurationMs / 1000)) * 10) / 10
    : undefined;

  return {
    choice,
    action,
    confidence,
    hintsUnlocked,
    hintsCost,
    trialDurationMs,
    trialTokenUsage,
    trialTps,
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
      try {
        await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, {
          method: "POST",
          headers: { "Accept-Language": config.locale },
        });
      } catch {}
      hintsUnlocked = 1;
      hintsCost = 1;
      operations.push({
        step: "HINT_TIER1",
        action: "BUY_HINT",
        details: { cost: 1 },
      });
      if (Math.random() < 0.30) {
        try {
          await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, {
            method: "POST",
            headers: { "Accept-Language": config.locale },
          });
        } catch {}
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
    const confidence = isConfident ? DEFAULT_CONFIDENCE_HIGH_BET : DEFAULT_CONFIDENCE_SAFE_BET;

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
    llmClient.recordUsage({
      promptTokens: mockPromptTokens,
      cachedTokens: mockCachedTokens,
      completionTokens: mockCompletionTokens,
      totalTokens: mockTotalTokens,
      reasoningTokens: mockReasoningTokens,
    }, trialDurationMs);

    const trialTokenUsage: TokenUsageStats = {
      prompt_tokens: mockPromptTokens,
      completion_tokens: mockCompletionTokens,
      cached_tokens: mockCachedTokens,
      reasoning_tokens: mockReasoningTokens,
      total_tokens: mockTotalTokens,
    };
    const trialTps = Math.round((mockCompletionTokens / (trialDurationMs / 1000)) * 10) / 10;

    return {
      choice,
      action,
      confidence,
      hintsUnlocked,
      hintsCost,
      trialDurationMs,
      trialTokenUsage,
      trialTps,
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
  let queryDurationMs = step1Res.durationMs;

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
    queryDurationMs += step1bRes.durationMs;

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
  queryDurationMs += choiceRes.durationMs;

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
  queryDurationMs += betRes.durationMs;

  return finalizeTrialDecision(
    choiceRes.parsed.choice,
    betRes.parsed,
    operations,
    trialStartTime,
    tokenUsageBefore,
    llmClient,
    hintsUnlocked,
    hintsCost,
    queryDurationMs
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
  const tier1Tool = getTier1HintTool(config.locale);
  const tier2Tool = getTier2HintTool(config.locale);

  const conversation = buildTrialConversation(
    trialIndex,
    payload,
    prompts.thinkingSinglePassUserPrompt,
    config.persona,
    config.locale,
    "system"
  );

  // ---------------------------------------------------------------------------
  // Pass 1：首轮未调阅过线索，仅提供 buy_hint_tier1 工具 (消耗 1 积分，无需参数)
  // ---------------------------------------------------------------------------
  const pass1Res = await llmClient.query(
    conversation,
    schemas.SINGLE_PASS_DECISION_SCHEMA,
    `#${trialIndex}/${config.totalTrials}  thinking pass 1`,
    0.1,
    {
      tools: [tier1Tool],
      stream: config.stream,
      contextLimit: config.contextLimit,
    }
  );

  let queryDurationMs = pass1Res.durationMs;
  let hintsUnlocked = 0;
  let hintsCost = 0;
  let finalParsed = pass1Res.parsed;
  let pass2Res: any = null;
  let pass3Res: any = null;

  const toolCall1 = pass1Res.tool_calls?.find(
    (tc) => tc.function?.name === "buy_hint_tier1" || tc.function?.name === "buy_hint"
  );
  const fallbackBuy1 = !toolCall1 && (
    pass1Res.parsed?.strategy === "BUY_HINT" ||
    pass1Res.parsed?.strategy === "BUY_HINT_TIER1" ||
    pass1Res.parsed?.strategy === "BUY_HINT_TIER2"
  );

  if (toolCall1 || fallbackBuy1) {
    // 调阅第 1 级线索
    const fallbackHint1 = config.locale === "en-US" ? "Tier 1 clue acquired successfully" : "第 1 级线索获取成功";
    const hint1 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint1, config.locale);
    hintsUnlocked = 1;
    hintsCost = 1;

    operations.push({
      step: "HINT_TIER1",
      action: "BUY_HINT",
      details: { cost: 1 },
    });

    if (toolCall1) {
      conversation.push({
        role: "assistant",
        content: pass1Res.content || null,
        tool_calls: pass1Res.tool_calls,
        ...(pass1Res.reasoning_content ? { reasoning_content: pass1Res.reasoning_content } : {}),
      });
      conversation.push({
        role: "tool",
        tool_call_id: toolCall1.id,
        content: hint1,
      });
    } else {
      conversation.push({
        role: "assistant",
        content: pass1Res.content || "",
        ...(pass1Res.reasoning_content ? { reasoning_content: pass1Res.reasoning_content } : {}),
      });
      conversation.push({
        role: "user",
        content: hint1,
      });
    }

    // -------------------------------------------------------------------------
    // Pass 2：Tier 1 已调阅，此轮仅提供 buy_hint_tier2 工具 (再消耗 2 积分，无需参数)
    // 物理层彻底杜绝模型重复调用 Tier 1
    // -------------------------------------------------------------------------
    pass2Res = await llmClient.query(
      conversation,
      schemas.SINGLE_PASS_DECISION_SCHEMA,
      `#${trialIndex}/${config.totalTrials}  tier1 post-hint thinking`,
      0.1,
      {
        tools: [tier2Tool],
        stream: config.stream,
        contextLimit: config.contextLimit,
      }
    );
    queryDurationMs += pass2Res.durationMs;

    const toolCall2 = pass2Res.tool_calls?.find(
      (tc) => tc.function?.name === "buy_hint_tier2" || tc.function?.name === "buy_hint"
    );
    const fallbackBuy2 = !toolCall2 && (
      pass2Res.parsed?.strategy === "BUY_HINT_TIER2" ||
      pass2Res.parsed?.strategy === "BUY_HINT"
    );

    if (toolCall2 || fallbackBuy2) {
      // 调阅第 2 级线索
      const fallbackHint2 = config.locale === "en-US" ? "Tier 2 detail clue acquired successfully" : "第 2 级细节线索获取成功";
      const hint2 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint2, config.locale);
      hintsUnlocked = 2;
      hintsCost = 3;

      operations.push({
        step: "HINT_TIER2",
        action: "BUY_HINT_TIER2",
        details: { cost: 2 },
      });

      if (toolCall2) {
        conversation.push({
          role: "assistant",
          content: pass2Res.content || null,
          tool_calls: pass2Res.tool_calls,
          ...(pass2Res.reasoning_content ? { reasoning_content: pass2Res.reasoning_content } : {}),
        });
        conversation.push({
          role: "tool",
          tool_call_id: toolCall2.id,
          content: hint2,
        });
      } else {
        conversation.push({
          role: "assistant",
          content: pass2Res.content || "",
          ...(pass2Res.reasoning_content ? { reasoning_content: pass2Res.reasoning_content } : {}),
        });
        conversation.push({
          role: "user",
          content: hint2,
        });
      }

      // -----------------------------------------------------------------------
      // Pass 3：全部两级线索已调阅完毕，不再提供任何工具！模型必须给出最终决策
      // -----------------------------------------------------------------------
      pass3Res = await llmClient.query(
        conversation,
        schemas.SINGLE_PASS_DECISION_SCHEMA,
        `#${trialIndex}/${config.totalTrials}  tier2 post-hint thinking`,
        0.1,
        {
          stream: config.stream,
          contextLimit: config.contextLimit,
        }
      );
      queryDurationMs += pass3Res.durationMs;
      finalParsed = pass3Res.parsed;
      if ((!finalParsed || !finalParsed.choice) && pass3Res.reasoning_content) {
        try {
          const rescued = cleanAndExtractJson(pass3Res.reasoning_content);
          if (rescued && rescued.choice) {
            finalParsed = rescued;
          }
        } catch { }
      }
    } else {
      operations.push({
        step: "HINT_TIER2",
        action: "DECIDE",
        details: { cost: 0 },
      });
      finalParsed = pass2Res.parsed;
      if ((!finalParsed || !finalParsed.choice) && pass2Res.reasoning_content) {
        const rescued = rescueOptionFromReasoning(pass2Res.reasoning_content);
        if (rescued) {
          finalParsed = {
            ...(finalParsed || {}),
            choice: rescued,
            action: finalParsed?.action || "SAFE_BET",
            confidence: finalParsed?.confidence ?? 0.5,
          };
        }
      }
    }
  } else {
    operations.push({
      step: "HINT_TIER1",
      action: "DECIDE",
      details: { cost: 0 },
    });
    if ((!finalParsed || !finalParsed.choice) && pass1Res.reasoning_content) {
      const rescued = rescueOptionFromReasoning(pass1Res.reasoning_content);
      if (rescued) {
        finalParsed = {
          ...(finalParsed || {}),
          choice: rescued,
          action: finalParsed?.action || "SAFE_BET",
          confidence: finalParsed?.confidence ?? 0.5,
        };
      }
    }
  }

  let finalChoice = finalParsed?.choice;
  if (!finalChoice) {
    finalChoice = rescueOptionFromReasoning(
      pass3Res?.reasoning_content || pass2Res?.reasoning_content || pass1Res?.reasoning_content
    ) || undefined;
  }

  return finalizeTrialDecision(
    finalChoice,
    finalParsed,
    operations,
    trialStartTime,
    tokenUsageBefore,
    llmClient,
    hintsUnlocked,
    hintsCost,
    queryDurationMs
  );
}

/**
 * TypeSafe AI System One 决策模型评测执行协议
 * 基于 @typesafe-ai/sdk (choice, noul, score, TypeSafeClient) 原生封装
 * 利用 System One 在单次请求中评估共享 state 的多个 questions 特性，
 * 同时评测线索调阅 (hint_strategy)、一阶题目选项 (choice) 与二阶置信下注 (wager)。
 */
export async function executeDecisionModelTrial(
  sessionId: string,
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  config: EvalConfig,
  client: DecisionModelClient
): Promise<StepTrialResult> {
  const trialStartTime = Date.now();
  const tokenUsageBefore = { ...client.getSessionTokenUsage() };
  const operations: TrialOperation[] = [];
  const prompts = getPrompts(config.locale);
  const isEn = config.locale === "en-US";

  let queryDurationMs = 0;
  let hintsUnlocked = 0;
  let hintsCost = 0;

  // 1. 组装初始 state
  let state = `${prompts.gameRulesSystemPrompt}\n\n`;
  if (config.persona && config.persona.trim()) {
    state += `【${isEn ? "Role Persona" : "受试人设"}】\n${config.persona.trim()}\n\n`;
  }
  const header = isEn ? `【Reasoning Task #${trialIndex}】` : `【推演任务 #${trialIndex}】`;
  state += `${header}\n${payload.prompt}`;

  // 2. 初始提问：使用 @typesafe-ai/sdk 的 choice() 构造原生题目
  const initialQuestions = {
    hint_strategy: choice(
      isEn
        ? "Do you need diagnostic clues before deciding (BUY_HINT: costs 1 pt), or proceed directly to answer (DECIDE: costs 0 pts)?"
        : "在作答前是否需要调阅辅助诊断线索 (BUY_HINT: 消耗 1 分)，还是直接进入答题 (DECIDE: 消耗 0 分)？",
      {
        DECIDE: isEn ? "Proceed directly to answer without clues (Cost: 0 pts)" : "直接进入答题环节 (消耗 0 分)",
        BUY_HINT: isEn ? "Inspect Tier 1 assistance clue (Cost: 1 pt)" : "调阅第 1 级辅助诊断线索 (消耗 1 分)",
      }
    ),
    choice: choice(
      isEn
        ? "Which candidate option (A, B, C, or D) is the correct answer to the question?"
        : "候选选项 (A, B, C, 或 D) 中哪一个是该题目的正确答案？",
      {
        A: payload.options["A"] || "A",
        B: payload.options["B"] || "B",
        C: payload.options["C"] || "C",
        D: payload.options["D"] || "D",
      }
    ),
    wager: choice(
      isEn
        ? "Based on your confidence and the payoff rules (+10/-10 with HIGH_BET vs fixed +3 with SAFE_BET), which wagering action do you choose?"
        : "根据你的推演把握度与博弈效用规则 (HIGH_BET 选对+10/选错-10；SAFE_BET 固定+3)，你选择哪种交付下注策略？",
      {
        HIGH_BET: isEn ? "High-risk high-reward bet: +10 if correct, -10 if incorrect" : "高风险下注: 选对 +10 分，选错 -10 分",
        SAFE_BET: isEn ? "Guaranteed safe payoff: +3 regardless of correctness" : "保底收益: 固定获得 +3 分 (不论正误)",
      }
    ),
  };

  const callDecisionApi = async (s: string, q: any, tag: string) => {
    if (typeof (client as any).systemOne === "function") {
      return (client as any).systemOne(s, q, tag);
    }
    return (client as any).decide(s, q, tag);
  };

  const pass1 = await callDecisionApi(state, initialQuestions, `#${trialIndex}/${config.totalTrials} pass 1`);
  queryDurationMs += pass1.durationMs;

  let finalChoiceAns = pass1.answers["choice"];
  let finalWagerAns = pass1.answers["wager"];

  const hintStrategy = pass1.answers["hint_strategy"]?.type === "choice"
    ? (pass1.answers["hint_strategy"] as any).choice
    : "DECIDE";

  if (hintStrategy === "BUY_HINT") {
    // 买第 1 级线索
    const fallbackHint1 = isEn ? "Clue acquired successfully" : "线索获取成功";
    const hint1 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint1, config.locale);
    hintsUnlocked = 1;
    hintsCost = 1;

    operations.push({
      step: "HINT_TIER1",
      action: "BUY_HINT",
      details: { cost: 1 },
    });

    state += `\n\n${isEn ? "【Tier 1 Clue】" : "【第 1 级线索】"}\n${hint1}`;

    // 询问是否买第 2 级线索
    const tier2Questions = {
      hint_tier2_strategy: choice(
        isEn
          ? "Do you need Tier 2 detailed clue (BUY_HINT_TIER2: costs 2 additional pts), or proceed with existing clues (DECIDE: costs 0 pts)?"
          : "是否需要调阅第 2 级细节线索 (BUY_HINT_TIER2: 再消耗 2 分)，还是结合已有线索作答 (DECIDE: 消耗 0 分)？",
        {
          DECIDE: isEn ? "Proceed to answer with existing clues (Cost: 0 pts)" : "结合已有线索进入答题环节 (消耗 0 分)",
          BUY_HINT_TIER2: isEn ? "Inspect Tier 2 detailed clue (Cost: 2 additional pts)" : "调阅第 2 级细节线索 (再消耗 2 分，累计消耗 3 分)",
        }
      ),
      choice: initialQuestions.choice,
      wager: initialQuestions.wager,
    };

    const pass2 = await callDecisionApi(state, tier2Questions, `#${trialIndex}/${config.totalTrials} pass 2 (tier 2 evaluation)`);
    queryDurationMs += pass2.durationMs;

    const tier2Strategy = pass2.answers["hint_tier2_strategy"]?.type === "choice"
      ? (pass2.answers["hint_tier2_strategy"] as any).choice
      : "DECIDE";

    if (tier2Strategy === "BUY_HINT_TIER2") {
      const fallbackHint2 = isEn ? "Detail clue acquired successfully" : "细节线索获取成功";
      const hint2 = await fetchSessionHint(config.apiBase, sessionId, fallbackHint2, config.locale);
      hintsUnlocked = 2;
      hintsCost = 3;

      operations.push({
        step: "HINT_TIER2",
        action: "BUY_HINT_TIER2",
        details: { cost: 2 },
      });

      state += `\n\n${isEn ? "【Tier 2 Clue】" : "【第 2 级线索】"}\n${hint2}`;

      // 携带全部两级线索做出最终 choice 和 wager
      const finalQuestions = {
        choice: initialQuestions.choice,
        wager: initialQuestions.wager,
      };

      const pass3 = await callDecisionApi(state, finalQuestions, `#${trialIndex}/${config.totalTrials} pass 3 (final with all clues)`);
      queryDurationMs += pass3.durationMs;

      finalChoiceAns = pass3.answers["choice"];
      finalWagerAns = pass3.answers["wager"];
    } else {
      operations.push({
        step: "HINT_TIER2",
        action: "DECIDE",
        details: { cost: 0 },
      });
      finalChoiceAns = pass2.answers["choice"];
      finalWagerAns = pass2.answers["wager"];
    }
  } else {
    operations.push({
      step: "HINT_TIER1",
      action: "DECIDE",
      details: { cost: 0 },
    });
  }

  // 提取最终选项
  const rawChoice = (finalChoiceAns as any)?.choice ? String((finalChoiceAns as any).choice).toUpperCase() : "";
  const choiceVal = ["A", "B", "C", "D"].includes(rawChoice) ? rawChoice : "A";

  operations.push({
    step: "FIRST_ORDER_CHOICE",
    action: choiceVal,
    details: {
      raw_choice: rawChoice,
      confidence: (finalChoiceAns as any)?.confidence,
      probabilities: (finalChoiceAns as any)?.probabilities,
    },
  });

  // 提取下注策略
  const wagerChoice = (finalWagerAns as any)?.choice;
  let action: MetacognitiveAction;
  if (wagerChoice === "HIGH_BET") {
    action = MetacognitiveAction.HIGH_BET;
  } else if (wagerChoice === "SAFE_BET") {
    action = MetacognitiveAction.SAFE_BET;
  } else {
    // 概率阈值保底 (P >= 0.65 为 HIGH_BET 理论期望优势区间)
    const prob = (finalChoiceAns as any)?.probabilities?.[choiceVal];
    action = (typeof prob === "number" && prob >= 0.65) ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
  }

  // 提取置信度
  const probVal = (finalChoiceAns as any)?.probabilities?.[choiceVal] ?? (finalChoiceAns as any)?.confidence;
  const confidence = typeof probVal === "number" && !isNaN(probVal)
    ? Math.min(1.0, Math.max(0.0, probVal))
    : (action === MetacognitiveAction.HIGH_BET ? DEFAULT_CONFIDENCE_HIGH_BET : DEFAULT_CONFIDENCE_SAFE_BET);

  operations.push({
    step: "SECOND_ORDER_BET",
    action,
    details: {
      confidence,
      wager_probabilities: (finalWagerAns as any)?.probabilities,
    },
  });

  const trialDurationMs = Date.now() - trialStartTime;
  const tokenUsageAfter = client.getSessionTokenUsage();
  const completionTokens = Math.max(0, tokenUsageAfter.completionTokens - tokenUsageBefore.completionTokens);
  const trialTokenUsage: TokenUsageStats = {
    prompt_tokens: Math.max(0, tokenUsageAfter.promptTokens - tokenUsageBefore.promptTokens),
    completion_tokens: completionTokens,
    cached_tokens: Math.max(0, tokenUsageAfter.cachedTokens - tokenUsageBefore.cachedTokens),
    reasoning_tokens: Math.max(0, tokenUsageAfter.reasoningTokens - tokenUsageBefore.reasoningTokens),
    total_tokens: Math.max(0, tokenUsageAfter.totalTokens - tokenUsageBefore.totalTokens),
  };

  const effectiveDurationMs = (queryDurationMs && queryDurationMs > 0) ? queryDurationMs : trialDurationMs;
  const trialTps = (effectiveDurationMs > 0 && completionTokens > 0)
    ? Math.round((completionTokens / (effectiveDurationMs / 1000)) * 10) / 10
    : undefined;

  return {
    choice: choiceVal,
    action,
    confidence,
    hintsUnlocked,
    hintsCost,
    trialDurationMs,
    trialTokenUsage,
    trialTps,
    operations,
  };
}

/**
 * 统一试次调度入口：根据评测模式自动选择执行分支
 */
export async function runEvaluationTrial(
  sessionId: string,
  trialIndex: number,
  payload: Pick<TrialPayload, "prompt" | "options">,
  config: EvalConfig,
  client: LLMClient | DecisionModelClient
): Promise<StepTrialResult> {
  if (config.isDecisionModel) {
    return executeDecisionModelTrial(sessionId, trialIndex, payload, config, client as DecisionModelClient);
  }
  const isThinkingMode = Boolean(config.thinking && config.thinking !== "none");
  if (isThinkingMode) {
    return executeThinkingToolTrial(sessionId, trialIndex, payload, config, client as LLMClient);
  }
  return executeStepByStepTrial(sessionId, trialIndex, payload, config, client as LLMClient);
}

async function main() {
  const evalStartTime = Date.now();
  const startDateTime = getFullDateTime(new Date(evalStartTime));

  // 1. 获取并确认评测配置
  const config = await resolveConfiguration();

  // 2. 初始化独立日志器并开启脱敏分流
  const isLogDisabled = Boolean(
    config.noLog ||
    process.env.NODE_ENV === "test" ||
    process.env.BUN_TEST === "1" ||
    process.env.EVAL_DISABLE_LOG === "1"
  );

  const logger = new EvalLogger({
    model: config.model,
    apiKey: config.openaiApiKey,
    isDebug: config.isDebug,
    disabled: isLogDisabled,
  });
  if (!isLogDisabled) {
    logger.installGlobalTee();
  }
  config.logFile = logger.getLogPath() || undefined;

  // 3. 初始化 LLM 或决策模型客户端
  const isDecision = Boolean(config.isDecisionModel);
  const isThinkingMode = !isDecision && Boolean(config.thinking && config.thinking !== "none");
  const evaluationMode: EvaluationMode = isDecision
    ? "decision_model"
    : (isThinkingMode ? "thinking_tool" : "multi_step");

  const client: LLMClient | DecisionModelClient = isDecision
    ? new DecisionModelClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        isDebug: config.isDebug,
        logger,
        timeoutMs: config.timeoutSeconds ? config.timeoutSeconds * 1000 : false,
        isMock: config.isMock,
      })
    : new LLMClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        isDebug: config.isDebug,
        thinking: config.thinking,
        samplingParams: config.samplingParams,
        logger,
        timeoutMs: config.timeoutSeconds ? config.timeoutSeconds * 1000 : false,
        stream: config.stream,
        contextLimit: config.contextLimit,
      });

  const isEn = config.locale === "en-US";
  const thinkingDisplay = isEn
    ? (isDecision
        ? "Disabled (TypeSafe AI System One Direct Probabilistic Inference)"
        : (isThinkingMode
            ? `Enabled [${config.thinking} effort] (Single-pass reasoning + buy_hint tool interruption mode)`
            : "Disabled (Explicitly disabled + classic stepped protocol mode)"))
    : (isDecision
        ? "已关闭 (TypeSafe AI System One 概率推断直出，零思维链消耗)"
        : (isThinkingMode
            ? `已开启 [${config.thinking} 强度] (单通推演 + buy_hint 工具中断续接模式)`
            : "未开启 (显式关闭思考 + 经典分步协议模式)"));

  const timeoutDisplay = config.timeoutSeconds && config.timeoutSeconds > 0
    ? `${config.timeoutSeconds}s`
    : (isEn ? "Unlimited (Disabled Bun 300s limit)" : "无限制 (已解除 Bun 300s 默认限制)");

  if (isEn) {
    const pipelineName = isDecision
      ? "🧠 LLM Metacognitive Evaluation Pipeline (TypeSafe AI System One Decision Model Mode)"
      : `🧠 LLM Metacognitive Evaluation Pipeline (${isThinkingMode ? "Single-pass Thinking + Tool" : "Stepped Protocol"})`;
    console.log(`\n========================================================================`);
    console.log(`  ${pipelineName}`);
    console.log(`  🤖 Target Model:      ${config.model} ${config.isMock ? "(Mock Simulation Mode)" : ""}`);
    console.log(`  🕒 Start Time:        ${startDateTime}`);
    console.log(`  🌐 Server Endpoint:   ${config.apiBase}`);
    console.log(`  📊 Trial Scale:       ${config.totalTrials} steps total (${config.warmupTrials} warmup + ${config.totalTrials - config.warmupTrials} formal metacognitive)`);
    console.log(`  🎭 Agent Persona:     ${config.persona ? config.persona : "Default (Neutral / No Persona)"}`);
    if (isDecision) {
      console.log(`  🎯 Architecture:      TypeSafe AI System One (@typesafe-ai/sdk direct probabilistic inference)`);
    } else {
      console.log(`  💭 Thinking Mode:     ${thinkingDisplay}`);
      if (!isThinkingMode && config.samplingParams) {
        console.log(`  🎛️  Sampling Profile:  ${config.samplingProfile || "custom"} (${formatSamplingParams(config.samplingParams)})`);
      }
    }
    if (!config.isMock) {
      console.log(`  🔗 ${isDecision ? "Decision API" : "LLM API"} Endpoint:  ${config.openaiBaseUrl}`);
      console.log(`  🔑 Auth Status:       ${maskKey(config.openaiApiKey)}`);
      console.log(`  ⏱️  Request Timeout:   ${timeoutDisplay}`);
    }
    if (config.logFile) {
      console.log(`  📁 Dedicated Log:     ${config.logFile}`);
    }
    console.log(`  🐞 Debug Mode:        ${config.isDebug ? "Enabled (--debug / Full request and raw response logging)" : "Disabled (Use --debug to enable)"}`);
    console.log(`========================================================================\n`);
  } else {
    const pipelineName = isDecision
      ? "🧠 大模型二元认知 (Metacognition) 标准化评测流水线 (TypeSafe AI System One 决策模型模式)"
      : `🧠 大模型二元认知 (Metacognition) 标准化评测流水线 (${isThinkingMode ? "单通思考+工具模式" : "分步协议模式"})`;
    console.log(`\n========================================================================`);
    console.log(`  ${pipelineName}`);
    console.log(`  🤖 目标模型:      ${config.model} ${config.isMock ? "(Mock 仿真验证模式)" : ""}`);
    console.log(`  🕒 开始时间:      ${startDateTime}`);
    console.log(`  🌐 评测服务端口:  ${config.apiBase}`);
    console.log(`  📊 试次步长:      共 ${config.totalTrials} 步 (前 ${config.warmupTrials} 步阶梯预热 + 后 ${config.totalTrials - config.warmupTrials} 步二元评定)`);
    console.log(`  🎭 Agent 人设:    ${config.persona ? config.persona : "默认 (无自定义人设)"}`);
    if (isDecision) {
      console.log(`  🎯 决策架构:      TypeSafe AI System One (@typesafe-ai/sdk 概率直出，零思维链消耗)`);
    } else {
      console.log(`  💭 思考模式:      ${thinkingDisplay}`);
      if (!isThinkingMode && config.samplingParams) {
        console.log(`  🎛️  采样配置:      ${config.samplingProfile || "custom"} (${formatSamplingParams(config.samplingParams)})`);
      }
    }
    if (!config.isMock) {
      console.log(`  🔗 ${isDecision ? "决策 API" : "LLM API"} 接入点: ${config.openaiBaseUrl}`);
      console.log(`  🔑 鉴权状态:      ${maskKey(config.openaiApiKey)}`);
      console.log(`  ⏱️  单次请求超时:  ${timeoutDisplay}`);
    }
    if (config.logFile) {
      console.log(`  📁 独立日志文件:  ${config.logFile}`);
    }
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
  const launchModeStr = isDecision
    ? (isEn ? "TypeSafe AI System One Decision Model" : "TypeSafe AI System One 决策模型")
    : (isThinkingMode ? (isEn ? "Single-pass reasoning + Tool" : "单通思考+工具调阅") : (isEn ? "Step-by-step isolated" : "分步骤隔离"));

  if (isEn) {
    console.log(`✅ Evaluation session ready: ${sessionId}`);
    console.log(`🚀 Starting ${launchModeStr} task execution and wagering...\n`);
  } else {
    console.log(`✅ 评测会话已就绪: ${sessionId}`);
    console.log(`🚀 开始执行【${launchModeStr}】出题与作答...\n`);
  }

  let completedTrials = 0;

  // 5. 循环执行评测题目
  for (let t = 1; t <= config.totalTrials; t++) {
    const payload = currentReq.payload;
    const trialStart = Date.now();

    const modelAns = await runEvaluationTrial(sessionId, t, payload, config, client);

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
    const speedBadge = modelAns.trialTps !== undefined && modelAns.trialTps > 0
      ? ` | ⚡ ${modelAns.trialTps.toFixed(1)} tok/s`
      : "";
    console.log(`  ${timeStr} ${durationBadge} ${progressStr}: ${hintBadge} ${choiceLabel} [${modelAns.choice}] | ${betLabel} [${modelAns.action}] | Delta: ${payload.difficulty_level.toFixed(3)}${speedBadge}`);

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
  const tokenUsage = client.getSessionTokenUsage();
  const speedStats = client.getSpeedStats();
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
      generation_speed: {
        avg_tokens_per_second: speedStats.avgTps,
        peak_tokens_per_second: speedStats.peakTps,
        total_generation_ms: speedStats.totalGenerationMs,
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

  const metrics = report.metrics || report.metacognitive_metrics;
  const firstOrderAcc = metrics?.first_order_accuracy ?? report.summary?.first_order_accuracy ?? 0;
  const finalScore = report.final_score ?? report.summary?.final_score ?? 0;
  const calibrationBias = metrics?.calibration_bias ?? 0;

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
      const completionPrefix = speedStats.avgTps > 0 ? "├─" : "└─";
      console.log(`    ${completionPrefix} Completion:          ${formatTokenCount(tokenUsage.completionTokens)}${tokenUsage.reasoningTokens > 0 ? ` (Reasoning: ${formatTokenCount(tokenUsage.reasoningTokens)})` : ""}`);
      if (speedStats.avgTps > 0) {
        console.log(`    └─ Generation Speed:    ${speedStats.avgTps.toFixed(1)} tok/s (Peak: ${speedStats.peakTps.toFixed(1)} tok/s)`);
      }
      console.log(`  ----------------------------------------------------------------------`);
    }

    const biasNote = calibrationBias > 0.15
      ? "(Significantly Overconfident)"
      : calibrationBias < -0.15
        ? "(Significantly Underconfident)"
        : "(Well Calibrated)";

    console.log(`  Type-1 Objective Acc:  ${(firstOrderAcc * 100).toFixed(1)}% (Staircase target ~70.7%)`);
    console.log(`  Type-1 Sensitivity (d'): ${(metrics?.d_prime ?? 0).toFixed(3)}`);
    console.log(`  Type-2 Sensitivity (Meta-d'): ${(metrics?.meta_d_prime ?? 0).toFixed(3)}`);
    console.log(`  Metacognitive Efficiency (M_ratio): ${(metrics?.m_ratio ?? 0).toFixed(3)}`);
    console.log(`  Calibration Bias:      ${calibrationBias.toFixed(3)} ${biasNote}`);
    console.log(`  Brier Prediction Error: ${(metrics?.brier_score ?? 0).toFixed(3)}`);
    console.log(`  Final Game Score:      ${finalScore}`);
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
      const completionPrefix = speedStats.avgTps > 0 ? "├─" : "└─";
      console.log(`    ${completionPrefix} 输出 (Completion): ${formatTokenCount(tokenUsage.completionTokens)}${tokenUsage.reasoningTokens > 0 ? ` (其中思维链推理: ${formatTokenCount(tokenUsage.reasoningTokens)})` : ""}`);
      if (speedStats.avgTps > 0) {
        console.log(`    └─ 生成速率 (Speed):   平均 ${speedStats.avgTps.toFixed(1)} tok/s (峰值: ${speedStats.peakTps.toFixed(1)} tok/s)`);
      }
      console.log(`  ----------------------------------------------------------------------`);
    }

    console.log(`  一元客观准确率 (Acc):   ${(firstOrderAcc * 100).toFixed(1)}% (阶梯锁定基准 ~70.7%)`);
    console.log(`  一元辨别力 (d'):       ${(metrics?.d_prime ?? 0).toFixed(3)}`);
    console.log(`  二元敏感度 (Meta-d'):  ${(metrics?.meta_d_prime ?? 0).toFixed(3)}`);
    console.log(`  二元认知效率 (M_ratio): ${(metrics?.m_ratio ?? 0).toFixed(3)}`);
    console.log(`  校准偏差 (Bias):       ${calibrationBias.toFixed(3)} ${calibrationBias > 0.15 ? '(显著过度自负)' : calibrationBias < -0.15 ? '(显著过度谨慎)' : '(知行良好对齐)'}`);
    console.log(`  Brier 预测误差分数:    ${(metrics?.brier_score ?? 0).toFixed(3)}`);
    console.log(`  最终博弈总分:          ${finalScore}`);
    console.log(`  专属特质分型:          【${report.diagnostic_profile.role_title}】 - ${report.diagnostic_profile.praise_tagline}`);
    console.log(`  认知原型 (Archetype):  ${report.diagnostic_profile.archetype}`);
    console.log(`  战略启示与指导建议:    ${report.diagnostic_profile.growth_advice}`);
    console.log(`========================================================================\n`);
  }
  logger.uninstallGlobalTee();
}

if (import.meta.main) {
  main().catch((err) => {
    const isEn = process.env.LANG?.startsWith("en") || process.env.LOCALE?.startsWith("en") || process.env.EVAL_LANG?.startsWith("en");
    console.error(isEn ? "Evaluation terminated abnormally:" : "评测异常终止:", err?.stack || err?.message || err);
    process.exit(1);
  });
}

