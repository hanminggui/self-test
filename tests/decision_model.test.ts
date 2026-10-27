import { describe, expect, it } from "bun:test";
import { MetacognitiveAction } from "../src/backend/models";
import {
  DecisionModelClient,
  choice,
  noul,
  score,
  TypeSafeClient,
} from "../src/cli/lib/decision_client";
import {
  executeDecisionModelTrial,
  isDecisionModelIdentifier,
  normalizeDecisionBaseUrl,
  runEvaluationTrial,
  type EvalConfig,
} from "../src/cli/eval";
import { DEFAULT_DECISION_MODELS, loadSavedProviders } from "../src/cli/wizard";

describe("TypeSafe AI & Baseten System One 决策模型架构测试 (Decision Models Suite)", () => {
  it("导出原生 @typesafe-ai/sdk 接口与辅助函数 (choice, noul, score, TypeSafeClient)", () => {
    expect(typeof TypeSafeClient).toBe("function");
    expect(typeof choice).toBe("function");
    expect(typeof noul).toBe("function");
    expect(typeof score).toBe("function");

    // 验证 helper 构造结果
    const c = choice("Which team should handle this?", { billing: "Billing issues", tech: "Tech support" });
    expect(c.type).toBe("choice");
    expect(c.instructions).toBe("Which team should handle this?");
    expect(c.criteria).toEqual({ billing: "Billing issues", tech: "Tech support" });

    const n = noul("Is the customer asking for refund?");
    expect(n.type).toBe("noul");
    expect(n.instructions).toBe("Is the customer asking for refund?");

    const s = score("Rate urgency", ["Routine", "Today", "Emergency"]);
    expect(s.type).toBe("score");
    expect(s.instructions).toBe("Rate urgency");
    expect(s.criteria).toEqual(["Routine", "Today", "Emergency"]);
  });

  it("isDecisionModelIdentifier 正确识别官方 Jev 决策模型、Baseten 托管端点或显式标记", () => {
    // 1. TypeSafe AI 官方 Jev 系列模型
    expect(isDecisionModelIdentifier("jev-latest")).toBe(true);
    expect(isDecisionModelIdentifier("jev-preview")).toBe(true);
    expect(isDecisionModelIdentifier("typesafe-jev-latest")).toBe(true);
    expect(isDecisionModelIdentifier("any-model", "https://api.typesafe.ai")).toBe(true);

    // 2. Baseten 托管决策模型 Slug 与端点
    expect(isDecisionModelIdentifier("decision-models/baseten-elephant-9b-latest")).toBe(true);
    expect(isDecisionModelIdentifier("decision-models/baseten-mammoth-27b-latest")).toBe(true);
    expect(isDecisionModelIdentifier("baseten-elephant-9b")).toBe(true);
    expect(isDecisionModelIdentifier("baseten-mammoth-27b")).toBe(true);
    expect(isDecisionModelIdentifier("custom-model", "https://inference.baseten.co")).toBe(true);
    expect(isDecisionModelIdentifier("custom-model", "https://inference.baseten.co/v1/systemone")).toBe(true);

    // 3. 显式 Flag 匹配
    expect(isDecisionModelIdentifier("any-model", "http://localhost:8000", true)).toBe(true);

    // 4. 普通生成式模型应返回 false
    expect(isDecisionModelIdentifier("deepseek-chat", "https://api.deepseek.com/v1")).toBe(false);
    expect(isDecisionModelIdentifier("gpt-4o", "https://api.openai.com/v1")).toBe(false);
    expect(isDecisionModelIdentifier("qwen2.5:7b", "http://localhost:11434/v1")).toBe(false);
  });

  it("normalizeDecisionBaseUrl 与 DecisionModelClient 自动清理多余的 /v1 或 /v1/systemone 后缀，杜绝 404", async () => {
    expect(normalizeDecisionBaseUrl("https://api.typesafe.ai/v1")).toBe("https://api.typesafe.ai");
    expect(normalizeDecisionBaseUrl("https://api.typesafe.ai/v1/systemone")).toBe("https://api.typesafe.ai");
    expect(normalizeDecisionBaseUrl("https://inference.baseten.co/v1/systemone/")).toBe("https://inference.baseten.co");
    expect(normalizeDecisionBaseUrl("https://inference.baseten.co/v1")).toBe("https://inference.baseten.co");
    expect(normalizeDecisionBaseUrl("https://api.typesafe.ai")).toBe("https://api.typesafe.ai");

    // 验证即使传入带有 /v1 的 BaseUrl，DecisionModelClient 也能自动净化为根路径
    const client = new DecisionModelClient({
      baseUrl: "https://api.typesafe.ai/v1",
      apiKey: "test-key",
      model: "jev-latest",
      isMock: true,
    });
    expect(client.getBaseUrl()).toBe("https://api.typesafe.ai");
  });

  it("DEFAULT_DECISION_MODELS 与 Provider 列表包含 TypeSafe AI 与 Baseten 官方服务商及模型预设", () => {
    expect(DEFAULT_DECISION_MODELS.length).toBeGreaterThanOrEqual(3);
    const slugs = DEFAULT_DECISION_MODELS.map((m) => m.id);
    expect(slugs).toContain("jev-latest");
    expect(slugs).toContain("decision-models/baseten-elephant-9b-latest");
    expect(slugs).toContain("decision-models/baseten-mammoth-27b-latest");

    const providers = loadSavedProviders();
    const typesafeProvider = providers.find((p) => p.id === "typesafe");
    expect(typesafeProvider).toBeDefined();
    expect(typesafeProvider?.baseUrl).toContain("api.typesafe.ai");
    expect(typesafeProvider?.isDecisionModel).toBe(true);

    const basetenProvider = providers.find((p) => p.id === "baseten");
    expect(basetenProvider).toBeDefined();
    expect(basetenProvider?.baseUrl).toContain("inference.baseten.co");
    expect(basetenProvider?.isDecisionModel).toBe(true);
  });

  it("DecisionModelClient 在 Mock 模式下生成合法的多题答案、概率分布与 Token 账单", async () => {
    const client = new DecisionModelClient({
      model: "jev-latest",
      isMock: true,
    });

    const questions = {
      choice: choice("Which option is correct?", {
        A: "First candidate",
        B: "Second candidate",
        C: "Third candidate",
        D: "Fourth candidate",
      }),
      refund: noul("Is a refund requested?"),
      urgency: score("How urgent is this?", ["Low", "Medium", "High"]),
    };

    const res = await client.systemOne("Test State Input", questions, "mock-test");
    expect(res.answers.choice).toBeDefined();
    expect(res.answers.choice.type).toBe("choice");
    if (res.answers.choice.type === "choice") {
      expect(["A", "B", "C", "D"]).toContain(res.answers.choice.choice);
      expect(res.answers.choice.confidence).toBeGreaterThan(0);
      expect(res.answers.choice.probabilities).toBeDefined();
    }

    expect(res.answers.refund.type).toBe("noul");
    if (res.answers.refund.type === "noul") {
      expect(res.answers.refund.noul).toBeGreaterThanOrEqual(0);
    }

    expect(res.answers.urgency.type).toBe("score");

    const usage = client.getSessionTokenUsage();
    expect(usage.promptTokens).toBeGreaterThan(0);
    expect(usage.completionTokens).toBe(3); // 3 个 questions
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
  });

  it("DecisionModelClient 真实网络模式构造标准 System One 请求报文并解析 answers", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);

        const mockResponse: DecisionResponse = {
          answers: {
            route: {
              type: "choice",
              choice: "billing",
              confidence: 0.9985,
              probabilities: {
                billing: 0.9992,
                technical_support: 0.0008,
              },
            },
            refund: {
              type: "noul",
              noul: 0.988,
            },
          },
          usage: {
            input_tokens: 154,
            output_tokens: 2,
            total_tokens: 156,
          },
        };

        return new Response(JSON.stringify(mockResponse), { status: 200 });
      }) as any;

      const client = new DecisionModelClient({
        baseUrl: "https://inference.baseten.co",
        apiKey: "test-baseten-key-12345",
        model: "decision-models/baseten-elephant-9b-latest",
      });

      const res = await client.decide(
        "I was charged twice. Please refund the duplicate charge.",
        {
          route: {
            type: "choice",
            instructions: "Which team should handle this?",
            criteria: {
              billing: "Billing and refunds",
              technical_support: "Tech support",
            },
          },
          refund: {
            type: "noul",
            instructions: "Is customer asking for refund?",
          },
        },
        "unit-test"
      );

      expect(capturedUrl).toBe("https://inference.baseten.co/v1/systemone");
      expect(capturedHeaders["Authorization"]).toBe("Bearer test-baseten-key-12345");
      expect(capturedHeaders["Content-Type"]).toBe("application/json");
      expect(capturedBody.model).toBe("decision-models/baseten-elephant-9b-latest");
      expect(capturedBody.questions.route).toBeDefined();
      expect(capturedBody.questions.refund).toBeDefined();

      expect(res.answers.route.type).toBe("choice");
      if (res.answers.route.type === "choice") {
        expect(res.answers.route.choice).toBe("billing");
        expect(res.answers.route.confidence).toBe(0.9985);
        expect(res.answers.route.probabilities?.billing).toBe(0.9992);
      }

      const usage = client.getSessionTokenUsage();
      expect(usage.promptTokens).toBe(154);
      expect(usage.completionTokens).toBe(2);
      expect(usage.totalTokens).toBe(156);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("executeDecisionModelTrial 在模型选择直接答题时，单次请求即可闭环并正确结算", async () => {
    const mockClient = {
      getSessionTokenUsage: () => ({
        promptTokens: 120,
        completionTokens: 3,
        totalTokens: 123,
        cachedTokens: 0,
        reasoningTokens: 0,
      }),
      decide: async () => ({
        answers: {
          hint_strategy: {
            type: "choice",
            choice: "DECIDE",
            confidence: 0.95,
          },
          choice: {
            type: "choice",
            choice: "B",
            confidence: 0.88,
            probabilities: { A: 0.04, B: 0.88, C: 0.05, D: 0.03 },
          },
          wager: {
            type: "choice",
            choice: "HIGH_BET",
            confidence: 0.90,
            probabilities: { HIGH_BET: 0.90, SAFE_BET: 0.10 },
          },
        },
        usage: { promptTokens: 120, completionTokens: 3, totalTokens: 123, cachedTokens: 0, reasoningTokens: 0 },
        durationMs: 45,
      }),
    } as any;

    const config: EvalConfig = {
      model: "decision-models/baseten-elephant-9b-latest",
      apiBase: "http://localhost:8000",
      openaiBaseUrl: "https://inference.baseten.co",
      openaiApiKey: "test-key",
      totalTrials: 10,
      warmupTrials: 3,
      isMock: false,
      isDebug: false,
      thinking: "none",
      locale: "zh-CN",
      isDecisionModel: true,
    };

    const payload = {
      prompt: "推演矩阵第四象限元素",
      options: { A: "1", B: "2", C: "3", D: "4" },
    };

    const res = await executeDecisionModelTrial("session_123", 1, payload, config, mockClient);

    expect(res.choice).toBe("B");
    expect(res.action).toBe(MetacognitiveAction.HIGH_BET);
    expect(res.confidence).toBe(0.88); // 提取选项概率
    expect(res.hintsUnlocked).toBe(0);
    expect(res.hintsCost).toBe(0);

    const opSteps = res.operations.map((op) => op.step);
    expect(opSteps).toContain("HINT_TIER1");
    expect(opSteps).toContain("FIRST_ORDER_CHOICE");
    expect(opSteps).toContain("SECOND_ORDER_BET");

    const hintOp = res.operations.find((op) => op.step === "HINT_TIER1");
    expect(hintOp?.action).toBe("DECIDE");
    expect(hintOp?.details?.cost).toBe(0);
  });

  it("executeDecisionModelTrial 在模型决定购买线索时，能调阅后端线索并把新上下文送回决策模型", async () => {
    let callCount = 0;
    const capturedStates: string[] = [];

    const mockClient = {
      getSessionTokenUsage: () => ({
        promptTokens: 250,
        completionTokens: 6,
        totalTokens: 256,
        cachedTokens: 0,
        reasoningTokens: 0,
      }),
      decide: async (state: string) => {
        callCount++;
        capturedStates.push(state);

        if (callCount === 1) {
          // Pass 1: 决定购买线索
          return {
            answers: {
              hint_strategy: {
                type: "choice",
                choice: "BUY_HINT",
                confidence: 0.92,
              },
              choice: {
                type: "choice",
                choice: "C",
                confidence: 0.40,
                probabilities: { A: 0.25, B: 0.25, C: 0.40, D: 0.10 },
              },
              wager: {
                type: "choice",
                choice: "SAFE_BET",
                confidence: 0.60,
              },
            },
            durationMs: 50,
          };
        } else {
          // Pass 2: 已获取 Tier 1 线索，不再买 Tier 2，完成作答
          return {
            answers: {
              hint_tier2_strategy: {
                type: "choice",
                choice: "DECIDE",
                confidence: 0.90,
              },
              choice: {
                type: "choice",
                choice: "A",
                confidence: 0.94,
                probabilities: { A: 0.94, B: 0.02, C: 0.02, D: 0.02 },
              },
              wager: {
                type: "choice",
                choice: "HIGH_BET",
                confidence: 0.96,
              },
            },
            durationMs: 40,
          };
        }
      },
    } as any;

    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (url: any) => {
        if (String(url).includes("/hint")) {
          return new Response(JSON.stringify({ hint: "核心规律：每行按二进制反转" }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }) as any;

      const config: EvalConfig = {
        model: "decision-models/baseten-mammoth-27b-latest",
        apiBase: "http://localhost:8000",
        openaiBaseUrl: "https://inference.baseten.co",
        openaiApiKey: "test-key",
        totalTrials: 10,
        warmupTrials: 3,
        isMock: false,
        isDebug: false,
        thinking: "none",
        locale: "zh-CN",
        isDecisionModel: true,
      };

      const payload = {
        prompt: "分析序列找出缺省值",
        options: { A: "101", B: "010", C: "111", D: "000" },
      };

      const res = await executeDecisionModelTrial("session_hint_test", 2, payload, config, mockClient);

      expect(callCount).toBe(2);
      expect(res.hintsUnlocked).toBe(1);
      expect(res.hintsCost).toBe(1);
      expect(res.choice).toBe("A");
      expect(res.action).toBe(MetacognitiveAction.HIGH_BET);
      expect(res.confidence).toBe(0.94);

      // 验证 Pass 2 中的 state 包含了注入的 Tier 1 线索
      expect(capturedStates[1]).toContain("【第 1 级线索】");
      expect(capturedStates[1]).toContain("核心规律：每行按二进制反转");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("runEvaluationTrial 能够透明分流至决策模型执行引擎", async () => {
    const mockDecisionClient = new DecisionModelClient({
      model: "decision-models/baseten-elephant-9b-latest",
      isMock: true,
    });

    const config: EvalConfig = {
      model: "decision-models/baseten-elephant-9b-latest",
      apiBase: "http://localhost:8000",
      openaiBaseUrl: "https://inference.baseten.co",
      openaiApiKey: "mock-key",
      totalTrials: 5,
      warmupTrials: 2,
      isMock: true,
      isDebug: false,
      thinking: "none",
      locale: "zh-CN",
      isDecisionModel: true,
    };

    const payload = {
      prompt: "选择最佳匹配",
      options: { A: "选项一", B: "选项二", C: "选项三", D: "选项四" },
    };

    const trialRes = await runEvaluationTrial("mock_session", 1, payload, config, mockDecisionClient);
    expect(["A", "B", "C", "D"]).toContain(trialRes.choice);
    expect([MetacognitiveAction.HIGH_BET, MetacognitiveAction.SAFE_BET]).toContain(trialRes.action);
    expect(trialRes.confidence).toBeGreaterThanOrEqual(0);
    expect(trialRes.confidence).toBeLessThanOrEqual(1.0);
  });
});
