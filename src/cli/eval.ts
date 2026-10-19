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
import { MetacognitiveAction, SubjectType, type TokenUsageStats, type TrialOperation } from "../backend/models";
import { formatDuration, formatTokenCount, getFullDateTime, getShortTime, maskKey } from "./lib/formatters";
import { LLMClient } from "./lib/llm_client";
import { EvalLogger } from "./lib/logger";
import {
  BET_STEP3_SCHEMA,
  CHOICE_STEP2_SCHEMA,
  HINT_STEP1_SCHEMA,
  HINT_STEP1B_SCHEMA,
} from "./lib/schema_builder";
import { runInteractiveWizard, type ThinkingEffort } from "./wizard";

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
  logFile?: string;
}

interface SavedConfig {
  openai_base_url?: string;
  openai_api_key?: string;
  model?: string;
  api_base?: string;
  persona?: string;
  thinking?: ThinkingEffort;
}

/**
 * 全局恒定的决策博弈效用规则 (第 1 条 System 消息，零剧透、零人设、纯博弈规则说明)
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

/**
 * 试次初始行动决策指令 (作为紧随题目后的第 2 条 User 消息)
 */
export const STEP1_ACTION_USER_PROMPT = `【本轮行动选择】
- DECIDE: 进入答题环节 (消耗 0 分)
- BUY_HINT: 调阅第 1 级辅助线索 (消耗 1 分)

请以 JSON 格式输出选择，例如: {"strategy": "BUY_HINT"} 或 {"strategy": "DECIDE"}`;

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
  const cliTrials = typeof args.trials === "string" ? parseInt(args.trials, 10) : undefined;
  const cliWarmup = typeof args.warmup === "string" ? parseInt(args.warmup, 10) : undefined;

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
        console.error("\n❌ [错误] 自动化/无人值守模式下未检测到可用的 API Key！");
        console.error("   请在环境变量中指定 OPENAI_API_KEY，或去掉 -y 参数使用交互式配置。");
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
    };
  }

  // 服务端健康状态预检
  const isServerRunning = await checkServerHealth(chosenApiBase);
  if (!isServerRunning) {
    console.warn(`\n⚠️  警告: 未检测到运行中的评测服务端 (${chosenApiBase})！`);
    console.warn(`   评测前请确保在另一个终端执行了 'bun start'。\n`);
  }

  // 2. Mock 模式交互启动
  if (isMock) {
    if (rawThinking !== undefined) {
      saveConfig({
        ...saved,
        thinking: chosenThinking,
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
  });

  saveConfig({
    openai_base_url: wizardRes.baseUrl,
    openai_api_key: wizardRes.apiKey,
    model: wizardRes.model,
    api_base: chosenApiBase,
    ...(chosenPersona ? { persona: chosenPersona } : {}),
    thinking: wizardRes.thinking,
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
 * 分步元认知评测核心执行协议 (自然追加单向会话 + 推理模型思维链完全原生兼容)
 */
async function executeStepByStepTrial(
  sessionId: string,
  trialIndex: number,
  payload: any,
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
      await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
      hintsUnlocked = 1;
      hintsCost = 1;
      operations.push({
        step: "HINT_TIER1",
        action: "BUY_HINT",
        details: { cost: 1 },
      });
      if (Math.random() < 0.30) {
        await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
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
    
    // 模拟 mock 模式下的 token 消耗，确保统计链路一致
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

  // 1. 系统消息装配：
  // 消息 1 (恒定系统消息)：纯粹放置全局恒定的博弈效用规则
  const conversation: any[] = [
    { role: "system", content: GAME_RULES_SYSTEM_PROMPT },
  ];

  // 消息 2 (可选系统消息)：若启动时配置了自定义 Agent 人设，则在此注入第二条 system
  if (config.persona && config.persona.trim()) {
    conversation.push({ role: "system", content: config.persona.trim() });
  }

  // 助手消息追加助手函数：完整透传 reasoning_content 保证 DeepSeek-R1 / QwQ 上下文合法
  const appendAssistant = (res: { content: string; reasoning_content?: string }) => {
    conversation.push({
      role: "assistant",
      content: res.content,
      ...(res.reasoning_content ? { reasoning_content: res.reasoning_content } : {}),
    });
  };

  // 2. 题干与候选选项作为首条 user 消息输入 (无 task_type 剧透，纯净题目数据)
  const optionsText = Object.entries(payload.options)
    .map(([k, v]) => `  [选项 ${k}]:\n${v}`)
    .join("\n\n");

  const firstUserMessage = `【推演任务 #${trialIndex}】
${payload.prompt}

候选选项列表:
${optionsText}`;

  // 连续两个 user 消息：
  // 消息 1: 纯净题目与候选选项
  // 消息 2: 行动选择指令与反省自审引导
  conversation.push({ role: "user", content: firstUserMessage });
  conversation.push({ role: "user", content: STEP1_ACTION_USER_PROMPT });

  // =========================================================================
  // 步骤 1：线索调阅策略决策 (纯粹决定是否调阅辅助线索，由 HINT_STEP1_SCHEMA 约束)
  // =========================================================================
  const step1Res = await llmClient.query(conversation, HINT_STEP1_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 1`);
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
    // 购买第 1 级线索
    const h1Res = await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
    const h1Data = await h1Res.json();
    const hint1 = h1Data.hint || "线索获取成功";
    hintsUnlocked = 1;
    hintsCost = 1;

    // 直接将纯净线索文本作为 user 消息追加
    conversation.push({
      role: "user",
      content: hint1,
    });
    // 紧跟进阶决策指令
    conversation.push({
      role: "user",
      content: `【本轮行动选择】
- DECIDE: 结合已有线索进入答题环节 (消耗 0 分)
- BUY_HINT_TIER2: 调阅第 2 级细节线索 (再消耗 2 分，累计消耗 3 分)

请以 JSON 格式输出选择，例如: {"strategy": "BUY_HINT_TIER2"} 或 {"strategy": "DECIDE"}`,
    });

    // 询问是否继续调阅第 2 级线索
    const step1bRes = await llmClient.query(conversation, HINT_STEP1B_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 1b`);
    appendAssistant(step1bRes);

    const step1bStrategy = step1bRes.parsed.strategy === "BUY_HINT_TIER2" ? "BUY_HINT_TIER2" : "DECIDE";
    operations.push({
      step: "HINT_TIER2",
      action: step1bStrategy,
      details: { cost: step1bStrategy === "BUY_HINT_TIER2" ? 2 : 0 },
    });

    if (step1bStrategy === "BUY_HINT_TIER2") {
      const h2Res = await fetch(`${config.apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
      const h2Data = await h2Res.json();
      const hint2 = h2Data.hint || "细节线索获取成功";
      hintsUnlocked = 2;
      hintsCost = 3;

      // 直接追加第 2 级纯净线索文本
      conversation.push({
        role: "user",
        content: hint2,
      });
    }
  }

  // =========================================================================
  // 步骤 2：一元客观推演 (单向追加，由 CHOICE_STEP2_SCHEMA 驱动)
  // =========================================================================
  conversation.push({
    role: "user",
    content: `请推导并以 JSON 格式输出唯一正确选项，例如: {"choice": "A"}`,
  });

  const choiceRes = await llmClient.query(conversation, CHOICE_STEP2_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 2`);
  appendAssistant(choiceRes);

  const rawChoice = choiceRes.parsed.choice ? String(choiceRes.parsed.choice).toUpperCase() : "";
  const choice = ["A", "B", "C", "D"].includes(rawChoice) ? rawChoice : "A";

  operations.push({
    step: "FIRST_ORDER_CHOICE",
    action: choice,
    details: { raw_choice: rawChoice },
  });

  // =========================================================================
  // 步骤 3：二元置信下注 (一元选项已客观锁定，选择交付策略并给出把握度)
  // =========================================================================
  conversation.push({
    role: "user",
    content: `已选定选项 [${choice}]。请评估确定性把握度 (0.0~1.0) 并选择交付策略：
- HIGH_BET: 正确 +10 分，错误 -10 分
- SAFE_BET: 收益固定为 +3 分 (不论正误)

请以 JSON 格式输出，例如: {"action": "HIGH_BET", "confidence": 0.85}`,
  });

  const betRes = await llmClient.query(conversation, BET_STEP3_SCHEMA, `#${trialIndex}/${config.totalTrials}  step 3`);
  appendAssistant(betRes);

  const action = betRes.parsed.action === "HIGH_BET" ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
  const confidence = typeof betRes.parsed.confidence === "number"
    ? Math.min(1.0, Math.max(0.0, betRes.parsed.confidence))
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

  const thinkingDisplay = config.thinking && config.thinking !== "none"
    ? `已开启 [${config.thinking} 强度] (reasoning_effort: "${config.thinking}")`
    : "未开启 (常规直接回答模式)";

  console.log(`\n========================================================================`);
  console.log(`  🧠 大模型二元认知 (Metacognition) 标准化评测流水线 (分步协议模式)`);
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

  // 4. 创建评测会话
  const sessionRes = await fetch(`${config.apiBase}/api/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_name: `Model_${config.model}`,
      subject_type: SubjectType.LLM_AGENT,
      total_trials: config.totalTrials,
      warmup_trials: config.warmupTrials,
      initial_delta: 0.50,
      persona: config.persona || "标准中性 (零人设)",
      thinking_effort: config.thinking || "none",
      metadata: {
        model_name: config.model,
        persona: config.persona || "标准中性 (零人设)",
        thinking_effort: config.thinking || "none",
        total_trials: config.totalTrials,
        warmup_trials: config.warmupTrials,
      },
    }),
  });

  if (!sessionRes.ok) {
    console.error(`无法连接到评测服务端或会话创建失败: ${sessionRes.status}`);
    console.error(`请先确保在另一终端运行了 'bun start' (默认端口 8000)`);
    process.exit(1);
  }

  let currentReq = await sessionRes.json();
  const sessionId = currentReq.session_id;
  console.log(`✅ 评测会话已就绪: ${sessionId}`);
  console.log(`🚀 开始执行分步骤隔离出题与作答...\n`);

  let completedTrials = 0;

  // 5. 循环执行评测题目
  for (let t = 1; t <= config.totalTrials; t++) {
    const payload = currentReq.payload;
    const trialStart = Date.now();

    const modelAns = await executeStepByStepTrial(sessionId, t, payload, config, llmClient);

    const stepRes = await fetch(`${config.apiBase}/api/sessions/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      console.error(`  ${getShortTime()} [${formatDuration(trialDuration)}] 试次 ${t} 提交失败: ${await stepRes.text()}`);
      break;
    }

    completedTrials++;
    const stepData = await stepRes.json();
    const hintBadge = modelAns.hintsUnlocked === 2
      ? "🔍[买两级线索 -3分]"
      : modelAns.hintsUnlocked === 1
        ? "💡[买1级线索 -1分]"
        : "⚡[直接决断]";

    const timeStr = getShortTime();
    const durationBadge = `[${formatDuration(trialDuration)}]`.padStart(8, " ");
    const progressStr = `${String(t).padStart(2, " ")}/${config.totalTrials}`;
    console.log(`  ${timeStr} ${durationBadge} ${progressStr}: ${hintBadge} 选择 [${modelAns.choice}] | 下注 [${modelAns.action}] | Delta: ${payload.difficulty_level.toFixed(3)}`);

    if (stepData.is_completed) {
      break;
    }

    const nextReq = await fetch(`${config.apiBase}/api/sessions/${sessionId}/trial`);
    currentReq = await nextReq.json();
  }

  // 5b. 同步最终评测执行元数据 (耗时与全局 Token 账单)
  const evalTotalMs = Date.now() - evalStartTime;
  const tokenUsage = llmClient.getSessionTokenUsage();
  await fetch(`${config.apiBase}/api/sessions/${sessionId}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_name: config.model,
      persona: config.persona || "标准中性 (零人设)",
      thinking_effort: config.thinking || "none",
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
    }),
  }).catch(() => {});

  // 6. 提取并展示最终诊断报告
  const reportRes = await fetch(`${config.apiBase}/api/sessions/${sessionId}/report`);
  const report = await reportRes.json();
  const avgTrialMs = completedTrials > 0 ? evalTotalMs / completedTrials : 0;

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

if (import.meta.main) {
  main().catch((err) => {
    console.error("评测异常终止:", err);
    process.exit(1);
  });
}

