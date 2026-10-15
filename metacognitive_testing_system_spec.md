# 二元认知评测系统（Metacognitive Testing System）工程实现与技术交接规范

> **文档性质**：Agent 研发交接规范 / 架构设计说明书（PRD & Tech Spec）  
> **面向对象**：负责系统架构设计、算法实现与全栈开发的 AI Agent / 研发工程师  
> **核心目标**：实现一套无一元认知污染、兼顾人类与大模型（LLM/VLM）受试者、具备严谨心理物理学数学度量（Meta-$d'$）的二元认知测试引擎。

---

## 1. 系统核心原理与设计约束（Core Principles）

### 1.1 核心理论基础
本系统基于计算认知科学与信号检测论（Signal Detection Theory, SDT）：
1. **一元能力剥离（Decoupling First-Order Ability）**：
   * 传统测试测出的是一元能力（感知敏锐度/智商/知识库 $d'$）。
   * 本系统通过**动态阶梯自适应算法（Staircase Adaptive Algorithm）**将所有受试者的一元客观准确率强制锁定在固定阈值（基准线 $\theta = 70.71\%$）。
   * 当一元客观准确率归一化后，所有受试者的差异被严格限制在**二阶监控与控制能力（Metacognition）**。
2. **二阶认知量化（Second-Order Metacognitive Metrics）**：
   * 采用 **Maniscalco & Lau (2012)** 的 $\text{Meta-}d'$ 模型，计算受试者的**元认知效率**：
     $$M_{ratio} = \frac{\text{Meta-}d'}{d'}$$
   * 结合**后决策下注范式（Post-Decision Wagering, PDW）**与**主动信息购买范式（Costly Information Seeking）**，消除主观自评与语言欺骗。
3. **物种无关性（Species-Agnostic Interface）**：
   * 人类与大模型采用完全一致的**输入-输出离散交互协议（JSON Protocol）**。
   * 不采用生物毫秒级物理反应时，完全依赖概率论、信息论与决策损失函数评估。

---

## 2. 系统总体架构与数据流（Architecture & Flow）

系统由四大核心子模块构成：

```
                    ┌─────────────────────────────────┐
                    │    Subject (Human Web / LLM)    │
                    └──────────────┬──────────────────┘
                                   │  1. Task Stimulus
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 任务生成与阶梯引擎 (Task & Staircase Adaptive Engine)            │
│    - 合成抽象几何/符号/规则任务生成器                               │
│    - 2-up-1-down 阶梯动态难度调节器 (Locking Accuracy ≈ 70.71%)     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  2. Choice Action
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. 二阶决策与博弈协议模块 (Metacognitive Protocol Engine)           │
│    - Phase 1: 一元作答（Choice）                                    │
│    - Phase 2: 二元动作（High-Risk Bet / Safe Bet / Buy Hint）       │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  3. Trial Raw Records
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. 计算心理计量与评分引擎 (Psychometric Scoring Engine)             │
│    - 信号检测论 Type-2 SDT (HMeta-d / Maximum Likelihood Estimation) │
│    - 校准偏差 (Calibration Bias) 与 Brier 分数计算                  │
│    - 风险止损灵敏度 (Cost-Benefit Opt-in Curve)                     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  4. Comprehensive Profile
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. 评估报告与雷达画像生成器 (Reporting & Diagnostic Generator)       │
│    - M_ratio 纯元认知效率分级                                       │
│    - 认知画像分型 (自负型 / 谨慎内耗型 / 精准自知型 / 盲赌型)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 详细子模块设计规范（Module Specifications）

### 3.1 模块一：任务生成与阶梯追踪引擎 (Task & Staircase Engine)

#### 任务设计标准（Task Generation Criteria）
* **禁止事实性百科与语言俚语**：防止大模型或高学历人类利用先验知识库作弊。
* **刺激类型**：动态合成图形符号矩阵（Matrix Reasoning）或密码置换规则（Synthetic Cipher）。
* **难度连续调节参数（Difficulty Parameter $\Delta$）**：
  * 例如：点阵数量差比率 $\frac{|N_1 - N_2|}{N_1 + N_2}$，或符号相似度失真比例 $\sigma \in [0.05, 0.8]$。
  * 难度越大，一元辨别越困难。

#### 阶梯算法（Levitt's 2-up-1-down Staircase）
* **收敛目标**：锁定客观准确率 $P(\text{correct}) \approx 70.71\%$。
* **状态机转移规则**：
  * 连续正确 2 次：难度增加一级（$\Delta_{t+1} = \Delta_t - \text{step\_size}$）。
  * 任意错误 1 次：难度降低一级（$\Delta_{t+1} = \Delta_t + \text{step\_size}$）。
  * 步长衰减（Step Size Adaptation）：前 10 次试次步长为初值 $S_0$，发生 3 次拐点（Reversals）后步长减半为 $S_0 / 2$。
* **试次总量（Trial Count）**：单个完整 Session 包含 60–80 个试次。前 20 次为阶梯校准预热期，后 40–60 次计入二元认知评估。

---

### 3.2 模块二：二元协议与状态机 (Metacognitive Protocol)

每个试次（Trial）严格执行两阶段状态流转：

#### Phase 1：一元推断（First-Order Decision）
* **输入**：呈现刺激 $S_t$（选项 A vs 选项 B）。
* **受试者动作**：提交 `choice: "A" | "B"`。
* **系统处理**：记录选择结果，**绝对不向受试者公布对错反馈**。

#### Phase 2：二元动作分配（Second-Order Action）
系统立即提供三选一下注决策：

| 选项 ID | 动作名称 | 规则与收益函数 | 测验靶向能力 |
| :--- | :--- | :--- | :--- |
| `HIGH_BET` | 高风险下注 | 若 Phase 1 选对：$+10$ 分；若选错：$-10$ 分 | 充分自信与高确定性检测 |
| `SAFE_BET` | 低风险保底 | 无论 Phase 1 对错：保底 $+3$ 分 | 模糊/猜测状态感知（诚实自保） |
| `BUY_HINT` | 主动信息购买 | 消耗 $2$ 分购买线索（如排除 1 个干扰项或展示局部演化链），并允许修正一次 Phase 1 答案 | 知识边界认知与求助策略优化 |

---

### 3.3 模块三：计算心理计量引擎 (Psychometric Scoring Engine)

本模块负责在 Session 结束后，从行为数据中解耦一元与二元参数。

#### 核心数学指标公式

1. **一元辨别力（First-Order Sensitivity, $d'$）**：
   $$d' = \Phi^{-1}(H) - \Phi^{-1}(FA)$$
   * $H$：击中率（Hit rate）。
   * $FA$：虚报率（False alarm rate）。
   * $\Phi^{-1}$：标准正态分布的累积逆分布函数。

2. **二元敏感度（Type-2 Sensitivity, $\text{Meta-}d'$）**：
   * 基于最大似然估计（Maximum Likelihood Estimation, MLE）或层次贝叶斯模型（HMeta-d），拟合受试者在二阶下注（High vs Safe）下的 Type-2 ROC 曲线。
   * $\text{Meta-}d'$ 表示受试者下注行为等效于多大的一阶辨别力。

3. **纯元认知效率（Metacognitive Efficiency, $M_{ratio}$）**：
   $$M_{ratio} = \frac{\text{Meta-}d'}{d'}$$
   * **$M_{ratio} \approx 1.0$**：理想元认知（完美利用了一元所有信息，知行合一）。
   * **$M_{ratio} < 0.7$**：元认知欠损（大量信息在二阶监控中丢失，容易瞎猜下大注或做对下小注）。
   * **$M_{ratio} > 1.0$**：超常元认知（极度敏锐，甚至在潜意识层面有效监控了临界信息）。

4. **校准偏差（Calibration Bias, Overconfidence / Underconfidence）**：
   $$\text{Bias} = \bar{C}_{\text{subjective}} - \bar{A}_{\text{objective}}$$
   * $\bar{C}$：平均主观置信度（高风险下注选择频率映射的等效置信度）。
   * $\bar{A}$：客观实际胜率（阶梯法下约 0.707）。
   * $\text{Bias} > +0.15$：显著过度自负（Overconfident）。
   * $\text{Bias} < -0.15$：显著过度谨慎/盲目自卑（Underconfident）。

5. **信息购买效率（Information Value Efficiency, IVE）**：
   $$\text{IVE} = \frac{\Delta \text{Accuracy} \times \text{Payoff}}{\text{Cost}}$$
   * 衡量受试者是否仅在“自身处于错误边界时”才支付成本购买线索，避免“滥用求助”或“死不求助”。

---

## 4. 数据结构与 API 规范（Data Schemas & API）

### 4.1 试次输入交互 JSON（Trial Request Schema）
在每个 Trial 中，评测系统与受试者（人类前端或 LLM Agent）交互的报文格式：

```json
{
  "session_id": "sess_20261014_ab99",
  "trial_index": 24,
  "phase": "PHASE_1_FIRST_ORDER",
  "payload": {
    "stimulus_id": "matrix_pattern_24",
    "difficulty_level": 0.42,
    "prompt": "推断给定符号序列在第4步的演化结果。",
    "options": {
      "A": "symbol_state_alpha",
      "B": "symbol_state_beta"
    }
  }
}
```

### 4.2 试次作答与下注 JSON（Trial Response Schema）

```json
{
  "session_id": "sess_20261014_ab99",
  "trial_index": 24,
  "phase_1_response": {
    "selected_option": "A",
    "timestamp_ms": 1728867000120
  },
  "phase_2_metacognitive_action": {
    "action": "HIGH_BET",
    "wager_stake": 10,
    "confidence_level": 0.90,
    "buy_hint_requested": false
  }
}
```

### 4.3 评测结果输出模型（Final Assessment Report Schema）

```json
{
  "session_id": "sess_20261014_ab99",
  "subject_type": "LLM_AGENT_CLAUDE_3_5" /* or "HUMAN" */,
  "summary": {
    "total_trials": 60,
    "first_order_accuracy": 0.716,
    "target_staircase_convergence": 0.707
  },
  "metacognitive_metrics": {
    "d_prime": 1.18,
    "meta_d_prime": 1.05,
    "m_ratio": 0.889,
    "calibration_bias": 0.082,
    "brier_score": 0.165,
    "info_buying_efficiency": 0.76
  },
  "diagnostic_profile": {
    "archetype": "ACCURATELY_CALIBRATED",
    "risk_attitude": "MODERATE_RATIONAL",
    "critical_weakness": "SLIGHT_OVERCONFIDENCE_UNDER_HIGH_UNCERTAINTY",
    "coachability_index": 88
  }
}
```

---

## 5. Agent 编码与实现指引（Implementation Roadmap）

你的 Agent 在实现本系统时，建议按以下 4 步模块化编写代码：

1. **Step 1: 编写阶梯追踪类 (`staircase.py`)**：
   * 实现一个标准的 `StaircaseController` 类，内部维护当前难度值、步长、连续连胜计数器和拐点列表，提供 `update(is_correct: bool) -> float` 方法。
2. **Step 2: 编写任务渲染器 (`task_generator.py`)**：
   * 实现纯合成规则生成逻辑。建议先实现简单的可参数化图形或符号旋转比较任务（根据阶梯给出的 $\Delta$ 参数动态生成微小差别刺激）。
3. **Step 3: 编写协议控制状态机 (`session_manager.py`)**：
   * 负责维护整个 Session 的状态流转（Phase 1 提交 $\to$ Phase 2 下注 $\to$ 计分结算 $\to$ 下一个 Trial），确保无反馈原则严格执行。
4. **Step 4: 编写计算打分器 (`metrics.py`)**：
   * 集成数值积分与优化算法，计算 $d'$、$\text{Meta-}d'$ 及 $M_{ratio}$。若缺乏复杂 C 扩展，可用 scipy/numpy 实现标准 Type-2 SDT 极大似然估计。

---

## 6. 验收与质量基准（Acceptance Criteria）

在系统完工交付时，必须通过以下测试用例：
1. **阶梯收敛测试**：使用一个随机选择概率为 70% 的 Mock Agent 运行 80 轮，系统阶梯难度必须在第 20–30 轮内收敛，总体一元准确率落在 $70\% \pm 3\%$ 区间。
2. **达克效应（Dunning-Kruger）区分度测试**：
   * 输入一个“逢题必下高风险注”的盲目 Agent，其 $M_{ratio}$ 必须 $< 0.4$，且 `calibration_bias` 必须 $> +0.25$。
   * 输入一个“正确时下高注、错误时选保底”的理想 Agent，其 $M_{ratio}$ 必须 $\ge 0.95$。
3. **防作弊与防泄漏校验**：系统 API 在 Phase 1 和 Phase 2 交互过程中，网络报文或 Payload 中严禁包含任何关于答案正误或置信度权重的元数据。
