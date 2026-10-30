# 任务目标：实现 Issue #44 亮暗双主题融合（多巴胺轻萌 + 先锋酸性）与布局优化

## 1. 方案核心定位与设计规范（双主题融合）
- **亮色模式（方案 C：Playful Dopamine 多巴胺轻萌）**：
  - 奶油暖米底色（`#FFFDF8` / `#FFFBEB`）与暖色点阵背景。
  - 文本采用深暖褐黑（`#1C1917` / `#292524` / `text-stone-950`），严禁低对比度浅灰字。
  - 活力多巴胺糖果点缀：芝士黄（`#FBBF24`）、蜜桃橘粉（`#FB7185`）、开心果绿（`#10B981`）、苏打蓝（`#38BDF8`）。
  - 实体厚度下沉阴影（`shadow-[0_4px_0_#1c1917]` 或 `shadow-[0_5px_0_#1c1917]`）与 `border-[2.5px] border-stone-900`。
  - 果冻触感微交互（`hover:-translate-y-0.5 active:translate-y-1.5 active:shadow-none`）。
- **暗色模式（方案 B：Acid Cyber Editorial 赛博先锋酸性）**：
  - 极纯冷曜黑底色（`#08080C` / `#0E0E16`）与几何阵列网格底纹。
  - 文本采用极高对比纯白（`#FFFFFF`）与反色白底黑字，坚决杜绝低对比度暗灰字。
  - 标志性超高饱和酸性撞色：荧光酸性青黄（`#CCFF00` / `#A3E635`）、暴烈霓红（`#FF3366`）、电光钴蓝（`#38BDF8` / `#2563EB`）。
  - 锐利边框（`dark:border-white/20` 或荧光边框 `dark:border-[#CCFF00]`）。
  - 硬朗纯色投影（`dark:shadow-[4px_4px_0px_#CCFF00]` 或 `dark:shadow-[4px_4px_0px_#38BDF8]`）。

## 2. 深度适配与合并清单
1. **公共组件与图表**
   - 独立模块化四维认知雷达图组件 `src/frontend/components/game/CognitiveMetricsRadar.tsx`。
   - 兼容亮色实体厚度与暗色荧光酸性投影。
2. **测评核心流程与战报** (`src/frontend/App.tsx`)
   - 融合多巴胺实体按键与赛博酸性暗夜荧光反馈。
   - 题目矩阵符号高反差对比度。
3. **主页与展示组件** (`src/frontend/pages/GuestLandingPage.tsx`, `src/frontend/components/landing/GuestTrajectoryShowcase.tsx`)
   - 统一卡片边框、底色及 SVG 曲线的高对比度自适应。
4. **分享系统与资产图鉴** (`src/frontend/pages/SharePage.tsx`, `src/frontend/pages/AssetsPage.tsx`, `src/frontend/components/share/PosterModal.tsx`)
   - 移除 `/assets` 独立页头横幅，突出核心图鉴与流派特技卡。
5. **个人中心与偏好设置** (`src/frontend/ProfileDashboard.tsx`, `src/frontend/pages/SettingsPage.tsx`, `src/frontend/components/profile/ProfileSettings.tsx`)
   - 移除 `/history` 顶层冗余页头卡片。
   - 移除 `/settings` 顶层冗余页头栏。
6. **公共侧边栏与布局** (`src/frontend/components/layout/AppLayout.tsx`)
   - 适配折叠/展开、自适应高对比色彩。

## 3. 验收要求
1. 亮色模式与暗色模式均满足 WCAG AA 级以上高对比度。
2. 运行 `bun test` 全套测试 100% 通过。
3. 运行 `bun run build` 构建成功无报错。
4. `/history`, `/assets`, `/settings` 页面页头已彻底去除。
