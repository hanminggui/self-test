import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { getBuyHintTool, getSchemas } from "../src/cli/lib/schema_builder";
import { getPrompts } from "../src/cli/eval";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { sessionManager } from "../src/backend/server";

describe("Seam 5: CLI Evaluator & Bilingual Schemas/Prompts", () => {
  let serverProcess: ChildProcess | undefined;
  const TEST_PORT = 8899;
  const TEST_API_URL = `http://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    serverProcess = spawn("bun", ["run", "src/backend/server.ts"], {
      cwd: process.cwd(),
      stdio: "ignore",
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        NODE_ENV: "test",
      },
    });

    // Wait for server to become responsive
    for (let i = 0; i < 40; i++) {
      try {
        const ping = await fetch(`${TEST_API_URL}/api/health`, { signal: AbortSignal.timeout(300) });
        if (ping.ok) break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
  it("getSchemas 与 getBuyHintTool 正确提供英文字段描述与说明", () => {
    // 1. 中文 Schema 检查
    const schemasZH = getSchemas("zh-CN");
    expect(schemasZH.HINT_STEP1_SCHEMA.json_schema.schema.properties.strategy.description).toContain("决策策略二选一");
    expect(schemasZH.BET_STEP3_SCHEMA.json_schema.schema.properties.action.description).toContain("HIGH_BET (确信直接推进)");

    const toolZH = getBuyHintTool("zh-CN");
    expect(toolZH.function.description).toContain("购买辅助线索");

    // 2. 英文 Schema 检查
    const schemasEN = getSchemas("en-US");
    const descEN = schemasEN.HINT_STEP1_SCHEMA.json_schema.schema.properties.strategy.description;
    expect(descEN).toContain("Choose strategy");
    expect(descEN).not.toMatch(/[\u4e00-\u9fa5]/);

    const betDescEN = schemasEN.BET_STEP3_SCHEMA.json_schema.schema.properties.action.description;
    expect(betDescEN).toContain("HIGH_BET");
    expect(betDescEN).not.toMatch(/[\u4e00-\u9fa5]/);

    const toolEN = getBuyHintTool("en-US");
    expect(toolEN.function.description).toContain("Call this tool to buy diagnostic clues");
    expect(toolEN.function.description).not.toMatch(/[\u4e00-\u9fa5]/);
  });

  it("getPrompts 输出严密中立的英文与中文 Prompt 模板", () => {
    const promptsZH = getPrompts("zh-CN");
    expect(promptsZH.gameRulesSystemPrompt).toContain("决策博弈效用规则");
    expect(promptsZH.step1ActionUserPrompt).toContain("本轮行动选择");

    const promptsEN = getPrompts("en-US");
    expect(promptsEN.gameRulesSystemPrompt).toContain("Decision Game Utility Rules");
    expect(promptsEN.gameRulesSystemPrompt).not.toMatch(/[\u4e00-\u9fa5]/);
    expect(promptsEN.step1ActionUserPrompt).toContain("Current Action Choice");
    expect(promptsEN.step1ActionUserPrompt).not.toMatch(/[\u4e00-\u9fa5]/);
  });

  it("Spec §5.4: bun run src/cli/eval.ts --mock --trials 3 --warmup 1 --lang en -y 无人值守评测全流程跑通并记录 locale", () => {
    const res = spawnSync("bun", [
      "run",
      "src/cli/eval.ts",
      "--apiUrl", TEST_API_URL,
      "--mock",
      "--trials", "3",
      "--warmup", "1",
      "--lang", "en",
      "--no-log",
      "-y"
    ], {
      cwd: process.cwd(),
      encoding: "utf-8",
      env: { ...process.env, NODE_ENV: "test", NON_INTERACTIVE: "1" },
    });

    if (res.status !== 0) {
      console.error(res.stderr || res.stdout);
    }
    expect(res.status).toBe(0);
    // 验证终端输出全为英文
    expect(res.stdout).toContain("LLM Metacognitive Evaluation Pipeline");
    expect(res.stdout).toContain("Metacognitive Evaluation Report");
    expect(res.stdout).toContain("Target Model:");
    expect(res.stdout).toContain("Type-1 Objective Acc:");
    expect(res.stdout).not.toContain("大模型二元认知");
    expect(res.stdout).not.toContain("二元认知测评报告");

    // 验证散点列表中存在刚刚生成的 session，且其 metadata.locale 为 en-US
    const data = sessionManager.getCohortScatterData(undefined, "en-US");
    const mockSession = data.subjects.find((s) => s.metadata?.locale === "en-US");
    expect(mockSession).toBeDefined();
    expect(mockSession?.role_title).toMatch(/The /);

    // 验证 --lang zh 输出全为中文
    const resZh = spawnSync("bun", [
      "run",
      "src/cli/eval.ts",
      "--apiUrl", TEST_API_URL,
      "--mock",
      "--trials", "3",
      "--warmup", "1",
      "--lang", "zh",
      "--no-log",
      "-y"
    ], {
      cwd: process.cwd(),
      encoding: "utf-8",
      env: { ...process.env, NODE_ENV: "test", NON_INTERACTIVE: "1" },
    });
    expect(resZh.status).toBe(0);
    expect(resZh.stdout).toContain("大模型二元认知");
    expect(resZh.stdout).toContain("二元认知测评报告");
    expect(resZh.stdout).toContain("一元客观准确率");
  }, 30000);
});
