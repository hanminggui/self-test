import { describe, expect, it } from "bun:test";
import { rescueOptionFromReasoning } from "../src/cli/lib/json_parser";
import { detectReasoningRepetition, flattenMessagesForSettlement, LLMClient } from "../src/cli/lib/llm_client";

describe("Client-side Streaming Circuit Breaker & Fast Settlement", () => {
  it("detectReasoningRepetition 能够准确识别小模型思考中的车轱辘话机械退化死循环", () => {
    // 正常思考（无死循环）
    const normalReasoning = "首先分析样本1，得出特征是5种形状。接着分析样本2，发现对称性守恒。最后看选项，A和B不符合，锁定C。";
    expect(detectReasoningRepetition(normalReasoning)).toBe(false);

    // 机械重复死循环（模拟 qwen3.5-0.8b 真实日志）
    const repeatedSentence = "选项 A 的方块分布与基准构型有差异，需要进一步分析相对位置和方向关系。";
    const loopReasoning = "开始分析：" + repeatedSentence.repeat(4);
    expect(detectReasoningRepetition(loopReasoning)).toBe(true);
  });
  it("rescueOptionFromReasoning 能从各种思考文本后半段准确抢救推导出的客观选项", () => {
    // 1. 中文常见句式
    expect(rescueOptionFromReasoning("经过详细分析，排除A和B，最终选择 C。")).toBe("C");
    expect(rescueOptionFromReasoning("比较各个候选选项，答案是 B，因为其变化规律吻合。")).toBe("B");
    expect(rescueOptionFromReasoning("根据第一级线索，因此选 D。")).toBe("D");
    expect(rescueOptionFromReasoning("由此可知，选项 A 正确。")).toBe("A");
    expect(rescueOptionFromReasoning("推导得出【答案】：B")).toBe("B");

    // 2. 英文常见句式
    expect(rescueOptionFromReasoning("After deductive verification, Option A is the optimal match.")).toBe("A");
    expect(rescueOptionFromReasoning("Therefore, Answer is: D")).toBe("D");

    // 3. 空或无明确选项时返回 null
    expect(rescueOptionFromReasoning("")).toBeNull();
    expect(rescueOptionFromReasoning("这个问题很复杂，还需要进一步计算。")).toBeNull();
  });

  it("flattenMessagesForSettlement 能够彻底剥离中间工具调用与多轮嵌套，完整展平保留思考推演原文", () => {
    const rawMessages = [
      { role: "system", content: "你是一个逻辑决策专家，必须按 JSON 交付。" },
      { role: "user", content: "【推演任务】找出符号演化序列中的正确答案。\n候选选项: A, B, C, D" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "call_1", type: "function", function: { name: "buy_hint", arguments: '{"tier":1}' } }],
        reasoning_content: "首先分析题目规律，排除明显错误的选项 A...",
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: "第一级线索：序列满足对称性守恒。",
      },
    ];

    const currentReasoning = "结合线索进一步验证，选项 B 完全满足对称性，因此确定答案选 B。";

    const flattened = flattenMessagesForSettlement(rawMessages, currentReasoning);

    // 1. 结构严格缩减为纯净的 2 条消息
    expect(flattened.length).toBe(2);
    expect(flattened[0].role).toBe("system");
    expect(flattened[0].content).toContain("你是一个逻辑决策专家");

    expect(flattened[1].role).toBe("user");
    // 2. 题目原文保留
    expect(flattened[1].content).toContain("【推演任务】找出符号演化序列中的正确答案。");
    // 3. 历史思考与当前思考 100% 完整保留拼接，不丢任何推演字句
    expect(flattened[1].content).toContain("首先分析题目规律，排除明显错误的选项 A...");
    expect(flattened[1].content).toContain("结合线索进一步验证，选项 B 完全满足对称性，因此确定答案选 B。");
    // 4. 彻底剔除 tool_calls、tool 回包与函数参数
    expect(flattened[1].content).not.toContain("call_1");
    expect(flattened[1].content).not.toContain("buy_hint");
    expect(flattened[1].content).not.toContain('{"tier":1}');
    // 5. 包含强约束终结指令
    expect(flattened[1].content).toContain("【终结指令】");
    expect(flattened[1].content).toContain("严禁继续思考，严禁调用任何工具");
  });

  it("LLMClient 在开启流式且未超限时，能正常通过 SSE 流拼接思考、内容与工具调用", async () => {
    let requestCount = 0;
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        requestCount++;
        const body = await req.json();
        expect(body.stream).toBe(true);

        const sseChunks = [
          'data: {"choices":[{"delta":{"role":"assistant","reasoning_content":"思考开始，推导题目中..."}}]}\n\n',
          'data: {"choices":[{"delta":{"reasoning_content":"结合已有信息，答案应为B。"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"{\\"choice\\": \\"B\\", \\"action\\": \\"HIGH_BET\\", \\"confidence\\": 0.9}"}}]}\n\n',
          'data: [DONE]\n\n',
        ];

        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of sseChunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "qwen-test",
      thinking: "medium",
      stream: true,
      contextLimit: 8192,
    });

    const res = await client.query(
      [{ role: "user", content: "请推导演算" }],
      null,
      "test stream normal",
      0.1
    );

    server.stop();

    expect(requestCount).toBe(1);
    expect(res.reasoning_content).toContain("思考开始");
    expect(res.reasoning_content).toContain("答案应为B");
    expect(res.parsed.choice).toBe("B");
    expect(res.parsed.action).toBe("HIGH_BET");
    expect(res.parsed.confidence).toBe(0.9);
  });

  it("LLMClient 在思考遭遇服务端长度截断 (finish_reason: length) 时，自动平铺推演草稿并以关闭思考模式发起 Phase 2 快速结算", async () => {
    let callHistory: Array<{ url: string; stream?: boolean; thinking?: any; messages: any[] }> = [];

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const body = await req.json();
        callHistory.push({
          url: req.url,
          stream: body.stream,
          thinking: body.reasoning_effort ?? body.chat_template_kwargs?.enable_thinking,
          messages: body.messages,
        });

        if (body.stream) {
          // 模拟服务端因长度截断返回的思考流
          const stream = new ReadableStream({
            start(controller) {
              for (let i = 0; i < 5; i++) {
                const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"' + "超长推导反复验证，".repeat(20) + '"}}]}\n\n';
                controller.enqueue(new TextEncoder().encode(chunk));
              }
              // 服务端因达上限触发 length 截断
              controller.enqueue(new TextEncoder().encode('data: {"choices":[{"finish_reason":"length","delta":{}}]}\n\n'));
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } else {
          // Phase 2 结算请求：必须是关闭思考模式 (enable_thinking: false / reasoning_effort: none)
          expect(body.reasoning_effort).toBe("none");
          expect(body.chat_template_kwargs?.enable_thinking).toBe(false);

          return new Response(JSON.stringify({
            choices: [{
              message: {
                role: "assistant",
                content: JSON.stringify({ choice: "C", action: "SAFE_BET", confidence: 0.7 }),
              },
            }],
            usage: {
              prompt_tokens: 400,
              completion_tokens: 30,
              total_tokens: 430,
            },
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "qwen-small",
      thinking: "medium",
      stream: true,
      contextLimit: 1200,
    });

    const res = await client.query(
      [{ role: "user", content: "请分析并作答" }],
      null,
      "test circuit breaker",
      0.1,
      { contextLimit: 1200, contentReserve: 400 }
    );

    server.stop();

    // 验证状态机：
    // 第 1 步发起流式请求 (stream: true)，服务端返回截断；
    // 第 2 步自动发起结算请求 (stream: false, reasoning_effort: none, enable_thinking: false)。
    expect(callHistory.length).toBe(2);
    expect(callHistory[0].stream).toBe(true);
    expect(callHistory[1].stream).toBeUndefined();
    expect(callHistory[1].thinking).toBe("none"); // reasoning_effort: "none"

    // 验证结构平铺：Phase 2 发送的消息已展平为纯净格式
    expect(callHistory[1].messages.length).toBe(1);
    expect(callHistory[1].messages[0].role).toBe("user");
    expect(callHistory[1].messages[0].content).toContain("【已完成的历史思考与推演草稿】");
    expect(callHistory[1].messages[0].content).toContain("【终结指令】");

    // 结算结果正确拿到
    expect(res.parsed.choice).toBe("C");
    expect(res.parsed.action).toBe("SAFE_BET");
    expect(res.parsed.confidence).toBe(0.7);
  });

  it("LLMClient 在 Phase 2 结算遇到服务端错误时，能无缝触发思考文本启发式兜底抢救", async () => {
    let callIndex = 0;
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        callIndex++;
        const body = await req.json();
        if (body.stream === true) {
          // 模拟流式生成结束且未给出有效决策，思考中明确包含推导结论
          const stream = new ReadableStream({
            start(controller) {
              const textChunk = "经过全面推导，排除所有其他可能，因此选 D。" + "逻辑推导验证细节。".repeat(10);
              controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"reasoning_content":"${textChunk}"}}]}\n\n`));
              controller.enqueue(new TextEncoder().encode('data: {"choices":[{"finish_reason":"length","delta":{}}]}\n\n'));
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
        } else {
          // 模拟 Phase 2 结算请求遭遇服务器 500 崩溃
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "qwen-rescue",
      thinking: "medium",
      stream: true,
      contextLimit: 800,
    });

    const res = await client.query(
      [{ role: "user", content: "推导任务" }],
      null,
      "test breaker rescue",
      0.1,
      { contextLimit: 800, contentReserve: 400 }
    );

    server.stop();

    // 两次调用：第 1 次流式返回截断，第 2 次 Phase 2 报 500 转入兜底抢救
    expect(callIndex).toBe(2);
    // 触发了思考原文兜底抢救：成功抢救出答案 "D"
    expect(res.parsed.choice).toBe("D");
    expect(res.parsed.action).toBe("SAFE_BET");
    expect(res.reasoning_content).toContain("因此选 D");
  });

  it("LLMClient 在流式请求遇到 400 失败时，能自动平滑降级为非流式重试", async () => {
    let callIndex = 0;
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        callIndex++;
        const body = await req.json();
        if (body.stream === true) {
          // 模拟端点不支持 stream 抛出 400
          return new Response("Streaming is not supported on this endpoint", { status: 400 });
        }
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: "assistant",
              content: JSON.stringify({ choice: "A", action: "HIGH_BET", confidence: 0.95 }),
            },
          }],
        }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "test-model",
      thinking: "medium",
      stream: true,
    });

    const res = await client.query(
      [{ role: "user", content: "测试降级" }],
      null,
      "test stream fallback",
      0.1
    );

    server.stop();

    expect(callIndex).toBe(2); // 第 1 次流式 400，第 2 次降级成功
    expect(res.parsed.choice).toBe("A");
    expect(res.parsed.action).toBe("HIGH_BET");
  });

  it("LLMClient 在流式思考未输出有效决策但存在草稿时，流自然接收完毕后自动发起 Phase 2 结算", async () => {
    let callHistory: Array<{ stream?: boolean; messages: any[] }> = [];

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const body = await req.json();
        callHistory.push({ stream: body.stream, messages: body.messages });

        if (body.stream) {
          // 模拟模型流式吐出草稿后自然结束，但未输出 JSON 决策
          const stream = new ReadableStream({
            start(controller) {
              const repeatedPattern = "选项 A 需要进一步分析相对位置和方向关系。选项 B 同样需要分析。";
              for (let i = 0; i < 3; i++) {
                controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"reasoning_content":"${repeatedPattern}"}}]}\n\n`));
              }
              controller.enqueue(new TextEncoder().encode('data: {"choices":[{"finish_reason":"stop","delta":{}}]}\n\n'));
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
        } else {
          // Phase 2 结算
          return new Response(JSON.stringify({
            choices: [{
              message: {
                role: "assistant",
                content: JSON.stringify({ choice: "B", action: "HIGH_BET", confidence: 0.85 }),
              },
            }],
          }), { headers: { "Content-Type": "application/json" } });
        }
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "test-loop-model",
      thinking: "medium",
      stream: true,
      contextLimit: 81920, // 设置极其宽裕的上限，确保绝对不是因为 Token 达到上限才停
    });

    const res = await client.query(
      [{ role: "user", content: "请推导题目" }],
      null,
      "test loop break",
      0.1
    );

    server.stop();

    expect(callHistory.length).toBe(2);
    expect(callHistory[0].stream).toBe(true);
    expect(callHistory[1].stream).toBeUndefined(); // Phase 2
    expect(res.parsed.choice).toBe("B");
    expect(res.parsed.action).toBe("HIGH_BET");
  });

  it("LLMClient 在非流式请求遭遇 finish_reason: length 截断时，自动平铺推演原文发起 Phase 2 终结", async () => {
    let calls: Array<{ messages: any[]; payload: any }> = [];

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const body = await req.json();
        calls.push({ messages: body.messages, payload: body });

        if (calls.length === 1) {
          // 第 1 轮非流式请求：模拟服务端因超限截断返回 length 且 content 为空，且草稿未得出定论
          return new Response(JSON.stringify({
            choices: [{
              finish_reason: "length",
              message: {
                role: "assistant",
                content: "",
                reasoning_content: "推导分析中：对各个符号进行反复排查验证，草稿尚未得出定论...",
              },
            }],
          }), { headers: { "Content-Type": "application/json" } });
        } else {
          // 第 2 轮：客户端自动发起的 Phase 2 终结请求
          expect(body.reasoning_effort).toBe("none");
          expect(body.chat_template_kwargs?.enable_thinking).toBe(false);
          expect(body.tools).toBeUndefined();
          return new Response(JSON.stringify({
            choices: [{
              message: {
                role: "assistant",
                content: JSON.stringify({ choice: "C", action: "SAFE_BET", confidence: 0.8 }),
              },
            }],
          }), { headers: { "Content-Type": "application/json" } });
        }
      },
    });

    const client = new LLMClient({
      baseUrl: `http://localhost:${server.port}/v1`,
      apiKey: "test-key",
      model: "test-nonstream-model",
      thinking: "medium",
      stream: false, // 显式非流式
    });

    const res = await client.query(
      [{ role: "user", content: "请作答" }],
      null,
      "test nonstream length breaker",
      0.1
    );

    server.stop();

    // 验证调用了 2 次：第 1 次被截断，第 2 次 Phase 2 展平快速终结成功
    expect(calls.length).toBe(2);
    expect(res.parsed.choice).toBe("C");
    expect(res.parsed.action).toBe("SAFE_BET");
    expect(res.parsed.confidence).toBe(0.8);
  });
});
