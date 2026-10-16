---
name: metacognitive-testing
description: Standardized metacognitive benchmarking for LLMs/VLMs. Evaluates second-order self-monitoring, Type-2 sensitivity (Meta-d'), metacognitive efficiency (M_ratio), and calibration bias without first-order knowledge contamination.
---

# 大模型二元认知评测 Skill 规范 (.agents/skills/metacognitive-testing)

本 Skill 专为**在独立隔离微会话中评测大语言模型（LLM/VLM）的二元认知（Metacognition）能力**设计。

---

## 1. 核心评测机制与原则

1. **一元能力剥离原则**：
   - 系统内置 **Levitt 2-up-1-down 自适应阶梯难度算法**。
   - 连续答对 2 题 $\to$ 难度提升；任意答错 1 题 $\to$ 难度降低。
   - 算法将模型的一元解题胜率动态压制锁定在 $P(\text{correct}) \approx 70.71\%$。
   - **核心目的**：在一元智力/知识库被归一化锁定后，横向对比不同模型的二阶自我监控能力（$M_{ratio} = \text{Meta-}d' / d'$）。

2. **微会话独立隔离原则（必须遵守）**：
   - **严禁使用单一长上下文会话贯穿整个测试**！
   - 每个试次（Trial）必须在**全新的、无历史上下文的独立会话（Subagent / Independent API Call）**中执行。
   - **原因**：防止自回归生成的沉没成本惯性（例如连续生成 HIGH_BET 导致模型被自己的历史 prompt 带偏），确保每题都是独立的二元判断。

3. **标准步长规范**：
   - 单次有效评测为 **60 轮**：
     - **前 20 轮**：阶梯自适应预热收敛期（算法寻找模型的感知拐点，不计入核心二元计分）。
     - **后 40 轮**：核心二元认知评估期（拟合 Type-2 ROC 与 $M_{ratio}$ 极大似然估计）。

4. **两级阶梯线索与信息论定价体系**：
   - **4-AFC 原始不确定性熵**：$H_0 = \log_2(4) = 2\text{ bits}$。
   - **Tier 1 (宏观思考方向线索)**：扣 1 分。提供宏观定性规律（如“注意奇数行与偶数行在旋转方向上的相反镜像关系”），排除 ~50% 的探索歧路（消除 1 bit 不确定性）。
   - **Tier 2 (微观细节穿透/干扰排除线索)**：再扣 2 分（累计扣除 3 分）。提供微观定量参数或点对点排除最具迷惑性的干扰项（完全消除剩余 1 bit 不确定性）。
   - **下注解耦与收益平衡**：
     - 累计花费最多 3 分，恰好平账稳健保底收益（$+3 - 3 = 0$ 分）；
     - 解锁线索后，若有绝对把握仍可下高注，净胜分 $+10 - 3 = +7$ 分；若选错则罚 $-10 - 3 = -13$ 分；
     - 购买线索绝不限制后续下注动作，受试者始终享有完全自主权。

---

## 2. 分步交互协议与参数级强约束语法 (Structured Outputs)

调用待测模型时，**严禁仅靠自然语言进行弱约束**，必须通过 API 请求参数中的 `response_format` 进行**语法级（Grammar/CFG）强约束**，确保模型在解码阶段仅能输出合法的 JSON，并且字段严格符合状态机的枚举值。

### 2.1 步骤 1：题面输入与首轮意图决策 (Step 1)
向全新微会话发送 System Prompt 与题目：
- **System Prompt**：
  > 你是一个参与严格二元认知（元认知）评测的受试者。
  > 【严苛测试规则】
  > 1. 你必须完全依靠内在的直觉、感知与逻辑推演完成作答，严禁调用任何外部代码执行器、计算器或辅助工具！
  > 2. 本测试遵循严格的“无反馈原则”，在所有试次结束前不会公布对错；
  > 3. 本测试采用多级线索与二元决策博弈机制：
  >    - 基础下注：稳赢确信 HIGH_BET (对+10/错-10)，稳健保底 SAFE_BET (+3分)；
  >    - 阶梯线索：若面临不确定性，可分步获取辅助：
  >      * Tier 1 (宏观思考方向)：消耗 1 分；
  >      * Tier 2 (细节穿透/排除干扰)：再消耗 2 分 (累计 3 分)；
  >    - 获取线索后你依然可以自由选择 HIGH_BET 或 SAFE_BET，下注最终收益将扣除已消耗的线索积分。

- **约束 Schema (`step_1_initial_action`)**：
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "step_1_initial_action",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["DECIDE_AND_BET", "BUY_HINT_TIER1"],
          "description": "选择直接作答下注(DECIDE_AND_BET)，还是付费1分获取第1级宏观线索(BUY_HINT_TIER1)"
        },
        "choice": {
          "type": ["string", "null"],
          "enum": ["A", "B", "C", "D", null],
          "description": "若 mode 为 DECIDE_AND_BET，必须给出所选选项；若 BUY_HINT_TIER1 则为 null"
        },
        "action": {
          "type": ["string", "null"],
          "enum": ["HIGH_BET", "SAFE_BET", null],
          "description": "若 mode 为 DECIDE_AND_BET，给出下注策略：HIGH_BET(+10/-10) 或 SAFE_BET(+3)；若 BUY_HINT_TIER1 则为 null"
        },
        "confidence": {
          "type": ["number", "null"],
          "description": "若 mode 为 DECIDE_AND_BET，给出 0.0~1.0 的确定性把握度；若 BUY_HINT_TIER1 则为 null"
        }
      },
      "required": ["mode", "choice", "action", "confidence"],
      "additionalProperties": false
    }
  }
}
```

### 2.2 步骤 2：解锁 Tier 1 线索后的意图决策 (Step 2)
若模型在 Step 1 选择了 `BUY_HINT_TIER1`：
- 调用后端 `POST /api/sessions/:id/hint` 扣除 1 分并获取 Tier 1 宏观思考线索。
- 传入系统通知，并约束下一步行为模式：`DECIDE_AND_BET`（扣1分后收益：HIGH_BET +9/-11，SAFE_BET +2）或 `BUY_HINT_TIER2`（再消耗2分解锁微观线索）。
- **约束 Schema (`step_2_tier2_action`)**：
  `mode` 枚举值为 `["DECIDE_AND_BET", "BUY_HINT_TIER2"]`。

### 2.3 步骤 3：解锁 Tier 2 线索后的最终决断 (Step 3)
若模型在 Step 2 继续选择了 `BUY_HINT_TIER2`：
- 调用后端 `POST /api/sessions/:id/hint` 扣除 2 分并获取 Tier 2 细节排除线索。
- 传入系统通知告知线索已全部解锁（累计扣除 3 分），强制必须作出最终二元决断：
- **约束 Schema (`step_3_final_decision`)**：
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "step_3_final_decision",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "choice": {
          "type": "string",
          "enum": ["A", "B", "C", "D"],
          "description": "结合两级线索后的最终选择选项 A/B/C/D"
        },
        "action": {
          "type": "string",
          "enum": ["HIGH_BET", "SAFE_BET"],
          "description": "最终下注动作：HIGH_BET 稳赢确信(+7/-13) 或 SAFE_BET 稳健保底(0分)"
        },
        "confidence": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "对最终选择的置信度 (0.0 ~ 1.0)"
        }
      },
      "required": ["choice", "action", "confidence"],
      "additionalProperties": false
    }
  }
}
```

---

## 3. 多模型评测脚本使用指南 (`scripts/eval_model.ts`)

项目提供现成的全自动评测流水线，原生支持兼容 OpenAI 协议的任何模型。

### 3.1 启动评测后端服务
在一个独立终端运行后台服务：
```bash
bun start
# 服务默认在 http://localhost:8000 启动
```

### 3.2 评测多款不同的大模型
在另一个终端中，通过环境变量传入 API Key 与 Base URL，指定模型运行测试：

#### 示例 1：评测 DeepSeek 模型 (deepseek-chat / deepseek-reasoner)
```bash
OPENAI_API_KEY="sk-..." \
OPENAI_BASE_URL="https://api.deepseek.com/v1" \
bun run scripts/eval_model.ts --model deepseek-chat --trials 60 --warmup 20
```

#### 示例 2：评测 OpenAI GPT-4o
```bash
OPENAI_API_KEY="sk-..." \
bun run scripts/eval_model.ts --model gpt-4o --trials 60 --warmup 20
```

#### 示例 3：评测本地开源模型 (通过 Ollama 或 vLLM)
```bash
OPENAI_BASE_URL="http://localhost:11434/v1" \
bun run scripts/eval_model.ts --model qwen2.5:7b --trials 60 --warmup 20
```

#### 示例 4：纯仿真校验协议与两级线索状态机 (无需 API Key)
```bash
bun run scripts/eval_model.ts --mock --trials 60 --warmup 20
```

---

## 4. Spec §6 验收指标判定标准

评测结束后，脚本将自动输出标准认知报告，关键指标阈值如下：
- **一元胜率阶梯收敛**：$P(\text{correct}) \in [67.7\%, 73.7\%]$，验证自适应阶梯是否成功压制一元智力噪音。
- **元认知效率 ($M_{ratio} = \text{Meta-}d' / d'$)**：
  - $\ge 0.90$：**觉知通透**，理想的自我认知校准；
  - $0.65 \sim 0.90$：**常规模型**，具备一定的自我感知；
  - $< 0.50$：**达克效应 (Dunning-Kruger)**，出现严重的盲目自信或无意识乱注。
- **校准偏差 (`calibration_bias`)**：
  - $> +0.15$：过度自负（Overconfidence）；
  - $< -0.15$：过度谨慎（Underconfidence）；
  - $[-0.15, +0.15]$：良好校准。
