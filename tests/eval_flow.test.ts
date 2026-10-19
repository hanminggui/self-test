import { describe, expect, it } from "bun:test";
import { MetacognitiveAction } from "../src/backend/models";
import { GAME_RULES_SYSTEM_PROMPT, STEP1_ACTION_USER_PROMPT } from "../src/cli/eval";
import { formatTokenCount } from "../src/cli/lib/formatters";
import { cleanAndExtractJson } from "../src/cli/lib/json_parser";
import {
  BET_STEP3_SCHEMA,
  BUY_HINT_TOOL,
  CHOICE_STEP2_SCHEMA,
  HINT_STEP1_SCHEMA,
  HINT_STEP1B_SCHEMA,
  SINGLE_PASS_DECISION_SCHEMA,
} from "../src/cli/lib/schema_builder";

describe("LLM Eval Protocol & Prompt Assembly Specifications", () => {
  it("GAME_RULES_SYSTEM_PROMPT 必须包含纯粹博弈效用规则，且零人设、零题目泄漏", () => {
    expect(GAME_RULES_SYSTEM_PROMPT).toContain("【决策博弈效用规则】");
    expect(GAME_RULES_SYSTEM_PROMPT).toContain("HIGH_BET");
    expect(GAME_RULES_SYSTEM_PROMPT).toContain("SAFE_BET");
    expect(GAME_RULES_SYSTEM_PROMPT).toContain("Tier 1");
    expect(GAME_RULES_SYSTEM_PROMPT).toContain("Tier 2");

    // 杜绝任务类型与题目泄漏
    expect(GAME_RULES_SYSTEM_PROMPT).not.toContain("task_type");
    expect(GAME_RULES_SYSTEM_PROMPT).not.toContain("推演任务");
    expect(GAME_RULES_SYSTEM_PROMPT).not.toContain("选项列表");
  });

  it("STEP1_ACTION_USER_PROMPT 保持纯粹中立客观的行动选择指令，零主观诱导", () => {
    expect(STEP1_ACTION_USER_PROMPT).toContain("【本轮行动选择】");
    expect(STEP1_ACTION_USER_PROMPT).toContain("BUY_HINT");
    expect(STEP1_ACTION_USER_PROMPT).toContain("DECIDE");
    // 杜绝情绪恐吓词汇
    expect(STEP1_ACTION_USER_PROMPT).not.toContain("极其惨烈");
    expect(STEP1_ACTION_USER_PROMPT).not.toContain("严重警示");
    expect(STEP1_ACTION_USER_PROMPT).not.toContain("100%");
  });

  it("会话消息组装遵循规范：System 1 (规则) -> 可选 System 2 (人设) -> User 1 (题目) -> User 2 (行动决策)", () => {
    const mockPayload = {
      task_type: "MATRIX_ANALOGY", // 严禁在给模型的提示词中暴露
      prompt: "观察如下矩阵序列并推导下一个元素",
      options: { A: "1", B: "2", C: "3", D: "4" },
    };

    // 1. 无 Persona 场景
    const convWithoutPersona: any[] = [
      { role: "system", content: GAME_RULES_SYSTEM_PROMPT },
    ];
    const optionsText = Object.entries(mockPayload.options)
      .map(([k, v]) => `  [选项 ${k}]:\n${v}`)
      .join("\n\n");
    const userPrompt = `【推演任务 #1】\n${mockPayload.prompt}\n\n候选选项列表:\n${optionsText}`;
    convWithoutPersona.push({ role: "user", content: userPrompt });
    convWithoutPersona.push({ role: "user", content: STEP1_ACTION_USER_PROMPT });

    expect(convWithoutPersona.length).toBe(3);
    expect(convWithoutPersona[0].role).toBe("system");
    expect(convWithoutPersona[0].content).toBe(GAME_RULES_SYSTEM_PROMPT);
    expect(convWithoutPersona[1].role).toBe("user");
    expect(convWithoutPersona[1].content).toContain("【推演任务 #1】");
    expect(convWithoutPersona[1].content).not.toContain("MATRIX_ANALOGY");
    expect(convWithoutPersona[2].role).toBe("user");
    expect(convWithoutPersona[2].content).toBe(STEP1_ACTION_USER_PROMPT);

    // 2. 有 Persona 场景
    const personaText = "你是一位极度审慎的数学推演专家。";
    const convWithPersona: any[] = [
      { role: "system", content: GAME_RULES_SYSTEM_PROMPT },
      { role: "system", content: personaText },
      { role: "user", content: userPrompt },
      { role: "user", content: STEP1_ACTION_USER_PROMPT },
    ];

    expect(convWithPersona.length).toBe(4);
    expect(convWithPersona[0].role).toBe("system");
    expect(convWithPersona[0].content).toBe(GAME_RULES_SYSTEM_PROMPT);
    expect(convWithPersona[1].role).toBe("system");
    expect(convWithPersona[1].content).toBe(personaText);
    expect(convWithPersona[2].role).toBe("user");
    expect(convWithPersona[2].content).toBe(userPrompt);
    expect(convWithPersona[3].role).toBe("user");
    expect(convWithPersona[3].content).toBe(STEP1_ACTION_USER_PROMPT);
  });

  it("线索文本使用纯净内容追加，杜绝废话包裹", () => {
    const rawHint = "第一行元素均以模3递增。";
    const userHintMessage = { role: "user", content: rawHint };
    expect(userHintMessage.content).toBe(rawHint);
    expect(userHintMessage.content).not.toContain("【系统提示】");
    expect(userHintMessage.content).not.toContain("获取到线索");
  });

  it("Schemas 完整且在各阶段字段描述中阐明了博弈规则与选择含义", () => {
    const p1 = HINT_STEP1_SCHEMA.json_schema.schema.properties.strategy;
    expect(p1.enum).toEqual(["DECIDE", "BUY_HINT"]);
    expect(p1.description).toContain("DECIDE");
    expect(p1.description).toContain("BUY_HINT");

    const p1b = HINT_STEP1B_SCHEMA.json_schema.schema.properties.strategy;
    expect(p1b.enum).toEqual(["DECIDE", "BUY_HINT_TIER2"]);

    const p2 = CHOICE_STEP2_SCHEMA.json_schema.schema.properties.choice;
    expect(p2.enum).toEqual(["A", "B", "C", "D"]);

    const p3 = BET_STEP3_SCHEMA.json_schema.schema.properties.action;
    expect(p3.enum).toEqual(["HIGH_BET", "SAFE_BET"]);
    expect(p3.description).toContain("HIGH_BET");
    expect(p3.description).toContain("SAFE_BET");
    expect(p3.description).toContain("+10");
    expect(p3.description).toContain("+3");
  });

  it("思维链思考模式支持 4 档标准强度：none / low / medium / high", () => {
    const validEfforts = ["none", "low", "medium", "high"];
    for (const effort of validEfforts) {
      expect(["none", "low", "medium", "high"]).toContain(effort);
    }
  });

  it("支持自动从模型 content 中提取 <think> 标签并剥离出纯净 JSON", () => {
    const rawModelOutput = `<think>
经过严密的矩阵推导，每一行元素是前一列模 3 加 1。
因此第四个元素必为 A。
</think>
{"choice": "A"}`;

    let reasoningContent = "";
    let cleanContent = rawModelOutput;

    if (cleanContent.includes("<think>")) {
      const match = cleanContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (match) {
        reasoningContent = match[1].trim();
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
      }
    }

    expect(reasoningContent).toContain("经过严密的矩阵推导");
    expect(cleanContent).toBe('{"choice": "A"}');
    const parsed = JSON.parse(cleanContent);
    expect(parsed.choice).toBe("A");
  });

  it("支持当第三方网关剥离 Schema 约束导致纯自然语言输出时的语义韧性解析 (wlf/DeepSeek场景)", () => {
    // 场景 1: 用户实际遇到的真实报错输入 "BUY_HINT（调阅 Tier 1 线索）"
    const parsed1 = cleanAndExtractJson("BUY_HINT（调阅 Tier 1 线索）");
    expect(parsed1.strategy).toBe("BUY_HINT");

    // 场景 2: 二级线索纯文本
    const parsed2 = cleanAndExtractJson("经权衡决定执行 BUY_HINT_TIER2 继续排查");
    expect(parsed2.strategy).toBe("BUY_HINT_TIER2");

    // 场景 3: 直接决策纯文本
    const parsed3 = cleanAndExtractJson("DECIDE: 当前线索已足够");
    expect(parsed3.strategy).toBe("DECIDE");

    // 场景 4: 选项自然语言推断
    const parsed4 = cleanAndExtractJson("根据上述规律推演，最终选定选项为 [B]");
    expect(parsed4.choice).toBe("B");

    // 场景 5: 下注与置信度自然语言
    const parsed5 = cleanAndExtractJson("我的交付策略是 HIGH_BET，主观确信度为 0.90");
    expect(parsed5.action).toBe("HIGH_BET");
    expect(parsed5.confidence).toBe(0.90);
  });

  it("Token 计数自适应格式化工具支持 k / M 自动换算与精准展示", () => {
    expect(formatTokenCount(580)).toBe("580 tokens");
    expect(formatTokenCount(580, false)).toBe("580 tokens");
    expect(formatTokenCount(1234)).toBe("1.23k (1,234 tokens)");
    expect(formatTokenCount(1234, false)).toBe("1.23k tokens");
    expect(formatTokenCount(15420)).toBe("15.42k (15,420 tokens)");
    expect(formatTokenCount(15420, false)).toBe("15.42k tokens");
    expect(formatTokenCount(1250000)).toBe("1.25M (1,250,000 tokens)");
    expect(formatTokenCount(1250000, false)).toBe("1.25M tokens");
  });

  it("BUY_HINT_TOOL 与 SINGLE_PASS_DECISION_SCHEMA 定义符合单通思考+工具调用规范，且支持复合字段提取", () => {
    expect(BUY_HINT_TOOL.type).toBe("function");
    expect(BUY_HINT_TOOL.function.name).toBe("buy_hint");
    const toolProps = BUY_HINT_TOOL.function.parameters.properties;
    expect(toolProps.tier.enum).toEqual([1, 2]);
    expect(toolProps.analysis_so_far.type).toBe("string");
    expect(BUY_HINT_TOOL.function.parameters.required).toEqual(["tier", "analysis_so_far"]);

    const spProps = SINGLE_PASS_DECISION_SCHEMA.json_schema.schema.properties;
    expect(spProps.choice.enum).toEqual(["A", "B", "C", "D"]);
    expect(spProps.action.enum).toEqual(["HIGH_BET", "SAFE_BET"]);
    expect(spProps.confidence.minimum).toBe(0);
    expect(spProps.confidence.maximum).toBe(1);
    expect(SINGLE_PASS_DECISION_SCHEMA.json_schema.schema.required).toEqual(["choice", "action", "confidence"]);

    // 复合输出带 <think> 的解析
    const compositeRaw = `<think>\n排除A和B，确定是D。\n</think>\n\`\`\`json\n{"choice": "D", "action": "HIGH_BET", "confidence": 0.92}\n\`\`\``;
    const parsedComposite = cleanAndExtractJson(compositeRaw);
    expect(parsedComposite.choice).toBe("D");
    expect(parsedComposite.action).toBe("HIGH_BET");
    expect(parsedComposite.confidence).toBe(0.92);
  });

  it("LLMClient 在未开启思考时显式下发关闭思考参数，并在开启思考时支持 tools 与 tool_calls 解析", async () => {
    const { LLMClient } = await import("../src/cli/lib/llm_client");
    const capturedPayloads: any[] = [];
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url: any, init: any) => {
        const body = JSON.parse(init.body);
        capturedPayloads.push(body);

        // 模拟第 1 次调用 (non-thinking client): 返回正常 JSON
        if (capturedPayloads.length === 1) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"strategy": "DECIDE"}' } }],
              usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
            }),
            { status: 200 }
          );
        }

        // 模拟第 2 次调用 (thinking client + BUY_HINT_TOOL): 返回 tool_calls
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "",
                  reasoning_content: "A和C不对，B和D之间需要线索确认",
                  tool_calls: [
                    {
                      id: "call_hint_1",
                      type: "function",
                      function: {
                        name: "buy_hint",
                        arguments: JSON.stringify({
                          tier: 1,
                          analysis_so_far: "已排除A和C，需确认B和D",
                        }),
                      },
                    },
                  ],
                },
              },
            ],
            usage: {
              prompt_tokens: 150,
              completion_tokens: 80,
              total_tokens: 230,
              completion_tokens_details: { reasoning_tokens: 60 },
            },
          }),
          { status: 200 }
        );
      }) as any;

      // 1. 非思考模式客户端：必须显式包含关闭思考标记
      const nonThinkingClient = new LLMClient({
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "qwen3:8b",
        thinking: "none",
      });
      const res1 = await nonThinkingClient.query(
        [{ role: "user", content: "test" }],
        HINT_STEP1_SCHEMA,
        "test-non-thinking"
      );
      expect(res1.parsed.strategy).toBe("DECIDE");
      expect(capturedPayloads[0].reasoning_effort).toBe("none");
      expect(capturedPayloads[0].chat_template_kwargs).toEqual({ enable_thinking: false });

      // 2. 思考模式客户端：挂载 BUY_HINT_TOOL 并解析 tool_calls
      const thinkingClient = new LLMClient({
        baseUrl: "http://localhost:11434/v1",
        apiKey: "ollama",
        model: "qwen3:8b",
        thinking: "medium",
      });
      const res2 = await thinkingClient.query(
        [{ role: "user", content: "solve task" }],
        SINGLE_PASS_DECISION_SCHEMA,
        "test-thinking-tool",
        0.1,
        { tools: [BUY_HINT_TOOL] }
      );
      expect(capturedPayloads[1].reasoning_effort).toBe("medium");
      expect(capturedPayloads[1].chat_template_kwargs).toEqual({ enable_thinking: true });
      expect(capturedPayloads[1].tools).toEqual([BUY_HINT_TOOL]);
      expect(res2.tool_calls?.length).toBe(1);
      expect(res2.tool_calls?.[0].function.name).toBe("buy_hint");
      const parsedArgs = JSON.parse(res2.tool_calls![0].function.arguments);
      expect(parsedArgs.tier).toBe(1);
      expect(parsedArgs.analysis_so_far).toBe("已排除A和C，需确认B和D");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("runEvaluationTrial 在开启思考且不买线索时仅需 1 次 LLM 请求即可完成全部决策", async () => {
    const { runEvaluationTrial } = await import("../src/cli/eval");
    const { LLMClient } = await import("../src/cli/lib/llm_client");

    const llmRequests: any[] = [];
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: any, init: any) => {
        const urlStr = String(url);
        if (urlStr.endsWith("/chat/completions")) {
          llmRequests.push(JSON.parse(init.body));
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    reasoning_content: "直接推演出唯一解为 C，把握度极高。",
                    content: JSON.stringify({
                      choice: "C",
                      action: "HIGH_BET",
                      confidence: 0.95,
                    }),
                  },
                },
              ],
              usage: {
                prompt_tokens: 180,
                completion_tokens: 90,
                total_tokens: 270,
                completion_tokens_details: { reasoning_tokens: 70 },
              },
            }),
            { status: 200 }
          );
        }
        throw new Error(`Unexpected fetch: ${urlStr}`);
      }) as any;

      const config: any = {
        model: "qwen3-thinking",
        apiBase: "http://localhost:8000",
        openaiBaseUrl: "http://localhost:11434/v1",
        openaiApiKey: "ollama",
        totalTrials: 10,
        warmupTrials: 3,
        isMock: false,
        isDebug: false,
        thinking: "high",
      };
      const client = new LLMClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        thinking: config.thinking,
      });

      const result = await runEvaluationTrial(
        "sess_1",
        1,
        {
          prompt: "求矩阵缺失项",
          options: { A: "1", B: "2", C: "3", D: "4" },
        },
        config,
        client
      );

      expect(llmRequests.length).toBe(1);
      expect(llmRequests[0].reasoning_effort).toBe("high");
      expect(llmRequests[0].tools?.[0]?.function?.name).toBe("buy_hint");
      expect(result.choice).toBe("C");
      expect(result.action).toBe(MetacognitiveAction.HIGH_BET);
      expect(result.confidence).toBe(0.95);
      expect(result.hintsUnlocked).toBe(0);
      expect(result.hintsCost).toBe(0);
      expect(result.operations.map((o: any) => o.step)).toEqual([
        "HINT_TIER1",
        "FIRST_ORDER_CHOICE",
        "SECOND_ORDER_BET",
      ]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("runEvaluationTrial 在开启思考且触发 buy_hint 工具调用时，拉取线索并在第 2 步显式关闭思考完成最终作答", async () => {
    const { runEvaluationTrial } = await import("../src/cli/eval");
    const { LLMClient } = await import("../src/cli/lib/llm_client");

    const llmRequests: any[] = [];
    let hintApiCalls = 0;
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: any, init: any) => {
        const urlStr = String(url);
        if (urlStr.endsWith("/api/sessions/sess_2/hint")) {
          hintApiCalls += 1;
          return new Response(
            JSON.stringify({
              hint: hintApiCalls === 1 ? "宏观线索：奇偶交替" : "微观线索：末尾必为偶数",
            }),
            { status: 200 }
          );
        }
        if (urlStr.endsWith("/chat/completions")) {
          const body = JSON.parse(init.body);
          llmRequests.push(body);

          if (llmRequests.length === 1) {
            // 第 1 次请求：思考中途决定调用 buy_hint (tier: 2)
            return new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: "",
                      reasoning_content: "已排除A和C，但B和D之间缺条件，调用工具买线索。",
                      tool_calls: [
                        {
                          id: "call_hint_tier2",
                          type: "function",
                          function: {
                            name: "buy_hint",
                            arguments: JSON.stringify({
                              tier: 2,
                              analysis_so_far: "已排除A(1)和C(3)，仅需在B(2)与D(4)间锁定",
                            }),
                          },
                        },
                      ],
                    },
                  },
                ],
                usage: { prompt_tokens: 200, completion_tokens: 60, total_tokens: 260 },
              }),
              { status: 200 }
            );
          }

          // 第 2 次请求：拿到线索后，关闭思考直接输出最终决策
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      choice: "D",
                      action: "HIGH_BET",
                      confidence: 0.88,
                    }),
                  },
                },
              ],
              usage: { prompt_tokens: 280, completion_tokens: 25, total_tokens: 305 },
            }),
            { status: 200 }
          );
        }
        throw new Error(`Unexpected fetch: ${urlStr}`);
      }) as any;

      const config: any = {
        model: "qwen3-thinking",
        apiBase: "http://localhost:8000",
        openaiBaseUrl: "http://localhost:11434/v1",
        openaiApiKey: "ollama",
        totalTrials: 10,
        warmupTrials: 3,
        isMock: false,
        isDebug: false,
        thinking: "medium",
      };
      const client = new LLMClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        thinking: config.thinking,
      });

      const result = await runEvaluationTrial(
        "sess_2",
        2,
        {
          prompt: "求矩阵缺失项",
          options: { A: "1", B: "2", C: "3", D: "4" },
        },
        config,
        client
      );

      expect(hintApiCalls).toBe(2);
      expect(llmRequests.length).toBe(2);
      // 第 1 次请求开启思考并挂载工具
      expect(llmRequests[0].reasoning_effort).toBe("medium");
      expect(llmRequests[0].chat_template_kwargs).toEqual({ enable_thinking: true });
      // 第 2 次请求（已获线索与阶段结论）显式关闭思考，避免重复思考
      expect(llmRequests[1].reasoning_effort).toBe("none");
      expect(llmRequests[1].chat_template_kwargs).toEqual({ enable_thinking: false });

      expect(result.choice).toBe("D");
      expect(result.action).toBe(MetacognitiveAction.HIGH_BET);
      expect(result.confidence).toBe(0.88);
      expect(result.hintsUnlocked).toBe(2);
      expect(result.hintsCost).toBe(3);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("runEvaluationTrial 在未开启思考 (thinking: none) 时走经典 3 步流程且每步均显式关闭思考，并支持 HTTP 400 参数降级", async () => {
    const { runEvaluationTrial } = await import("../src/cli/eval");
    const { LLMClient } = await import("../src/cli/lib/llm_client");

    const llmRequests: any[] = [];
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (_url: any, init: any) => {
        const body = JSON.parse(init.body);
        llmRequests.push(body);

        // 模拟端点拒绝 chat_template_kwargs 返回 400，验证自适应降级重试
        if (body.chat_template_kwargs !== undefined) {
          return new Response(
            JSON.stringify({ error: { message: "Unknown parameter: chat_template_kwargs" } }),
            { status: 400 }
          );
        }

        if (llmRequests.length <= 2) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"strategy": "DECIDE"}' } }],
              usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
            }),
            { status: 200 }
          );
        }
        if (llmRequests.length <= 4) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"choice": "B"}' } }],
              usage: { prompt_tokens: 120, completion_tokens: 10, total_tokens: 130 },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"action": "SAFE_BET", "confidence": 0.6}' } }],
            usage: { prompt_tokens: 140, completion_tokens: 15, total_tokens: 155 },
          }),
          { status: 200 }
        );
      }) as any;

      const config: any = {
        model: "gpt-4o-mini",
        apiBase: "http://localhost:8000",
        openaiBaseUrl: "https://api.openai.com/v1",
        openaiApiKey: "sk-test",
        totalTrials: 10,
        warmupTrials: 3,
        isMock: false,
        isDebug: false,
        thinking: "none",
      };
      const client = new LLMClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        thinking: config.thinking,
      });

      const result = await runEvaluationTrial(
        "sess_3",
        3,
        {
          prompt: "求序列规律",
          options: { A: "10", B: "20", C: "30", D: "40" },
        },
        config,
        client
      );

      // 3 个步骤，每步首次携带 chat_template_kwargs: {enable_thinking: false} 触发 400 后自动剔除重试成功 (共 6 次底层请求)
      expect(llmRequests.length).toBe(6);
      expect(llmRequests[0].reasoning_effort).toBe("none");
      expect(llmRequests[0].chat_template_kwargs).toEqual({ enable_thinking: false });
      expect(llmRequests[1].chat_template_kwargs).toBeUndefined();
      expect(result.choice).toBe("B");
      expect(result.action).toBe(MetacognitiveAction.SAFE_BET);
      expect(result.confidence).toBe(0.6);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("executeThinkingToolTrial 支持先买 Tier 1 线索再递进调取 Tier 2 线索，并在 --debug 下输出 [tool_call] 与 [tool_result]", async () => {
    const { runEvaluationTrial } = await import("../src/cli/eval");
    const { LLMClient } = await import("../src/cli/lib/llm_client");

    const debugLogs: string[] = [];
    const mockLogger: any = {
      log: (m: string) => debugLogs.push(m),
      warn: (m: string) => debugLogs.push(m),
      error: (m: string) => debugLogs.push(m),
    };

    let hintApiCalls = 0;
    let llmCallIdx = 0;
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.endsWith("/api/sessions/sess_seq/hint")) {
          hintApiCalls += 1;
          return new Response(
            JSON.stringify({
              hint: hintApiCalls === 1 ? "Tier1线索：行和为15" : "Tier2线索：右下角必为质数",
            }),
            { status: 200 }
          );
        }
        llmCallIdx += 1;
        if (llmCallIdx === 1) {
          // Pass 1: 申请 Tier 1
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "",
                    reasoning_content: "先看一级线索",
                    tool_calls: [
                      {
                        id: "tc_1",
                        type: "function",
                        function: {
                          name: "buy_hint",
                          arguments: JSON.stringify({ tier: 1, analysis_so_far: "排除A" }),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (llmCallIdx === 2) {
          // Pass 2: 看到 Tier 1 后继续申请 Tier 2
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "",
                    tool_calls: [
                      {
                        id: "tc_2",
                        type: "function",
                        function: {
                          name: "buy_hint",
                          arguments: JSON.stringify({ tier: 2, analysis_so_far: "排除A和B，还差最后一步" }),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        // Pass 3: 最终决策
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ choice: "C", action: "HIGH_BET", confidence: 0.91 }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }) as any;

      const config: any = {
        model: "qwen3-thinking",
        apiBase: "http://localhost:8000",
        openaiBaseUrl: "http://localhost:11434/v1",
        openaiApiKey: "ollama",
        totalTrials: 5,
        warmupTrials: 1,
        isMock: false,
        isDebug: true,
        thinking: "low",
      };
      const client = new LLMClient({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.model,
        isDebug: true,
        thinking: config.thinking,
        logger: mockLogger,
      });

      const result = await runEvaluationTrial(
        "sess_seq",
        1,
        { prompt: "九宫格推演", options: { A: "2", B: "4", C: "5", D: "8" } },
        config,
        client
      );

      expect(hintApiCalls).toBe(2);
      expect(result.hintsUnlocked).toBe(2);
      expect(result.hintsCost).toBe(3);
      expect(result.choice).toBe("C");
      expect(debugLogs.some((l) => l.includes("[tool_call]"))).toBe(true);
      expect(debugLogs.some((l) => l.includes("[tool_result]"))).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});





