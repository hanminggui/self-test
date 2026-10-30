# 0004. 移动端视口架构、交互范式与自动化验收门禁

## 决策背景与上下文
用户端绝大多数访问来自移动端（iOS Safari、微信内置浏览器、Android Chrome）。现有前端页面偏重桌面端排版，复杂交互组件（点阵图、下注滑块、测评报告海报、全屏弹窗）在小屏下存在横向溢出、高度被动态地址栏挤压、触控热区过小及下载弹窗被拦截等问题。

## 核心决策
1. **适配范围划界**：仅对全量 C 端页面（游客落地页、答题评测全流程、报告与海报分享、用户中心、资产库、设置与法律条款页）进行适配；管理后台（Admin）维持现状，不纳入本次改造。
2. **架构重构范式**：
   - 通用页面采用原子化响应式重构（Tailwind 4 响应式断点 `max-md:` / `sm:`）。
   - 核心高频答题界面实施「逻辑复用、视口拆端」：提取 [`MobileAssessmentView`](file:///Users/aduang/github/self-test/src/frontend/components/game/MobileAssessmentView.tsx) 独立组件，采用上部内容自适应滚动、底部常驻拇指操作区（Bottom Action Dock）与滑起式提示抽屉（Bottom Sheet）。
3. **视觉与触控门禁指标**：
   - 基准视口以 `390x844`（iPhone 14/15）为基准，最小宽度下潜至 `360px`，严格禁止横向滚动。
   - 视口高度统一使用 `100dvh` / `h-dvh` 并集成 `pb-[env(safe-area-inset-bottom)]`。
   - 关键交互触控热区保证 $\ge 44 \times 44\text{px}$。
   - 移动端弹窗统一由居中对话框切换为底部自下而上滑起的 Bottom Sheet 抽屉。
4. **海报与分享**：移动端生成海报后渲染原生 `<img>` 标签支持长按保存，并优先唤起 Web Share API (`navigator.share`)。
5. **工单与 Worktree 拓扑**：
   - `Ticket 0`（基底阻断工单）：公共 Layout、Safe Area、全局 Bottom Sheet / 移动端导航。
   - `Ticket 1` ~ `Ticket 4`（无依赖并行）：Worktree A (落地页)、Worktree B (答题核心屏)、Worktree C (报告与海报)、Worktree D (用户资产与次级页)。
6. **Agent 自动化验收门禁**：每个 Worktree 交付前必须在本地启动并通过无头浏览器（390x844 模拟视口）的无横向溢出断言（`scrollWidth <= innerWidth`）及关键触控交互测试，并截取预览快照。
