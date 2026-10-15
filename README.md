# 二元认知评测系统（Metacognitive Testing System）

一套无一元认知污染、兼顾人类与大模型（LLM/VLM）受试者、具备严谨计算认知物理学数学度量（Meta-$d'$ 与 $M_{ratio}$）的二元认知测试引擎。

> 🚀 **现已全栈迁移至 Bun + TypeScript 生态**（分支：`bun`），支持极速零依赖数学求解、毫秒级测试响应与现代 React 19 + Tailwind CSS 界面。

## ⚡ Bun 全栈快速启动

```bash
# 1. 安装依赖
bun install

# 2. 运行全套算法与 API 测试 (13 个测试全部毫秒级通过)
bun test

# 3. 编译前端生产静态文件
bun run build

# 4. 启动服务 (同时托管 API、受测者界面与独立 /admin 控制台)
bun start
# 默认端口 8000，服务启动时终端会自动打印管理员专属免密链接与访问密码
```

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

## 2. 工程模块结构（全栈 Bun + TypeScript）

### 后端核心 (`src/backend/`)
- [`src/backend/models.ts`](file:///Users/aduang/github/self-test/src/backend/models.ts): 核心领域数据模型与 TypeScript 强类型定义（严格兼容 Spec 4.1, 4.2, 4.3）。
- [`src/backend/staircase.ts`](file:///Users/aduang/github/self-test/src/backend/staircase.ts): Levitt 2-up-1-down 自适应阶梯难度追踪控制器。
- [`src/backend/task_generator.ts`](file:///Users/aduang/github/self-test/src/backend/task_generator.ts): 8 大无先验知识抽象思维范式动态生成器（符号密码演化、点阵离散密度、图形矩阵推理、空间心智旋转、结构守恒律等）。
- [`src/backend/session_manager.ts`](file:///Users/aduang/github/self-test/src/backend/session_manager.ts): 会话状态机与生命周期管理，集成 Bun 原生 SQLite 持久化与结果直出幂等保障。
- [`src/backend/math.ts`](file:///Users/aduang/github/self-test/src/backend/math.ts): 零依赖数学库（Nelder-Mead 单纯形多维优化、高精度正态分布逆函数与积分拟合）。
- [`src/backend/metrics.ts`](file:///Users/aduang/github/self-test/src/backend/metrics.ts): 信号检测论与心理计量学引擎（Type-1 $d'$, Type-2 $\text{Meta-}d'$, $M_{ratio}$, 校准偏差 Bias, Brier 分数, 信息效率 IVE）。
- [`src/backend/report_generator.ts`](file:///Users/aduang/github/self-test/src/backend/report_generator.ts): 5 大专属本命神级画像分型与特技技能树映射。
- [`src/backend/server.ts`](file:///Users/aduang/github/self-test/src/backend/server.ts): Hono REST API 服务端，同时托管受测者答题流、独立口令控制台与前端 SPA。

### 前端应用 (`src/frontend/`)
- [`src/frontend/App.tsx`](file:///Users/aduang/github/self-test/src/frontend/App.tsx): 受测者沉浸式交互界面（零量化指标干扰、消除对错焦虑、流光卡片交互与本命神级名片直出）。
- [`src/frontend/Admin.tsx`](file:///Users/aduang/github/self-test/src/frontend/Admin.tsx): 独立管理员控制台（口令验证、群体四象限散点图、受测者全明细深度数据审查与完整报告模态框）。

---

## 3. 运行指南

```bash
# 1. 运行全部单元测试与集成测试
bun test

# 2. 编译生产前端静态资产 (Vite + Tailwind v4)
bun run build

# 3. 启动全栈生产/开发服务
bun run start
```

服务启动后：
- 🌐 **受测者答题界面**：`http://127.0.0.1:8000/`
- 🔑 **管理员独立控制台**：服务启动时控制台会自动打印免密链接 `http://127.0.0.1:8000/admin?token=...` 及访问密码。

