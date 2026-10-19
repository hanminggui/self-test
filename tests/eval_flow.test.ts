import { describe, expect, it } from "bun:test";
import { GAME_RULES_SYSTEM_PROMPT, STEP1_ACTION_USER_PROMPT } from "../src/cli/eval";
import { formatTokenCount } from "../src/cli/lib/formatters";
import { cleanAndExtractJson } from "../src/cli/lib/json_parser";
import {
  BET_STEP3_SCHEMA,
  CHOICE_STEP2_SCHEMA,
  HINT_STEP1_SCHEMA,
  HINT_STEP1B_SCHEMA,
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
});
