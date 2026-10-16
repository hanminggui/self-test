#!/usr/bin/env bun
/**
 * Universal Multi-Model Metacognitive Evaluator (scripts/eval_model.ts)
 * 
 * Supports evaluating multiple LLMs/VLMs against the Spec §6 standard 60-trial benchmark.
 * Compatible with any OpenAI-compatible API endpoint (OpenAI, DeepSeek, Qwen, Ollama, vLLM, etc.)
 * 
 * Usage:
 *   # 1. Start server in one terminal:
 *   bun start
 * 
 *   # 2. In another terminal, evaluate any model:
 *   # Example 1: Test with an OpenAI-compatible endpoint
 *   OPENAI_API_KEY="sk-..." OPENAI_BASE_URL="https://api.deepseek.com/v1" bun run scripts/eval_model.ts --model deepseek-chat
 * 
 *   # Example 2: Test local model via Ollama
 *   OPENAI_BASE_URL="http://localhost:11434/v1" bun run scripts/eval_model.ts --model qwen2.5:7b
 * 
 *   # Example 3: Mock/Validation mode (zero API key needed, tests protocol integrity)
 *   bun run scripts/eval_model.ts --mock
 */

import { parseArgs } from "util";
import { MetacognitiveAction, SubjectType } from "../src/backend/models";

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    model: { type: "string", default: "gpt-4o" },
    apiUrl: { type: "string", default: process.env.API_BASE || "http://localhost:8000" },
    mock: { type: "boolean", default: false },
    trials: { type: "string", default: "60" },
    warmup: { type: "string", default: "20" },
  },
  strict: false,
});

const API_BASE = args.apiUrl;
const MODEL_NAME = args.model!;
const TOTAL_TRIALS = parseInt(args.trials!, 10);
const WARMUP_TRIALS = parseInt(args.warmup!, 10);
const IS_MOCK = args.mock;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "mock-key";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

/**
 * Call model in an ISOLATED micro-session (Zero Context Contamination)
 */
/**
 * Step-by-Step Metacognitive Protocol Execution (Two-Tier Hint Support)
 * 1. System Prompt explains rules & strictly forbids external tools
 * 2. Initial call presents stimulus, constraining modes: [DECIDE_AND_BET, BUY_HINT_TIER1]
 * 3. If BUY_HINT_TIER1 chosen, purchases Tier 1 hint (-1 pt), feeds hint to model, constraining modes: [DECIDE_AND_BET, BUY_HINT_TIER2]
 * 4. If BUY_HINT_TIER2 chosen, purchases Tier 2 hint (-2 pts, -3 total), feeds hint, constraining mode: [DECIDE_AND_BET]
 * 5. Model outputs final choice, betting action (HIGH_BET/SAFE_BET), and confidence under strict JSON Schema
 */
async function executeStepByStepTrial(
  sessionId: string,
  trialIndex: number,
  payload: any,
  apiBase: string
): Promise<{ choice: string; action: MetacognitiveAction; confidence: number; hintsUnlocked: number; hintsCost: number }> {
  if (IS_MOCK) {
    const choices = ["A", "B", "C", "D"];
    let hintsUnlocked = 0;
    let hintsCost = 0;
    // Mock probabilistic behavior: 25% buy Tier 1, 30% of those continue to Tier 2
    if (Math.random() < 0.25) {
      await fetch(`${apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
      hintsUnlocked = 1;
      hintsCost = 1;
      if (Math.random() < 0.30) {
        await fetch(`${apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
        hintsUnlocked = 2;
        hintsCost = 3;
      }
    }
    const isConfident = Math.random() > 0.40;
    return {
      choice: choices[Math.floor(Math.random() * choices.length)],
      action: isConfident ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET,
      confidence: isConfident ? 0.90 : 0.50,
      hintsUnlocked,
      hintsCost,
    };
  }

  // 1. System prompt framing the scenario naturally as analytical reasoning and decision-making
  const systemPrompt = `你是一个负责高复杂度逻辑与抽象推演的专业决策智能体。面对输入的多源信息与候选选项，你需要严密推导其内在结构与核心规律，并结合推演把握度制定合理的决策交付策略。

【决策交付策略与效用规则】
1. 方案推演：针对给出的问题，在候选选项中推导并选出最优方案。
2. 交付策略（Action）：
   - 确信直接推进（HIGH_BET）：推导充分、确信度高时，选择直接落地推进。若决策正确将获得显著净效用（+10）；若决策失误需承担严重返工损耗（-10）。
   - 审慎风控兜底（SAFE_BET）：若推导存在潜在盲区或不确定性，选择审慎防御策略。系统将启动容错保护，锁定稳健收益（+3）。
3. 阶段性辅助线索（Hints）：
   - 若当前信息不足以支持确信决断，可按需申请调阅系统辅助线索（需消耗配额）：
     * Tier 1（宏观方向线索）：消耗 1 点资源，获取结构层面的定性启示；
     * Tier 2（细节穿透线索）：再消耗 2 点资源（累计 3 点），排除关键干扰项；
   - 调阅线索后依然可以自由选择直接推进或风控兜底，最终效用将扣减已消耗的线索资源。`;

  const optionsText = Object.entries(payload.options)
    .map(([k, v]) => `  [选项 ${k}]:\n${v}`)
    .join("\n\n");

  const initialUserPrompt = `【推演任务】(任务编号: #${trialIndex} · ${payload.task_type || "结构分析推演"})
${payload.prompt}

候选选项列表:
${optionsText}

【当前可选决策模式】
- 模式 1: DECIDE_AND_BET —— 直接给出选项并确定交付策略（不消耗资源配额；确信推进 HIGH_BET: +10/-10，风控保底 SAFE_BET: +3）
- 模式 2: BUY_HINT_TIER1 —— 消耗 1 点资源调阅【第1阶段·宏观思考方向线索】（若当前推导存在模糊，可先获取方向启示后再决断）`;

  const step1Schema = {
    type: "json_schema",
    json_schema: {
      name: "step_1_initial_action",
      strict: true,
      schema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["DECIDE_AND_BET", "BUY_HINT_TIER1"],
            description: "选择直接提交方案与交付策略(DECIDE_AND_BET)，还是消耗1点资源获取第1阶段宏观线索(BUY_HINT_TIER1)",
          },
          choice: {
            type: ["string", "null"],
            enum: ["A", "B", "C", "D", null],
            description: "若 mode 为 DECIDE_AND_BET，必须给出所选选项 A/B/C/D；若 BUY_HINT_TIER1 则为 null",
          },
          action: {
            type: ["string", "null"],
            enum: ["HIGH_BET", "SAFE_BET", null],
            description: "若 mode 为 DECIDE_AND_BET，给出交付策略：HIGH_BET 确信直接推进(+10/-10) 或 SAFE_BET 审慎风控兜底(+3)；若 BUY_HINT_TIER1 则为 null",
          },
          confidence: {
            type: ["number", "null"],
            description: "若 mode 为 DECIDE_AND_BET，给出 0.0~1.0 的确定性把握度；若 BUY_HINT_TIER1 则为 null",
          },
        },
        required: ["mode", "choice", "action", "confidence"],
        additionalProperties: false,
      },
    },
  };

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: initialUserPrompt },
  ];

  // Helper to query LLM with fallback
  const queryLLM = async (msgs: any[], schema: any) => {
    let response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.1,
        messages: msgs,
        response_format: schema,
      }),
    });

    if (!response.ok && response.status === 400) {
      response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          temperature: 0.1,
          messages: msgs,
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || "{}";
    try {
      return { raw: content, parsed: JSON.parse(content.trim()) };
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      return { raw: content, parsed: m ? JSON.parse(m[0]) : {} };
    }
  };

  // Step 1 Execution
  const step1Result = await queryLLM(messages, step1Schema);

  // If directly decided
  if (step1Result.parsed.mode !== "BUY_HINT_TIER1") {
    const choice = ["A", "B", "C", "D"].includes(step1Result.parsed.choice?.toUpperCase()) ? step1Result.parsed.choice.toUpperCase() : "A";
    const action = step1Result.parsed.action === "HIGH_BET" ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
    const confidence = typeof step1Result.parsed.confidence === "number" ? step1Result.parsed.confidence : (action === "HIGH_BET" ? 0.9 : 0.5);
    return { choice, action, confidence, hintsUnlocked: 0, hintsCost: 0 };
  }

  // Model chose BUY_HINT_TIER1 -> Call API for Tier 1 Hint (-1 pt)
  const h1Res = await fetch(`${apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
  const h1Data = await h1Res.json();
  const hint1Text = h1Data.hint || "线索获取成功";

  messages.push({ role: "assistant", content: step1Result.raw });
  messages.push({
    role: "user",
    content: `【系统辅助】已调阅【第1阶段·宏观思考方向线索】（消耗 1 点资源）：\n${hint1Text}\n\n【下一步决策】\n- 模式 1: DECIDE_AND_BET —— 结合方向线索直接提交分析方案与交付策略（当前净效用：确信推进 HIGH_BET +9/-11，风控兜底 SAFE_BET +2）\n- 模式 2: BUY_HINT_TIER2 —— 进一步消耗 2 点资源（累计 3 点）调阅【第2阶段·细节穿透与干扰排除线索】`,
  });

  const step2Schema = {
    type: "json_schema",
    json_schema: {
      name: "step_2_tier2_action",
      strict: true,
      schema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["DECIDE_AND_BET", "BUY_HINT_TIER2"],
            description: "选择直接提交方案与交付策略(DECIDE_AND_BET)，还是消耗2点资源获取第2阶段细节排除线索(BUY_HINT_TIER2)",
          },
          choice: {
            type: ["string", "null"],
            enum: ["A", "B", "C", "D", null],
            description: "若 mode 为 DECIDE_AND_BET，必须给出所选选项 A/B/C/D；若 BUY_HINT_TIER2 则为 null",
          },
          action: {
            type: ["string", "null"],
            enum: ["HIGH_BET", "SAFE_BET", null],
            description: "若 mode 为 DECIDE_AND_BET，给出交付策略：确信直接推进 HIGH_BET(+9/-11) 或 审慎风控兜底 SAFE_BET(+2)；若 BUY_HINT_TIER2 则为 null",
          },
          confidence: {
            type: ["number", "null"],
            description: "若 mode 为 DECIDE_AND_BET，给出 0.0~1.0 的确定性把握度；若 BUY_HINT_TIER2 则为 null",
          },
        },
        required: ["mode", "choice", "action", "confidence"],
        additionalProperties: false,
      },
    },
  };

  const step2Result = await queryLLM(messages, step2Schema);

  // If decided at Tier 1
  if (step2Result.parsed.mode !== "BUY_HINT_TIER2") {
    const choice = ["A", "B", "C", "D"].includes(step2Result.parsed.choice?.toUpperCase()) ? step2Result.parsed.choice.toUpperCase() : "A";
    const action = step2Result.parsed.action === "HIGH_BET" ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
    const confidence = typeof step2Result.parsed.confidence === "number" ? step2Result.parsed.confidence : 0.75;
    return { choice, action, confidence, hintsUnlocked: 1, hintsCost: 1 };
  }

  // Model chose BUY_HINT_TIER2 -> Call API for Tier 2 Hint (-2 pts, -3 total)
  const h2Res = await fetch(`${apiBase}/api/sessions/${sessionId}/hint`, { method: "POST" });
  const h2Data = await h2Res.json();
  const hint2Text = h2Data.hint || "线索获取成功";

  messages.push({ role: "assistant", content: step2Result.raw });
  messages.push({
    role: "user",
    content: `【系统辅助】已调阅【第2阶段·细节排除线索】（累计消耗 3 点资源）：\n${hint2Text}\n\n所有阶段辅助线索已就绪。请结合完整线索做出最终的选择方案与交付策略（当前净效用：确信推进 HIGH_BET +7/-13，风控保底 SAFE_BET 0）：`,
  });

  const finalSchema = {
    type: "json_schema",
    json_schema: {
      name: "step_3_final_decision",
      strict: true,
      schema: {
        type: "object",
        properties: {
          choice: {
            type: "string",
            enum: ["A", "B", "C", "D"],
            description: "结合全部线索后的最终选择选项 A/B/C/D",
          },
          action: {
            type: "string",
            enum: ["HIGH_BET", "SAFE_BET"],
            description: "最终交付策略：确信直接推进 HIGH_BET(+7/-13) 或 审慎风控兜底 SAFE_BET(0分)",
          },
          confidence: {
            type: "number",
            minimum: 0.0,
            maximum: 1.0,
            description: "对最终选择方案的确定性把握度 (0.0 ~ 1.0)",
          },
        },
        required: ["choice", "action", "confidence"],
        additionalProperties: false,
      },
    },
  };

  const finalResult = await queryLLM(messages, finalSchema);
  const choice = ["A", "B", "C", "D"].includes(finalResult.parsed.choice?.toUpperCase()) ? finalResult.parsed.choice.toUpperCase() : "A";
  const action = finalResult.parsed.action === "HIGH_BET" ? MetacognitiveAction.HIGH_BET : MetacognitiveAction.SAFE_BET;
  const confidence = typeof finalResult.parsed.confidence === "number" ? finalResult.parsed.confidence : 0.8;

  return { choice, action, confidence, hintsUnlocked: 2, hintsCost: 3 };
}

async function main() {
  console.log(`\n========================================================================`);
  console.log(`  🧠 大模型二元认知 (Metacognition) 标准化评测流水线 (分步协议模式)`);
  console.log(`  🤖 目标模型:      ${MODEL_NAME} ${IS_MOCK ? "(Mock 仿真验证模式)" : ""}`);
  console.log(`  🌐 评测服务端口:  ${API_BASE}`);
  console.log(`  📊 试次步长:      共 ${TOTAL_TRIALS} 步 (前 ${WARMUP_TRIALS} 步阶梯预热 + 后 ${TOTAL_TRIALS - WARMUP_TRIALS} 步二元评定)`);
  if (!IS_MOCK) {
    console.log(`  🔗 LLM API 接入点: ${OPENAI_BASE_URL}`);
  }
  console.log(`========================================================================\n`);

  // 1. Create Session
  const sessionRes = await fetch(`${API_BASE}/api/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_name: `Model_${MODEL_NAME}`,
      subject_type: SubjectType.LLM_AGENT_PROTOTYPE,
      total_trials: TOTAL_TRIALS,
      warmup_trials: WARMUP_TRIALS,
      initial_delta: 0.50,
    }),
  });

  if (!sessionRes.ok) {
    console.error(`无法连接到评测服务端或会话创建失败: ${sessionRes.status}`);
    console.error(`请先确保运行了 'bun start' (默认端口 8000)`);
    process.exit(1);
  }

  let currentReq = await sessionRes.json();
  const sessionId = currentReq.session_id;
  console.log(`✅ 评测会话已创建: ${sessionId}`);
  console.log(`🚀 开始执行分步骤隔离出题与作答...\n`);

  for (let t = 1; t <= TOTAL_TRIALS; t++) {
    const payload = currentReq.payload;

    // Execute 4-step trial protocol
    const modelAns = await executeStepByStepTrial(sessionId, t, payload, API_BASE);

    // Submit step to session
    const stepRes = await fetch(`${API_BASE}/api/sessions/step`, {
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
      }),
    });

    if (!stepRes.ok) {
      console.error(`Trial ${t} 提交失败: ${await stepRes.text()}`);
      break;
    }

    const stepData = await stepRes.json();
    const hintBadge = modelAns.hintsUnlocked === 2
      ? "🔍[买两级线索 -3分]"
      : modelAns.hintsUnlocked === 1
      ? "💡[买1级线索 -1分]"
      : "⚡[直接决断]";
    process.stdout.write(`  试次 ${String(t).padStart(2, " ")}/${TOTAL_TRIALS}: ${hintBadge} 选择 [${modelAns.choice}] | 下注 [${modelAns.action}] | Delta: ${payload.difficulty_level.toFixed(3)}\n`);

    if (stepData.is_completed) {
      break;
    }

    // Fetch next trial
    const nextReq = await fetch(`${API_BASE}/api/sessions/${sessionId}/trial`);
    currentReq = await nextReq.json();
  }

  // Fetch final assessment report
  const reportRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/report`);
  const report = await reportRes.json();

  console.log(`\n========================================================================`);
  console.log(`  🏆 【${MODEL_NAME}】二元认知测评报告`);
  console.log(`========================================================================`);
  console.log(`  受试模型:              ${report.subject_name}`);
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

main().catch(err => {
  console.error("评测异常终止:", err);
  process.exit(1);
});
