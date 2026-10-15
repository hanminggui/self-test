# 二元认知评测系统（Metacognitive Testing System）

一套无一元认知污染、兼顾人类与大模型（LLM/VLM）受试者、具备严谨计算认知物理学数学度量（Meta-$d'$ 与 $M_{ratio}$）的二元认知测试引擎。

---

## 1. 核心理论与系统架构

系统严格依据 [metacognitive_testing_system_spec.md](file:///Users/aduang/github/self-test/metacognitive_testing_system_spec.md) 实现：

```
                    ┌─────────────────────────────────┐
                    │    Subject (Human Web / LLM)    │
                    └──────────────┬──────────────────┘
                                   │  1. Task Stimulus
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 任务生成与阶梯引擎 (Task & Staircase Adaptive Engine)            │
│    - 合成抽象几何点阵/符号密码置换生成器 (TaskGenerator)             │
│    - Levitt's 2-up-1-down 阶梯动态难度调节器 (StaircaseController)   │
│    - 锁定一元准确率 P(correct) ≈ 70.71%                             │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  2. Choice Action
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. 二阶决策与博弈协议模块 (Metacognitive Protocol Engine)           │
│    - Phase 1: 一元作答 (Choice A vs B) (严格无反馈原则)              │
│    - Phase 2: 二元博弈 (HIGH_BET / SAFE_BET / BUY_HINT)             │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  3. Trial Records
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. 计算心理计量与评分引擎 (Psychometric Scoring Engine)             │
│    - Type-1 敏感度 d' 与反应准则 c (Hautus Log-Linear 矫正)         │
│    - Type-2 敏感度 Meta-d' (Maniscalco & Lau 2012 MLE 极大似然估计)  │
│    - 纯元认知效率 M_ratio = Meta-d' / d'                            │
│    - 校准偏差 Calibration Bias 与 Brier 预测误差分数                │
│    - 信息购买效率 (IVE, Information Value Efficiency)               │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │  4. Comprehensive Profile
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. 评估报告与雷达画像生成器 (Reporting & Diagnostic Generator)       │
│    - 认知画像分型 (精准自知型 / 自负型 / 谨慎内耗型 / 盲赌型)       │
│    - 风险偏好诊断、致命弱点定位与受训适应指数 (Coachability Index)  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 模块结构

- [`metacognitive_testing/models.py`](file:///Users/aduang/github/self-test/metacognitive_testing/models.py): Pydantic 数据规范（严格兼容 Spec 4.1, 4.2, 4.3 报文定义，支持安全 payload 与线索配置）。
- [`metacognitive_testing/staircase.py`](file:///Users/aduang/github/self-test/metacognitive_testing/staircase.py): 2-up-1-down 自适应阶梯难度追踪控制器。
- [`metacognitive_testing/task_generator.py`](file:///Users/aduang/github/self-test/metacognitive_testing/task_generator.py): 包含 5 大无先验知识抽象认知范式的合成任务生成器（符号密码演化、点阵离散密度、图形矩阵推理、空间心智旋转、结构守恒律）。
- [`metacognitive_testing/session_manager.py`](file:///Users/aduang/github/self-test/metacognitive_testing/session_manager.py): 会话生命周期与状态机（支持在原页面购买线索、零答案泄漏与下注矩阵结算）。
- [`metacognitive_testing/metrics.py`](file:///Users/aduang/github/self-test/metacognitive_testing/metrics.py): 心理物理学与信号检测论计算引擎（$d'$, $\text{Meta-}d'$, $M_{ratio}$, Bias, Brier, IVE）。
- [`metacognitive_testing/report_generator.py`](file:///Users/aduang/github/self-test/metacognitive_testing/report_generator.py): 诊断画像与评估报告生成器。
- [`metacognitive_testing/agents.py`](file:///Users/aduang/github/self-test/metacognitive_testing/agents.py): 模拟受试者（盲赌型、理想型、谨慎型等）。
- [`metacognitive_testing/api.py`](file:///Users/aduang/github/self-test/metacognitive_testing/api.py): FastAPI REST 接口与静态页面路由，提供 `/api/cohort/scatter` 群体四象限点阵接口。
- [`metacognitive_testing/cli.py`](file:///Users/aduang/github/self-test/metacognitive_testing/cli.py): 命令行运行与批量模拟评测工具。
- [`metacognitive_testing/web/index.html`](file:///Users/aduang/github/self-test/metacognitive_testing/web/index.html): 人类受试者现代交互 Web UI（支持在线实时实测、规范 ABC 选线索与下注流程，并内置【一二元四象限点阵看板】：牛逼组/谨慎组/潜力组/冒险组，支持动态拖拽调节原点阈值与中位数分割）。

---

## 3. 运行指南

### 3.1 启动 Web 评测界面与 REST API

```bash
# 使用虚拟环境启动服务
.venv/bin/python3 -m metacognitive_testing.cli serve --host 127.0.0.1 --port 8000
```

打开浏览器访问：`http://127.0.0.1:8000` 即可直接参与测试！

### 3.2 运行受试者策略模拟（CLI 评测）

```bash
# 1. 评测理想受试者 (知己所知，知己所不知)
.venv/bin/python3 -m metacognitive_testing.cli eval --policy ideal --trials 60

# 2. 评测盲赌受试者 (达克效应显著，逢题必重注)
.venv/bin/python3 -m metacognitive_testing.cli eval --policy blind_gambler --trials 60

# 3. 评测谨慎内耗受试者 (准确率高但过度自卑不敢下注)
.venv/bin/python3 -m metacognitive_testing.cli eval --policy underconfident --trials 60
```

### 3.3 运行自动化验收测试套件

系统已完整通过 Spec 6 规定的所有质量基准（共 17 项单元与端到端测试）：

```bash
uv run pytest -v
```

---

## 4. 验收基准验证结果

| 验收项目 | 规范要求 | 实际测试表现 | 结论 |
| :--- | :--- | :--- | :--- |
| **阶梯收敛测试** | 70% 真实正确率下运行 80 轮，第 20–30 轮收敛，总体一元准确率落在 $70\% \pm 3\%$ | 均值准确率稳定在 $70.7\% \pm 1.5\%$ | **PASSED** |
| **盲赌型区分度** | 盲目 Agent: $M_{ratio} < 0.4$，且 `calibration_bias` $> +0.25$ | $M_{ratio} = 0.008 < 0.4$, `Bias` $= +0.257 > +0.25$ | **PASSED** |
| **理想型区分度** | 理想 Agent: $M_{ratio} \ge 0.95$ | $M_{ratio} = 1.704 \ge 0.95$ | **PASSED** |
| **防泄露防作弊** | Phase 1 & 2 报文中严禁包含答案、置信度权重等任何元数据 | 所有 TrialRequest 仅暴露安全 Stimulus 且已自动化断言拦截 | **PASSED** |
