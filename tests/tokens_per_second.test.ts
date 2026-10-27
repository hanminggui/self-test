import { describe, expect, it } from "bun:test";
import { LLMClient } from "../src/cli/lib/llm_client";
import { executeStepByStepTrial } from "../src/cli/eval";

describe("LLM Output Speed (token/s) Tracking", () => {
  it("LLMClient.recordUsage 能够正确统计生成耗时、平均速率与峰值速率", () => {
    const client = new LLMClient({
      baseUrl: "http://localhost:11434/v1",
      apiKey: "test",
      model: "test-model",
    });

    // 初始状态
    expect(client.getSpeedStats()).toEqual({
      avgTps: 0,
      peakTps: 0,
      totalCompletionTokens: 0,
      totalGenerationMs: 0,
    });

    // 第 1 笔：50 tokens, 1000ms -> 50 tok/s
    client.recordUsage({ completionTokens: 50, promptTokens: 100, totalTokens: 150 }, 1000);
    let stats = client.getSpeedStats();
    expect(stats.avgTps).toBe(50);
    expect(stats.peakTps).toBe(50);
    expect(stats.totalCompletionTokens).toBe(50);
    expect(stats.totalGenerationMs).toBe(1000);

    // 第 2 笔：100 tokens, 1000ms -> 100 tok/s (新峰值)
    client.recordUsage({ completionTokens: 100, promptTokens: 100, totalTokens: 200 }, 1000);
    stats = client.getSpeedStats();
    expect(stats.avgTps).toBe(75); // (150 / 2.0s) = 75
    expect(stats.peakTps).toBe(100);
    expect(stats.totalCompletionTokens).toBe(150);
    expect(stats.totalGenerationMs).toBe(2000);

    // 重置
    client.resetSessionTokenUsage();
    expect(client.getSpeedStats()).toEqual({
      avgTps: 0,
      peakTps: 0,
      totalCompletionTokens: 0,
      totalGenerationMs: 0,
    });
  });

  it("LLMClient.query 能够自动测量 durationMs 并计算返回 tokensPerSecond", async () => {
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        // 模拟 50ms 网络延迟
        await new Promise((r) => setTimeout(r, 50));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"choice": "B"}' } }],
            usage: {
              prompt_tokens: 120,
              completion_tokens: 25,
              total_tokens: 145,
            },
          }),
          { status: 200 }
        );
      }) as any;

      const client = new LLMClient({
        baseUrl: "http://localhost:11434/v1",
        apiKey: "none",
        model: "qwen",
      });

      const res = await client.query([], null, "test-query");
      expect(res.durationMs).toBeGreaterThanOrEqual(40);
      expect(res.tokensPerSecond).toBeGreaterThan(0);
      expect(res.usage?.completionTokens).toBe(25);

      const stats = client.getSpeedStats();
      expect(stats.totalCompletionTokens).toBe(25);
      expect(stats.avgTps).toBeGreaterThan(0);
      expect(stats.peakTps).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("executeStepByStepTrial 在仿真及执行时产出合法的 trialTps", async () => {
    const client = new LLMClient({
      baseUrl: "http://localhost:8000/v1",
      apiKey: "none",
      model: "mock-model",
    });

    const mockConfig: any = {
      isMock: true,
      locale: "zh-CN",
      apiBase: "http://localhost:8000",
      totalTrials: 10,
    };

    const payload: any = {
      prompt: "测试问题",
      options: { A: "1", B: "2", C: "3", D: "4" },
    };

    const result = await executeStepByStepTrial("test-session", 1, payload, mockConfig, client);
    expect(result.trialTps).toBeDefined();
    expect(result.trialTps).toBeGreaterThan(0);
    expect(result.trialDurationMs).toBeGreaterThan(0);
    expect(result.trialTokenUsage.completion_tokens).toBeGreaterThan(0);

    const stats = client.getSpeedStats();
    expect(stats.totalCompletionTokens).toBeGreaterThan(0);
    expect(stats.avgTps).toBeGreaterThan(0);
  });
});
