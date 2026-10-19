/**
 * OpenAI Strict JSON Schema Factory & Pre-configured Schemas (src/cli/lib/schema_builder.ts)
 */

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
 * 步骤 1: 宏观线索调阅决策 Schema
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

/**
 * 步骤 1b: 二级细节线索调阅决策 Schema
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

/**
 * 步骤 2: 一元客观选项推导 Schema
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

/**
 * 步骤 3: 二元置信下注 Schema
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

/**
 * 思考模式专用：购买线索工具定义 (BUY_HINT_TOOL)
 */
export const BUY_HINT_TOOL = {
  type: "function" as const,
  function: {
    name: "buy_hint",
    description:
      "当推演遇到瓶颈、条件存在歧义或无法唯一锁定正确选项时，调用此工具消耗分数购买辅助线索。若当前已能推导出答案，请勿调用此工具，直接输出最终 JSON 决策。",
    parameters: {
      type: "object" as const,
      properties: {
        tier: {
          type: "integer" as const,
          enum: [1, 2],
          description:
            "购买线索级别：1 表示调阅第 1 级宏观线索（消耗 1 分）；2 表示直接调阅完整两级线索（累计消耗 3 分）。",
        },
        analysis_so_far: {
          type: "string" as const,
          description:
            "简要记录目前已排除的选项、已完成的推导结论及需要线索解决的具体卡点，以便获取线索后直接作答而不必重新推演。",
        },
      },
      required: ["tier", "analysis_so_far"],
      additionalProperties: false,
    },
  },
};

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


