/**
 * OpenAI Strict JSON Schema Factory & Pre-configured Schemas (src/cli/lib/schema_builder.ts)
 */

import type { SupportedLocale } from "../../i18n";

export interface StrictJsonSchemaWrapper {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
      additionalProperties: false;
    };
  };
}

/**
 * 极简 Strict JSON Schema 封装工厂
 */
export function createStrictSchema(
  name: string,
  properties: Record<string, any>,
  required: string[]
): StrictJsonSchemaWrapper {
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      },
    },
  };
}

/**
 * 步骤 1: 宏观线索调阅决策 Schema (zh-CN)
 */
export const HINT_STEP1_SCHEMA = createStrictSchema(
  "hint_strategy",
  {
    strategy: {
      type: "string",
      enum: ["DECIDE", "BUY_HINT"],
      description: "决策策略二选一：\n- DECIDE: 当前信息已充分，直接开始推导并选择最优选项；\n- BUY_HINT: 消耗 1 点资源调阅当前任务的宏观思考方向线索。",
    },
  },
  ["strategy"]
);

export const HINT_STEP1_SCHEMA_EN = createStrictSchema(
  "hint_strategy",
  {
    strategy: {
      type: "string",
      enum: ["DECIDE", "BUY_HINT"],
      description: "Choose strategy:\n- DECIDE: Current information is sufficient; proceed directly to solve the puzzle and select the best option;\n- BUY_HINT: Consume 1 point of resources to inspect the macro directional clue for the current task.",
    },
  },
  ["strategy"]
);

/**
 * 步骤 1b: 二级细节线索调阅决策 Schema (zh-CN)
 */
export const HINT_STEP1B_SCHEMA = createStrictSchema(
  "tier2_hint_strategy",
  {
    strategy: {
      type: "string",
      enum: ["DECIDE", "BUY_HINT_TIER2"],
      description: "决策策略二选一：\n- DECIDE: 结合已获取的第 1 阶段线索，信息已足够推进，直接开始推导选项；\n- BUY_HINT_TIER2: 依然存在模糊死角，再消耗 2 点资源调阅第 2 阶段细节排除线索。",
    },
  },
  ["strategy"]
);

export const HINT_STEP1B_SCHEMA_EN = createStrictSchema(
  "tier2_hint_strategy",
  {
    strategy: {
      type: "string",
      enum: ["DECIDE", "BUY_HINT_TIER2"],
      description: "Choose strategy:\n- DECIDE: With the Tier 1 clue, information is sufficient; proceed directly to deduce options;\n- BUY_HINT_TIER2: Ambiguity remains; consume 2 additional points to inspect Tier 2 micro distractor elimination clue.",
    },
  },
  ["strategy"]
);

/**
 * 步骤 2: 一元客观选项推导 Schema (zh-CN)
 */
export const CHOICE_STEP2_SCHEMA = createStrictSchema(
  "first_order_choice",
  {
    choice: {
      type: "string",
      enum: ["A", "B", "C", "D"],
      description: "通过严密逻辑推演认定的唯一正确选项字母 (A / B / C / D)",
    },
  },
  ["choice"]
);

export const CHOICE_STEP2_SCHEMA_EN = createStrictSchema(
  "first_order_choice",
  {
    choice: {
      type: "string",
      enum: ["A", "B", "C", "D"],
      description: "The single correct option letter (A / B / C / D) determined through rigorous logical deduction.",
    },
  },
  ["choice"]
);

/**
 * 步骤 3: 二元置信下注 Schema (zh-CN)
 */
export const BET_STEP3_SCHEMA = createStrictSchema(
  "metacognitive_betting",
  {
    action: {
      type: "string",
      enum: ["HIGH_BET", "SAFE_BET"],
      description: "交付博弈策略二选一：\n- HIGH_BET (确信直接推进): 当推导逻辑严密、确信度高时选择。正确获得显著正向收益 (+10)，但若失误需承担严重返工损耗 (-10)；\n- SAFE_BET (审慎风控兜底): 当推导存在潜在盲区、模糊或把握度低时选择。启动安全防线，锁定稳健保底收益 (+3)。",
    },
    confidence: {
      type: "number",
      minimum: 0.0,
      maximum: 1.0,
      description: "对刚才所选选项正确性的主观确定性把握度 (0.0 为毫无把握纯属盲猜，1.0 为绝对确信)",
    },
  },
  ["action", "confidence"]
);

export const BET_STEP3_SCHEMA_EN = createStrictSchema(
  "metacognitive_betting",
  {
    action: {
      type: "string",
      enum: ["HIGH_BET", "SAFE_BET"],
      description: "Delivery wagering action:\n- HIGH_BET: High conviction with rigorous deduction. Correct answer yields significant gain (+10), but mistake incurs severe penalty (-10);\n- SAFE_BET: Risk control buffer when uncertainty exists. Locks in steady safe payoff (+3).",
    },
    confidence: {
      type: "number",
      minimum: 0.0,
      maximum: 1.0,
      description: "Subjective confidence in the correctness of the chosen option (0.0 = pure random guess, 1.0 = absolute conviction).",
    },
  },
  ["action", "confidence"]
);

/**
 * 思考模式专用：购买第 1 级线索工具 (无需参数，消耗 1 积分)
 */
export const BUY_HINT_TIER1_TOOL = {
  type: "function" as const,
  function: {
    name: "buy_hint_tier1",
    description:
      "购买辅助线索（调阅第 1 级宏观线索，消耗 1 积分）。无须参数。当前推演无法唯一锁定答案时使用。",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

export const BUY_HINT_TIER1_TOOL_EN = {
  type: "function" as const,
  function: {
    name: "buy_hint_tier1",
    description:
      "Call this tool to buy diagnostic clues (inspect Tier 1 macro clue, cost: 1 pt). Takes no parameters. Use when current deduction cannot uniquely determine the answer.",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

/**
 * 思考模式专用：购买第 2 级线索工具 (无需参数，再消耗 2 积分，累计消耗 3 积分)
 */
export const BUY_HINT_TIER2_TOOL = {
  type: "function" as const,
  function: {
    name: "buy_hint_tier2",
    description:
      "调阅第 2 级细节辅助线索（再消耗 2 积分）。无须参数。第 1 级线索不足以锁定答案时使用。",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

export const BUY_HINT_TIER2_TOOL_EN = {
  type: "function" as const,
  function: {
    name: "buy_hint_tier2",
    description:
      "Inspect Tier 2 detail diagnostic clue (cost: 2 additional pts). Takes no parameters. Use when Tier 1 clue is insufficient to determine the answer.",
    parameters: {
      type: "object" as const,
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
};

// 保持历史兼容别名
export const BUY_HINT_TOOL = BUY_HINT_TIER1_TOOL;
export const BUY_HINT_TOOL_EN = BUY_HINT_TIER1_TOOL_EN;

export function getTier1HintTool(locale: SupportedLocale = "zh-CN") {
  return locale === "en-US" ? BUY_HINT_TIER1_TOOL_EN : BUY_HINT_TIER1_TOOL;
}

export function getTier2HintTool(locale: SupportedLocale = "zh-CN") {
  return locale === "en-US" ? BUY_HINT_TIER2_TOOL_EN : BUY_HINT_TIER2_TOOL;
}

export function getBuyHintTool(locale: SupportedLocale = "zh-CN") {
  return getTier1HintTool(locale);
}

/**
 * 思考模式专用：单通最终复合决策 Schema (同时输出 choice, action, confidence)
 */
export const SINGLE_PASS_DECISION_SCHEMA = createStrictSchema(
  "single_pass_metacognitive_decision",
  {
    ...CHOICE_STEP2_SCHEMA.json_schema.schema.properties,
    ...BET_STEP3_SCHEMA.json_schema.schema.properties,
  },
  ["choice", "action", "confidence"]
);

export const SINGLE_PASS_DECISION_SCHEMA_EN = createStrictSchema(
  "single_pass_metacognitive_decision",
  {
    ...CHOICE_STEP2_SCHEMA_EN.json_schema.schema.properties,
    ...BET_STEP3_SCHEMA_EN.json_schema.schema.properties,
  },
  ["choice", "action", "confidence"]
);

export function getSchemas(locale: SupportedLocale = "zh-CN") {
  if (locale === "en-US") {
    return {
      HINT_STEP1_SCHEMA: HINT_STEP1_SCHEMA_EN,
      HINT_STEP1B_SCHEMA: HINT_STEP1B_SCHEMA_EN,
      CHOICE_STEP2_SCHEMA: CHOICE_STEP2_SCHEMA_EN,
      BET_STEP3_SCHEMA: BET_STEP3_SCHEMA_EN,
      SINGLE_PASS_DECISION_SCHEMA: SINGLE_PASS_DECISION_SCHEMA_EN,
    };
  }
  return {
    HINT_STEP1_SCHEMA,
    HINT_STEP1B_SCHEMA,
    CHOICE_STEP2_SCHEMA,
    BET_STEP3_SCHEMA,
    SINGLE_PASS_DECISION_SCHEMA,
  };
}
