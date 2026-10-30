# 任务目标：实现 Issue #44 暗色模式全页面深度适配与细节打磨

## 1. 方案核心定位与设计规范（方案 B：Acid Cyber Editorial 赛博先锋酸性）
- **基调与色彩**：
  - 极纯冷曜黑底色（`#08080C` / `#0E0E16`）与几何阵列网格底纹。
  - 文本采用极高对比纯白（`#FFFFFF`）与反色白底黑字，坚决杜绝低对比度暗灰字。
  - 标志性超高饱和酸性撞色：荧光酸性青黄（`#CCFF00` / `#A3E635`）、暴烈霓红（`#FF3366`）、电光钴蓝（`#38BDF8` / `#2563EB`）。
- **材质与排版风格**：
  - 工业粗野主义（Neo-Brutalism）先锋杂志排版。
  - 锐利边框（`2px solid #FFFFFF/20` 或荧光边框 `border-[#CCFF00]`）。
  - 硬朗纯色投影（`dark:shadow-[4px_4px_0px_#CCFF00]` 或 `dark:shadow-[4px_4px_0px_#38BDF8]`）。
  - 醒目几何网格、斜向胶囊标签与高对比荧光反色块。

## 2. 深度适配与细节打磨清单
1. **首页 Landing Page** (`src/frontend/pages/GuestLandingPage.tsx`, `src/frontend/components/landing/GuestTrajectoryShowcase.tsx`)
   - Hero 横幅卡片、三步玩法卡片、4D 认知轨迹演示组件、底部心智宇宙认领卡与页脚在暗夜下的先锋酸性材质对齐。
2. **测评核心流程** (`src/frontend/App.tsx`)
   - 欢迎门禁与规模设置面板（高反差纯白文本与酸性边框）。
   - 题目 2D 矩阵符号网格高对比度渲染、多行题干推导区。
   - 选项按键状态：默认态、Hover 态、选中态（Selected）与激活态（Active）的高反差荧光态。
   - 决断押注按键（全额强攻 vs 稳健防守）的荧光块面切换与立体按压手感。
   - 测评战报与名片：专属画像名片、四大正向特技卡、赋能评语与指标雷达图。
3. **分享页与海报系统** (`src/frontend/pages/SharePage.tsx`, `src/frontend/components/share/PosterModal.tsx`)
   - 4 维量化认知指标（d', M-ratio, Bias, Accuracy）卡片酸性边框与荧光数值。
   - 认知流派共鸣卡片、演进指南及海报弹窗底板与导出 Canvas 渲染通道。
4. **认知资产图鉴** (`src/frontend/pages/AssetsPage.tsx`)
   - 8 大认知化身卡片在已解锁与未解锁状态下的配色打磨，确保纯白/酸性高亮字，杜绝暗色文字过暗或发黑（Black on Dark）。
   - 顶部 Codex 统计徽章与筛选标签栏。
5. **个人中心与偏好设置** (`src/frontend/ProfileDashboard.tsx`, `src/frontend/components/profile/ProfileSettings.tsx`)
   - 6 大 KPI 卡片、4D 认知流形轨迹空间面板、四维演化趋势折线图/Tabs、历次时间轴记录卡。
   - 视听动效、主题切换与语言切换设置面板对齐。
6. **公共布局与过渡转场** (`src/frontend/components/layout/AppLayout.tsx`, `src/frontend/components/game/GamifiedTransition.tsx`, `src/frontend/components/game/PortalTransition.tsx`)
   - 侧边栏折叠/展开态、底部用户 Popover 卡片、赛博霓虹星门光环自适应。
7. **开发端口配置** (`vite.config.ts`)
   - 将本地预览端口配置为 `5174`，避免与亮色模式默认端口 5173 冲突。

## 3. 验收要求
1. 暗色模式下全站满足 WCAG AA 级以上高对比度，彻底杜绝文字发灰、深字在暗底（Black on Dark）或脏发灰毛玻璃。
2. 保持 Tailwind 4 与亮色模式兼容（使用 `dark:` 前缀实现，不破坏亮色模式）。
3. 运行 `bun test` 全套测试 100% 通过。
4. 运行 `bun run build` 构建成功无报错。
5. 启动预览 `bun run dev:frontend`（端口 5174），全流程验证通过。
