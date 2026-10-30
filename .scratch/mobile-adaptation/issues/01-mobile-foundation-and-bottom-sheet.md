# 01: 全局移动端基底与通用抽屉容器 (Foundation & Mobile BottomSheet Layout)

**What to build:**
建立移动端基础设施体系：全局动态视口高度支持（100dvh）、iPhone 底部安全区内边距变量注入、自底向上的通用 BottomSheet 模态抽屉容器，并将移动端顶部导航栏与认证登录弹窗重构为抽屉形态，提供所有下游工单依赖的通用样式、组件与自动化移动端无头验收命令。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 全局布局根节点支持 `min-h-dvh` 与 `pb-[env(safe-area-inset-bottom)]`，彻底解决动态地址栏与手势条遮挡。
- [ ] 顶部导航栏在移动端视口下提供手势/点击展开的抽屉菜单，支持无阻碍切换语言、主题及退出登录。
- [ ] 封装通用 `BottomSheet` 模态容器，在移动端自动切换为自底向上的滑动抽屉，带有手势拖拽关闭条与背景遮罩。
- [ ] 将登录认证弹窗（AuthModal）改造为移动端 BottomSheet 模式，防止软键盘弹出时顶飞布局或遮挡提交按钮。
- [ ] 配置并验证 `agent-browser` 移动端无头自动化验收命令，确保在 `390x844` 视口下页面无横向溢出。
