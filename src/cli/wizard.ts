#!/usr/bin/env bun
/**
 * Modern Interactive Provider & Model Configuration Wizard (src/cli/wizard.ts)
 * Powered by @clack/prompts (Arrow keys navigation, remote models auto-fetching, persistent registry)
 */

import * as p from "@clack/prompts";
import * as fs from "fs";
import * as path from "path";
import { maskKey } from "./lib/formatters";

export interface ProviderItem {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isLocal?: boolean;
}

export type ThinkingEffort = "none" | "low" | "medium" | "high";

export interface WizardResult {
  provider: ProviderItem;
  model: string;
  baseUrl: string;
  apiKey: string;
  totalTrials: number;
  warmupTrials: number;
  thinking: ThinkingEffort;
}

const PROVIDERS_FILE = path.resolve(process.cwd(), ".eval_providers.json");

const DEFAULT_PROVIDERS: ProviderItem[] = [
  {
    id: "lmstudio",
    name: "LM Studio (本地端点: 1234)",
    baseUrl: "http://127.0.0.1:1234/v1",
    apiKey: "lm-studio",
    isLocal: true,
  },
  {
    id: "ollama",
    name: "Ollama (本地端点: 11434)",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    isLocal: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek 官方 API",
    baseUrl: "https://api.deepseek.com/v1",
    isLocal: false,
  },
  {
    id: "openai",
    name: "OpenAI 官方 API",
    baseUrl: "https://api.openai.com/v1",
    isLocal: false,
  },
  {
    id: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    baseUrl: "https://api.siliconflow.cn/v1",
    isLocal: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter (多模型路由)",
    baseUrl: "https://openrouter.ai/api/v1",
    isLocal: false,
  },
];

export function loadSavedProviders(): ProviderItem[] {
  if (fs.existsSync(PROVIDERS_FILE)) {
    try {
      const saved: ProviderItem[] = JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf-8"));
      if (Array.isArray(saved) && saved.length > 0) {
        const map = new Map<string, ProviderItem>();
        for (const dp of DEFAULT_PROVIDERS) {
          map.set(dp.id, { ...dp });
        }
        for (const sp of saved) {
          if (map.has(sp.id)) {
            map.set(sp.id, { ...map.get(sp.id)!, ...sp });
          } else {
            map.set(sp.id, sp);
          }
        }
        return Array.from(map.values());
      }
    } catch { }
  }
  return DEFAULT_PROVIDERS.map((p) => ({ ...p }));
}

export function saveProviders(providers: ProviderItem[]) {
  try {
    fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2), "utf-8");
  } catch { }
}

export const maskApiKey = maskKey;

/**
 * 动态查询端点 /models 获取可用模型列表
 */
export async function fetchRemoteModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const targetUrl = `${cleanBase}/models`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey !== "ollama" && apiKey !== "none") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(targetUrl, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = await res.json();
  let models: string[] = [];

  if (Array.isArray(json?.data)) {
    models = json.data.map((m: any) => (typeof m === "string" ? m : m.id)).filter(Boolean);
  } else if (Array.isArray(json?.models)) {
    models = json.models.map((m: any) => m.name || m.id).filter(Boolean);
  }

  return Array.from(new Set(models));
}

/**
 * 现代化交互式服务商与模型选择向导
 */
export async function runInteractiveWizard(options?: {
  lastModel?: string;
  lastBaseUrl?: string;
  lastThinking?: ThinkingEffort;
  presetTrials?: number;
  presetWarmup?: number;
  presetThinking?: ThinkingEffort;
}): Promise<WizardResult> {
  p.intro("🧠 大模型元认知评测 · 服务商与模型交互配置向导");

  const providers = loadSavedProviders();

  // 1. 选择服务商 (支持上下方向键)
  const providerOptions = providers.map((pr) => ({
    value: pr.id,
    label: pr.name,
    hint: `${pr.baseUrl} | Key: ${maskKey(pr.apiKey)}`,
  }));

  providerOptions.push({
    value: "__custom__",
    label: "➕ 添加自定义 Provider 端点",
    hint: "配置新的 OpenAI 兼容 API 地址",
  });

  const defaultProviderId = options?.lastBaseUrl
    ? providers.find((p) => p.baseUrl.replace(/\/+$/, "") === options.lastBaseUrl?.replace(/\/+$/, ""))?.id
    : undefined;

  const selectedProviderId = await p.select({
    message: "请使用【↑/↓ 方向键】选择大模型服务商 (Provider):",
    options: providerOptions,
    initialValue: defaultProviderId,
  });

  if (p.isCancel(selectedProviderId)) {
    p.cancel("已取消操作。");
    process.exit(0);
  }

  let provider: ProviderItem;

  if (selectedProviderId === "__custom__") {
    const customName = await p.text({
      message: "请输入 Provider 名称备注:",
      placeholder: "例如: 公司私有大模型集群",
      validate: (v) => (!v || !v.trim() ? "名称不能为空" : undefined),
    });
    if (p.isCancel(customName)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }

    const customBaseUrl = await p.text({
      message: "请输入 OpenAI 兼容的 Base URL (如 http://192.168.1.100:8000/v1):",
      placeholder: "http://...",
      validate: (v) => (!v || !v.trim().startsWith("http") ? "必须是合法的 http/https 地址" : undefined),
    });
    if (p.isCancel(customBaseUrl)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }

    const customKey = await p.text({
      message: "请输入 API Key (若无需密码直接按回车):",
      placeholder: "sk-...",
    });
    if (p.isCancel(customKey)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }

    provider = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      baseUrl: customBaseUrl.trim().replace(/\/+$/, ""),
      apiKey: customKey.trim() || undefined,
      isLocal: customBaseUrl.includes("127.0.0.1") || customBaseUrl.includes("localhost"),
    };

    providers.push(provider);
    saveProviders(providers);
  } else {
    provider = providers.find((pr) => pr.id === selectedProviderId)!;
  }

  // 2. 校验与更新 API Key
  if (!provider.isLocal && !provider.apiKey) {
    const enteredKey = await p.text({
      message: `请输入 ${provider.name} 的 API Key:`,
      placeholder: "sk-...",
      validate: (v) => (!v || !v.trim() ? "API Key 不能为空" : undefined),
    });
    if (p.isCancel(enteredKey)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }
    provider.apiKey = enteredKey.trim();
    saveProviders(providers);
  } else if (!provider.isLocal && provider.apiKey) {
    const changeKey = await p.confirm({
      message: `当前已保存 Key: ${maskKey(provider.apiKey)}，需要修改吗？`,
      initialValue: false,
    });
    if (p.isCancel(changeKey)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }
    if (changeKey) {
      const newKey = await p.text({
        message: "请输入新的 API Key:",
        placeholder: "sk-...",
        validate: (v) => (!v || !v.trim() ? "API Key 不能为空" : undefined),
      });
      if (p.isCancel(newKey)) {
        p.cancel("已取消操作。");
        process.exit(0);
      }
      provider.apiKey = newKey.trim();
      saveProviders(providers);
    }
  }

  const effectiveKey = provider.apiKey || (provider.isLocal ? "ollama" : "");

  // 3. 动态获取远程可用模型
  const s = p.spinner();
  s.start(`正在向 ${provider.name} (${provider.baseUrl}/models) 查询可用模型清单...`);

  let remoteModels: string[] = [];

  try {
    remoteModels = await fetchRemoteModels(provider.baseUrl, effectiveKey);
    s.stop(`✅ 成功获取到 ${remoteModels.length} 个可用模型`);
  } catch (err: any) {
    s.stop(`⚠️  查询 /models 失败 (${err.message})，将使用手动输入模式`);
  }

  // 4. 选择模型 (支持上下方向键)
  let selectedModel = "";

  if (remoteModels.length > 0) {
    const modelChoices = remoteModels.map((m) => ({
      value: m,
      label: m,
    }));

    modelChoices.unshift({
      value: "__manual__",
      label: "✍️ 手动输入其它模型代号...",
    });

    const modelPick = await p.select({
      message: `请使用【↑/↓ 方向键】选择目标评测模型 (共 ${remoteModels.length} 个):`,
      options: modelChoices,
      initialValue: options?.lastModel && remoteModels.includes(options.lastModel) ? options.lastModel : remoteModels[0],
    });

    if (p.isCancel(modelPick)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }

    if (modelPick === "__manual__") {
      const manualName = await p.text({
        message: "请输入模型代号 (Model Name):",
        placeholder: "例如: google/gemma-4-e4b 或 deepseek-chat",
        validate: (v) => (!v || !v.trim() ? "模型名称不能为空" : undefined),
      });
      if (p.isCancel(manualName)) {
        p.cancel("已取消操作。");
        process.exit(0);
      }
      selectedModel = manualName.trim();
    } else {
      selectedModel = modelPick;
    }
  } else {
    const manualName = await p.text({
      message: "请输入目标模型代号 (Model Name):",
      placeholder: "例如: deepseek-chat, gpt-4o, google/gemma-4-e4b",
      validate: (v) => (!v || !v.trim() ? "模型名称不能为空" : undefined),
    });
    if (p.isCancel(manualName)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }
    selectedModel = manualName.trim();
  }

  // 5. 确认或选择评测试次轮数 (Trials & Warmup)
  let totalTrials = options?.presetTrials ?? 60;
  let warmupTrials = options?.presetWarmup ?? (options?.presetTrials ? Math.max(1, Math.floor(totalTrials / 3)) : 20);

  if (!options?.presetTrials) {
    const scaleChoice = await p.select({
      message: "请选择本次评测规模 (测试试次轮数):",
      options: [
        { value: "60", label: "📊 标准基准评测 (60 步: 20 预热 + 40 正式评定，Spec 推荐)" },
        { value: "10", label: "⚡ 快速冒烟测试 (10 步: 3 预热 + 7 正式评定，快速排查验证)" },
        { value: "30", label: "🎯 轻量阶段评测 (30 步: 10 预热 + 20 正式评定)" },
        { value: "100", label: "🔬 深度高精评测 (100 步: 30 预热 + 70 正式评定)" },
        { value: "__custom__", label: "✍️ 自定义测试轮次..." },
      ],
      initialValue: "60",
    });

    if (p.isCancel(scaleChoice)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }

    if (scaleChoice === "__custom__") {
      const customStr = await p.text({
        message: "请输入总试次轮数 (例如 15):",
        placeholder: "15",
        validate: (v) => {
          const n = parseInt(v || "", 10);
          if (isNaN(n) || n <= 0) return "请输入合法的正整数";
          return undefined;
        },
      });
      if (p.isCancel(customStr)) {
        p.cancel("已取消操作。");
        process.exit(0);
      }
      totalTrials = parseInt(customStr.trim(), 10);
    } else {
      totalTrials = parseInt(scaleChoice as string, 10);
    }

    warmupTrials = Math.max(1, Math.floor(totalTrials / 3));
  }

  if (warmupTrials >= totalTrials) {
    warmupTrials = Math.max(1, Math.floor(totalTrials / 3));
  }

  // 6. 确认或选择思维链推理模式 (Thinking / 思考强度)
  let thinking: ThinkingEffort = options?.presetThinking || "none";
  if (!options?.presetThinking) {
    const thinkingChoice = await p.select({
      message: "请选择思维链推理模式 (Thinking / 思考强度):",
      options: [
        { value: "none", label: "⏹️  关闭思考 (none - 默认常规推理，快速直接回答)" },
        { value: "medium", label: "🟡 中等强度 (medium - 推荐，均衡思考深度与速度)" },
        { value: "low", label: "🟢 低等强度 (low - 快速简明思考)" },
        { value: "high", label: "🔴 高等强度 (high - 最大化深度推演，适合复杂博弈)" },
      ],
      initialValue: options?.lastThinking || "none",
    });

    if (p.isCancel(thinkingChoice)) {
      p.cancel("已取消操作。");
      process.exit(0);
    }
    thinking = thinkingChoice as ThinkingEffort;
  }

  const thinkingLabelMap: Record<ThinkingEffort, string> = {
    none: "⏹️ 未开启 (none - 常规直接回答)",
    low: "🟢 低等强度 (low)",
    medium: "🟡 中等强度 (medium)",
    high: "🔴 高等强度 (high)",
  };

  // 7. 最终确认
  p.note(
    `服务商:   ${provider.name}\n端点 URL: ${provider.baseUrl}\n测试模型: ${selectedModel}\n鉴权 Key: ${maskKey(effectiveKey)}\n思考模式: ${thinkingLabelMap[thinking]}\n评测规模: 共 ${totalTrials} 步 (${warmupTrials} 步预热 + ${totalTrials - warmupTrials} 步正式评定)`,
    "🚀 配置就绪"
  );

  const confirmRun = await p.confirm({
    message: "确认以此配置开始执行大模型元认知评测？",
    initialValue: true,
  });

  if (p.isCancel(confirmRun) || !confirmRun) {
    p.cancel("已取消评测。");
    process.exit(0);
  }

  p.outro("配置完成，正在移交启动测试流水线...");

  return {
    provider,
    model: selectedModel,
    baseUrl: provider.baseUrl,
    apiKey: effectiveKey,
    totalTrials,
    warmupTrials,
    thinking,
  };
}

if (import.meta.main) {
  runInteractiveWizard()
    .then((res) => {
      console.log("\n[向导执行结果]:", JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error("向导异常:", err);
      process.exit(1);
    });
}
