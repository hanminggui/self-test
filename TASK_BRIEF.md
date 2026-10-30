# 任务目标：实现 Issue #44 亮色模式全页面深度适配与细节打磨

## 1. 方案核心定位与设计规范（方案 C：Playful Dopamine 多巴胺轻萌）
- **基调与色彩**：
  - 奶油暖米底色（`#FFFDF8` / `#FFFBEB`）与暖色点阵背景。
  - 文本采用深暖褐黑（`#1C1917` / `#292524`），严禁低对比度浅灰字。
  - 活力多巴胺糖果点缀：芝士黄（`#FBBF24`）、蜜桃橘粉（`#FB7185`）、开心果绿（`#10B981`）、苏打蓝（`#38BDF8`）。
- **实体材质与手感**：
  - 实体大圆角与 2px ~ 2.5px 纯黑/深暖实体描边（`border-stone-900`）。
  - 实体硬厚度下沉阴影（`shadow-[0_4px_0_#1c1917]` 或 `shadow-[4px_4px_0_#1c1917]`），彻底告别模糊发灰毛玻璃。
  - 果冻回弹微交互（`active:translate-y-1 active:shadow-none transition-transform`）。

## 2. 深度适配与细节打磨清单
1. **首页 Landing Page** (`src/frontend/pages/GuestLandingPage.tsx`, `src/frontend/components/landing/GuestTrajectoryShowcase.tsx`)
   - Hero 横幅卡片、三步玩法卡片、4D 认知轨迹演示组件、底部心智宇宙认领卡与页脚质感对齐。
2. **测评核心流程** (`src/frontend/App.tsx`)
   - 欢迎门禁与规模设置面板（昵称输入框、题量选择高对比按钮）。
   - 题目 2D 矩阵符号网格、多行题干推导区。
   - 选项按键状态：默认态、Hover 态、选中态（Selected）与激活态（Active）的果冻触感。
   - 决断押注按键（全额强攻 vs 稳健防守）的实体立体按压质感与色彩反馈。
   - 测评战报与名片：专属画像名片、四大正向特技卡、赋能评语与指标雷达图。
3. **分享页与海报系统** (`src/frontend/pages/SharePage.tsx`, `src/frontend/components/share/PosterModal.tsx`)
   - 4 维量化认知指标（d', M-ratio, Bias, Accuracy）卡片边框、阴影与数值可读性。
   - 认知流派共鸣卡片、演进指南及海报弹窗底板与导出 Canvas 渲染通道。
4. **认知资产图鉴** (`src/frontend/pages/AssetsPage.tsx`)
   - 8 大认知化身卡片在已解锁与未解锁状态下的配色打磨，确保暖褐深字清晰可读，糖果色彩明晰。
   - 顶部 Codex 统计徽章与筛选标签栏。
5. **个人中心与偏好设置** (`src/frontend/ProfileDashboard.tsx`, `src/frontend/components/profile/ProfileSettings.tsx`)
   - 6 大 KPI 卡片、4D 认知流形轨迹空间面板、四维演化趋势折线图/Tabs、历次时间轴记录卡。
   - 视听动效、主题切换与语言切换设置面板对齐。
6. **公共布局与过渡转场** (`src/frontend/components/layout/AppLayout.tsx`, `src/frontend/components/game/GamifiedTransition.tsx`, `src/frontend/components/game/PortalTransition.tsx`)
   - 侧边栏折叠/展开态、底部用户 Popover 卡片、光环与粒子转场自适应。

## 3. 验收要求
1. 亮色模式下全站满足 WCAG AA 级以上对比度，彻底杜绝任何发灰、对比度不足或不可读现象。
2. 保持 Tailwind 4 与暗色模式兼容（不破坏 `dark:` 类名）。
3. 运行 `bun test` 全套测试 100% 通过。
4. 运行 `bun run build` 构建成功无报错。
5. 启动预览 `bun run dev:frontend`（端口 5173），全流程验证通过。
