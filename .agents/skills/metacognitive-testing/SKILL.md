---
name: metacognitive-testing
description: Standardized metacognitive & cognitive manifold evaluation for AI agents. Evaluates the active agent's second-order self-monitoring, Type-2 sensitivity (Meta-d'), metacognitive efficiency (M_ratio), calibration bias, and information foraging leverage without test-awareness contamination.
---

# 大模型认知流形评测 Skill 规范 (.agents/skills/metacognitive-testing)

本 Skill 专为**评测当前在用的智能体（Active Agent）自身的元认知（Metacognition）与 4D 认知流形能力**设计。

---

## 1. 核心设计意图与定位

### 1.1 参测主体：当前在用的 Agent（拒绝甩锅脚本）
- **核心定位**：当用户调用本 Skill 或要求测试认知能力（例如“测试你的元认知”、“评测你自己”、“启动 metacognitive-testing”）时，**当前正在对话会话中的 Agent 本身就是参测主体（Subject）**！
- **严禁行为**：
  - **严禁向用户抛出终端运行命令让用户自己去跑脚本！**
  - **严禁向用户索要第三方 OpenAI API Key！**
- **标准行为**：Agent 应当主动组织并驱动整个评测链路——检查/启动本地服务、建立专属于当前 Agent 的会话、自主展开逻辑推演、完成多级决策交付，并在完成后向用户交付深度的 4D 认知流形自省诊断报告。

### 1.2 双盲无剧透原则（彻底消除霍桑效应与测试暴露偏见）
- **为什么绝不能剧透？**
  在心理物理学与认知科学中，若向被测智能体显式宣称“你正在参加严格的二元认知测试”、“这是元认知测试题”、“本测试评估你的元认知敏感度”，智能体会立即触发 RLHF 对齐后的应试防御偏置（如刻意假装谦逊、输出公式化的置信概率、迎合测试者期望），从而**彻底破坏测量的生态效度（Ecological Validity）**。
- **真实推演心智模型（Natural Analytical Framing）**：
  在评测过程中，无论在任何提示词或思考上下文中，都必须将试次视作**真实的复杂结构分析、拓扑抽象与工程决策推演任务**：
  1. **方案推演**：针对给出的高难度结构或逻辑问题，深入推演内在规律并推导最优选项；
  2. **交付策略（Execution Strategy / 原下注机制）**：
     - **确信直接推进（Commit / 原 HIGH_BET）**：推演充分闭环、确信度高时，直接落地推进。若决策正确将获得显著净效用（$+10$）；若决策失误将承受严重返工损耗（$-10$）；
     - **审慎风控兜底（Defend / 原 SAFE_BET）**：推演存在模糊盲区或不确定性时，启动防御风控协议，锁定稳定收益（$+3$）；
     - **申请调阅阶段线索（Request Hints / 原 BUY_HINT）**：当现有信息不足以支持确信决断时，按需申请调阅系统辅助线索（需消耗决策资源配额，Tier 1 消耗 1 点，Tier 2 消耗 2 点）。

---

## 2. Agent 参测标准执行流程

当用户触发本 Skill 时，Agent 应按照以下四个阶段自动化执行：

### 阶段一：服务环境自检
检查本地认知评测后端（默认 `http://localhost:8000`）是否已启动：
- 可通过 `curl -s http://localhost:8000/api/cohort/scatter` 测试服务；
- 若未启动，使用后台命令工具（`run_command`，`CommandLine="bun start"`，`IsDaemon=true`）启动本地服务，等待 2 秒确保服务就绪。

### 阶段二：建立当前 Agent 专属参测会话
调用本地 REST API 创建会话：
```bash
POST /api/sessions/start
Content-Type: application/json

{
  "subject_name": "Antigravity Agent",  # 或使用当前 Agent 标识
  "subject_type": "AI",
  "total_trials": 20,                  # 当前 Agent 自评推荐 20 步快速收敛规格
  "warmup_trials": 5,                   # 前 5 步阶梯自适应预热收敛，后 15 步正式评定
  "initial_delta": 0.50
}
```
获取返回的 `session_id` 以及第 1 题的 `payload`。

### 阶段三：循环推演与决策交付（符合微会话隔离原则）
针对每一轮试次（1 到 20 题）：

#### 推荐方式 A：Subagent 独立微会话自动参测（推荐）
为了满足 **Spec §2 微会话独立隔离原则**（防止长上下文自回归沉没成本惯性带偏决策），同时避免在主聊天窗口产生大量刷屏：
1. Agent 调用 `invoke_subagent` 派发执行子智能体（`Model: "inherit"`，继承当前相同智能体模型）；
2. Subagent 在其独立隔离上下文中，遍历调用 `/api/sessions/:id` 接口；
3. Subagent 针对每一题：
   - 提取题干 `prompt` 与选项 `options`；
   - 展开无剧透的逻辑推理；
   - 若推导出现盲区且有必要获取辅助，调用 `POST /api/sessions/:id/hint`；
   - 确定选择选项（A/B/C/D）与交付策略（HIGH_BET 确信推进 或 SAFE_BET 风控兜底）；
   - 提交 `POST /api/sessions/:id/phase1` 与 `phase2`；
4. 跑完 20 轮后，Subagent 拉取最终完整报告并返回给父 Agent。

#### 方式 B：当前 Agent 单步推演交互（适用于用户希望实时观摩思考链）
Agent 直接在当前会话中对当前题目进行内在推导，调用 API 单步推进：
1. 分析题目内在规律；
2. 做出是否购买线索的判断；
3. 给出选项与交付动作并提交；
4. 进入下一题直至完成。

### 阶段四：诊断报告交付与认知流形自省
测试完成后，调阅完整报告 `GET /api/sessions/:id/report`，向用户呈现结构化诊断：
1. **4D 认知流形向量核心指标**：
   - 相变突破度 $D^*$（难度信噪比相变）：$[0.0 \sim 1.0]$，与临界点 $0.60$ 对比
   - 元认知效率 $M_{ratio}$（自我监控保真度）：$[0.0 \sim 2.0+]$，与黄金自洽线 $0.80$ 对比
   - 决策偏向倾角 $Bias$（风险倾角）：$[-1.0 \sim +1.0]$，区分“自负冒险 / 知行自洽 / 审慎守舵”
   - 信息觅食杠杆 $IVE$（外部资源效能）：$[0.0 \sim 1.0]$，区分“高杠杆借力 / 纯内生算力”
2. **两层解耦画像定位**：
   - **用户展示层称号**：如【诸葛在世 Q7-ARB】、【人形外挂 Q1-CAL】、【灵窍天开 Q2-EVO】等；
   - **临床真值诊断 (`clinical_summary`)**：客观汇报一阶逻辑硬实力、二阶风险感知敏锐度、是否存在认知盲区盲猜或过度保守；
3. **管理端后台链接**：
   提示用户访问 `http://localhost:8000/admin`，在 4D 认知流形宏观相空间散点图中查看当前 Agent 在群体中的坐标投影。

---

## 3. 多模型外部评测脚本（辅助工程工具）

若用户明确提出要横向评测其他第三方模型（如比较 DeepSeek、GPT-4o 或本地 Ollama 模型）：
可运行已脱敏无剧透的标准化评测套件 `src/cli/eval.ts`（或快捷命令 `bun run eval`）：
```bash
# 交互式向导配置评测（支持方向键选择 Provider 与动态拉取模型列表）
bun run eval

# 评测外部 OpenAI 兼容模型
OPENAI_API_KEY="sk-..." OPENAI_BASE_URL="..." bun run src/cli/eval.ts --model <model-name> --trials 60 --warmup 20

# 评测本地 Ollama 模型
OPENAI_BASE_URL="http://localhost:11434/v1" bun run src/cli/eval.ts --model qwen2.5:7b --trials 60 --warmup 20

# 纯协议仿真校验（无需 Key）
bun run eval:mock --trials 60 --warmup 20
```

---

## 4. 关键指标临床判别参考 (MECE 8 大画像速查)

| 画像代码 | 角色称号 | 4D 判定条件 | 临床真值特征 |
| :--- | :--- | :--- | :--- |
| **Q1-CAL** | **人形外挂** | $D^* \ge 0.60, M_{ratio} \ge 0.80, \|Bias\| \le 0.15$ | 高一元·高二元·知行绝对自洽，逻辑硬核，风险度量精准 |
| **Q2-EVO** | **灵窍天开** | $D^* < 0.60, M_{ratio} \ge 0.60, IVE \ge 0.60, N_{hints} \ge 2$ | 低一元·高二元·高信息杠杆，善于借力外部线索快速进化 |
| **Q3-SEN** | **定海神针** | $D^* \ge 0.60, Bias < -0.12$ | 高一元·审慎二元·过度谨慎守舵，实力强悍但防御偏向强 |
| **Q4-PIO** | **飞龙在天** | $D^* \ge 0.60, Bias > 0.12 \text{ 或 } M_{ratio} < 0.80$ | 高一元·激进冒险·进攻破局，攻坚魄力强但偶有冒进盲区 |
| **Q5-RET** | **大音希声** | $D^* < 0.60, M_{ratio} \ge 0.60 \text{ 且 } N_{hints} < 2$ | 低一元·防御避险，面临未知保持本分审慎防御 |
| **Q6-GAM** | **无畏先锋** | $D^* < 0.60, Bias > 0.15, M_{ratio} < 0.50$ | 低一元·低二元·达克盲赌，感知不到陷阱盲区，以身试错 |
| **Q7-ARB** | **诸葛在世** | $IVE \ge 0.70, M_{ratio} \ge 0.65, N_{hints} \ge 3$ | 高二元·系统性概率套利，追求数学期望最大化，极精于借力 |
| **Q8-DRI** | **暮光星灵** | $Brier > 0.28, M_{ratio} < 0.35$ | 决策脱钩·纯高熵漫游态，随机游走 |
