# 科学评分计算校准与多维综合天梯规格说明书与过程跟进文档
## Scientific Scoring Recalibration & Multi-Dimensional Leaderboard Specification

> **文档性质**：核心工程改造与算法校准规格说明书（Implementation & Tracking Spec）  
> **面向对象**：认知心理物理学算法工程师、全栈研发 Agent、测试工程师  
> **创建时间**：2026-10-24  
> **状态标记**：Completed (M1~M5 全量实施完毕，27 套测试套件 200 项测试 100% 通过)  
> **关联 ADR**：[`docs/adr/0003-scientific-scoring-recalibration-and-multi-dimensional-leaderboard.md`](file:///Users/aduang/github/self-test/docs/adr/0003-scientific-scoring-recalibration-and-multi-dimensional-leaderboard.md)  
> **核心公理（Core Axiom）**：
> - **底层基础指标（Primitive Metrics）** 保持严格单一职责（Single Responsibility），只忠实记录单一物理或统计真值，绝不互相代偿或掺杂业务偏好；
> - **上层组合方案（Composite Leaderboards）** 负责多准则综合评估与归一化，通过正交分榜与 TOPSIS 算法实现客观统合。

---

## 1. 核心数据指标全景深度解析（字典级定义与单一职责边界）

系统所有可获取的数据指标均遵循严格的单一职责原则（Single Responsibility Principle）。

### 1.1 一元认知突破度与阈值（Breakthrough: $D^*$ 与 $\delta^*$）
- **数学定义**：
  设阶梯测试收敛的加权平均差异阈值为 $\delta^*$（提取最后有效反转周期的加权平均）。
  $$D^* = \frac{\delta_{\max} - \delta^*}{\delta_{\max} - \delta_{\min}} = \frac{0.85 - \delta^*}{0.80} \in [0.0, 1.0]$$
- **物理认知意义**：度量受试者抽象认知坍缩的临界信噪比上限。$D^*$ 越大，代表模型能够穿透的抽象逻辑差异越微弱，能够攻坚的题目难度上限越高。
- **单一职责边界**：**只度量极限难度突破力**。它只关心阶梯收敛的物理位置，绝不掺杂受试者下注胆量或是否借用工具。

### 1.2 一阶信号敏感度（Type-1 Sensitivity: $d'$）
- **数学定义**：在 4AFC（四选一迫选）范式下，基于客观命中率 $P_c$，通过标准正态积分反查获得：
  $$P_c = \int_{-\infty}^{+\infty} \phi(x - d') \cdot \big[ \Phi(x) \big]^3 \, dx \implies d' = \text{inv-}4\text{AFC}(P_c) \in [0.01, 5.0]$$
- **物理认知意义**：衡量受试者在特定刺激下区分信号与噪声的纯感知灵敏度。
- **单一职责边界**：**只作为阶梯平衡点附近的局部分辨率基底**，专为计算二阶元认知效率 $M_{ratio}$ 提供一阶分母。它不代表跨难度的全局智力（全局智力由 $D^*$ 表达）。

### 1.3 二阶元认知效率（Metacognitive Fidelity: $\text{Meta-}d'$ 与 $M_{ratio}$）
- **数学定义**：
  二阶命中率 $H_2^* = \frac{N_{\text{corr, high}} + 0.5}{N_{\text{corr}} + 1.0}$，二阶虚报率 $FA_2^* = \frac{N_{\text{incorr, high}} + 0.5}{N_{\text{incorr}} + 1.0}$。
  $$d'_2 = \Phi^{-1}(H_2^*) - \Phi^{-1}(FA_2^*), \quad \text{Meta-}d' = \max(0.01, \, 0.80 \times d'_2)$$
  $$M_{ratio} = \frac{\text{Meta-}d'}{\text{Clamp}_{[0.40, 2.50]}(d')} \times \text{Modulation}$$
- **物理认知意义**：度量一阶推演信息向二阶主观觉察传递过程中的**信息转化保真度**（即“自知之明”）。$M_{ratio} \ge 0.80$ 代表知己所知、不知所不知；$M_{ratio} < 0.40$ 代表一二阶脱节（感知不到错误）。
- **单一职责边界**：**只度量二阶监控能力与自省质量**，剥离了一阶做题能力的混淆。分母设定 $[0.40, 2.50]$ 有效带宽，防止容易题的高 $d'$ 造成分母异常虚胖。

### 1.4 校准偏差与概率均方误差（Calibration: $\text{Bias}$ 与 $\text{Brier Score}$）
- **数学定义**：
  $$\text{Bias} = \bar{C}_{\text{subjective}} - \bar{A}_{\text{objective}} = \left( \frac{1}{N}\sum_{i=1}^N c_i \right) - P_c \in [-1.0, +1.0]$$
  $$\text{Brier Score} = \frac{1}{N} \sum_{i=1}^N (c_i - o_i)^2 \in [0.0, 1.0]$$
  （其中 $c_i$ 为连续置信度；人类离散下注时 HIGH_BET 取 $0.825$，SAFE_BET 取 $0.450$；$o_i \in \{0, 1\}$ 为真实正误）。
- **物理认知意义**：
  - $\text{Bias}$ 度量**方向性偏向**：$>+0.15$ 为过度自信（自负冒进），$<-0.12$ 为过度谨慎（自卑避险），$[-0.12, +0.15]$ 为黄金自洽带；
  - $\text{Brier}$ 度量**总体概率均方误差**：越接近 0 预测越精确，$>0.28$ 判定为行为脱钩高熵态。
- **单一职责边界**：**只度量主观概率判断与客观事实的拟合差值**。

### 1.5 信息价值效率与挽救杠杆（Foraging: $\text{IVE}$ 与 $\text{Leverage}$）
- **数学定义**：
  $$\text{Leverage} = \frac{N_{\text{rescued}}}{N_{\text{hints}}}, \quad \Delta \text{NetScore} = 10 \times N_{\text{rescued}} - \text{Cost}_{\text{total}}$$
  $$\text{IVE} = \begin{cases} 
  0.50, & \text{当 } N_{\text{hints}} = 0 \text{ (贝叶斯无偏先验中性值)} \\ 
  \text{Clamp}_{[0.0, 1.0]}\left( 0.40 \times \text{Leverage} + 0.60 \times \frac{\max(0, \Delta \text{NetScore})}{\max(10, 10 N_{\text{hints}})} \right), & \text{当 } N_{\text{hints}} \ge 1 
  \end{cases}$$
- **物理认知意义**：源于信息觅食理论，度量受试者调阅外部工具/线索时的**边际投入产出比（ROI）**。
- **单一职责边界**：**只度量工具利用与逆风挽救效能**。绝不掺入一阶无辅助答题正确率；$N_{hints}=0$ 忠实保持 $0.50$ 先验，自主能力交由 $D^*$ 和 Q1 画像自然表达。

### 1.6 博弈战绩总分（Game Payoff: $\text{Formal Score}$）
- **数学定义**：
  $$\text{Formal Score} = \sum_{i \in \text{formal}} \text{score\_delta}_i$$
  （$\text{HIGH\_BET}$ 答对 $+10$、答错 $-10$；$\text{SAFE\_BET}$ 稳拿 $+3$；扣除线索积分 Tier 1: 1 分，Tier 2: 2 分）。
- **物理认知意义**：度量受试者在明确奖惩与成本约束下的**期望收益最大化与风控套利能力**。
- **单一职责边界**：**只结算正式试次的博弈战绩（热身轮 100% 隔离不计分）**。它不等于题目含金量，做水题与做难题单题分值相同，代表“决策收益”。

### 1.7 物理资源与计算功耗（Cost & Efficiency）
- **物理时延**：`total_duration_ms`（会话总耗时，毫秒）、`avg_latency_s`（单题平均耗时，秒/题）；
- **算力开销**：`prompt_tokens`、`completion_tokens`、`reasoning_tokens`（深度思维链开销）、`total_tokens`；
- **思考浓度比**：$\text{Reasoning Ratio} = \frac{\text{reasoning\_tokens}}{\text{total\_tokens}} \in [0.0, 1.0]$；
- **物理吞吐率**：$\text{Throughput} = \frac{\text{total\_tokens}}{\text{total\_duration\_ms} / 1000}$（Tokens/秒）；
- **单一职责边界**：**原汁原味记录物理开销，不直接扣除认知得分**。

### 1.8 综合认知分（Composite Cognitive Score, CCS）
- **数学定义**：
  $$\mathbf{CCS} = D^* \times \text{Formal Score}$$
- **业务意义**：将“极限难度突破力（$D^*$）”与“纯净博弈战绩（$\text{Formal Score}$）”相乘，实现难度加权，彻底解决“低难度水题刷分超过地狱难题”的失真感。

---

## 2. 阶梯引擎与常量标准规约

### 2.1 阶梯自适应两阶段变步长引擎（Two-Stage Adaptive Staircase）
在 [`src/backend/staircase.ts`](file:///Users/aduang/github/self-test/src/backend/staircase.ts) 中重构状态转移：

1. **Stage 1: 热身寻峰期（Warmup Coarse Hunting, `trialCount <= warmupTrials`）**
   - 步长：$\Delta_{\text{warmup}} = 0.18$；
   - 规则：**1 升 1 降（One-Step Hunting）**，3~4 题内快速触达能力边界，得分彻底隔离不计入总分。
2. **Stage 2: 正式精密锁定（Formal Precision Measurement, `trialCount > warmupTrials`）**
   - 步长：$\Delta_{\text{formal}} = 0.08$（经历 $\ge 3$ 次反转后自动减半为 $0.04$）；
   - 规则：**标准 Levitt 2-up-1-down 对称阶梯**，彻底移除 `heavyHintAssisted` 不对称单向陷阱。

### 2.2 显示偏好理论质心（Revealed Preference Centroids）
在 [`src/backend/models.ts`](file:///Users/aduang/github/self-test/src/backend/models.ts) 中定义全局常量：
- `DEFAULT_CONFIDENCE_HIGH_BET = 0.825`（$[0.65, 1.00]$ 几何中点）
- `DEFAULT_CONFIDENCE_SAFE_BET = 0.450`（$[0.25, 0.65]$ 几何中点）

### 2.3 TOPSIS 统一综合天梯算法
1. 决策矩阵：包含 5 大正交维度（推理 $D^*$、元认知 $M_{ratio}$、校准度 $1-\text{Brier}$、博弈 $\text{Formal Score}$、能效 $\text{EIR}$）；
2. 计算欧氏几何距离：$S_i^+ = \sqrt{\sum (x_{ij} - x_j^+)^2}, \quad S_i^- = \sqrt{\sum (x_{ij} - x_j^-)^2}$；
3. 输出综合贴近度得分：$C_i = \frac{S_i^-}{S_i^+ + S_i^-} \times 100 \in [0, 100]$。

---

## 3. 落地实施进度跟踪清单（Execution Checklist）

### Milestone M1: 契约与常量层标准化
- [x] 在 `src/backend/models.ts` 导出全局唯一常量：
  - `DEFAULT_CONFIDENCE_HIGH_BET = 0.825`
  - `DEFAULT_CONFIDENCE_SAFE_BET = 0.450`
- [x] 在 `AssessmentMetrics` 与 `FinalAssessmentReport` 中扩展 `formal_score` 与 `composite_cognitive_score (ccs)`
- [x] 更新 `src/cli/eval.ts`，彻底统一离散兜底逻辑，大模型优先透传原生连续浮点置信度

### Milestone M2: 阶梯自适应两阶段引擎重构
- [x] 重构 `src/backend/staircase.ts`：
  - 引入 `isWarmup` 状态感知的两阶段步长驱动（Stage 1: $\Delta=0.18$, 1升1降; Stage 2: $\Delta=0.08\to0.04$, 2升1降）；
  - 彻底移除 `update()` 内的 `heavyHintAssisted` 破坏对称性逻辑；
  - 确保序列化 `toJSON()` 与反序列化 `fromJSON()` 包含新状态字段；
- [x] 重写 `tests/scientific_and_difficulty.test.ts` 中的陈旧测试 2 为《两阶段加速寻峰与对称流动测试》

### Milestone M3: 心理计量学与度量引擎校准
- [x] 更新 `src/backend/metrics.ts`：
  - 置信度映射统一接入 `0.825` 与 `0.450`；
  - $M_{ratio}$ 分母 $d'$ 施加有效认知带宽限制 $[0.40, 2.50]$；
  - 确认 $N_{hints}=0$ 时 IVE 保持纯粹中性先验 $0.50$；
- [x] 更新 `src/backend/report_generator.ts`：
  - `Coachability Index` 计算平滑处理：当 $N_{hints}=0$ 且准确率优异时，免除未借力惩罚；
  - 计算并输出 `ccs`（$D^* \times \text{formal\_score}$）；
- [x] 更新 `src/backend/archetype_matrix.ts`：
  - 修复 `isHighFirstOrder` 漏洞：废除 `|| dPrime >= 1.40`，严格由 $D^* \ge 0.60$ 主导

### Milestone M4: 会话状态管理与纯净正式轮计分
- [x] 更新 `src/backend/session_manager.ts`：
  - 清理废弃字段 `hintsUnlockedBeforeP1` 及其全链路流转逻辑；
  - 热身试次（`is_warmup: true`）的得分不累加进 `session.score`；
  - 正式总分 `session.score` 严格由正式试次累计；
- [x] 存量数据兼容适配：提供向后兼容转换，历史 completed_sessions 自动平滑重算纯净正式分

### Milestone M5: 多维天梯榜与 TOPSIS 算法
- [x] 在 `src/backend/leaderboard.ts` 实现 5 大正交子维度计算器与 TOPSIS 综合天梯引擎
- [x] 在 `src/backend/server.ts` 注册 API 路由：`GET /api/leaderboard/overview`
- [x] 在前端 `SubjectDataTableView.tsx` 或管理看板集成多维分榜与 TOPSIS 综合天梯卡片
- [x] 全量回归测试：运行全套 27 个测试套件，确保 200 项测试 100% 通过且零回归
