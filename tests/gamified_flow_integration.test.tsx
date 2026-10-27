import { describe, expect, it, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { GameEffectsProvider } from "../src/frontend/contexts/GameEffectsContext";
import { GameQuickControls } from "../src/frontend/components/game/GameQuickControls";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { UserProvider } from "../src/frontend/contexts/UserContext";
import { ProfileSettings } from "../src/frontend/components/profile/ProfileSettings";
import App from "../src/frontend/App";

describe("Seam 4 & 5: Full Gamified Network Flow & Settings Integration", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
  });

  it("GameQuickControls 正常渲染声音与动效快捷控制按钮与 ARIA 标签", () => {
    const html = renderToString(
      <LocaleProvider>
        <GameEffectsProvider>
          <GameQuickControls />
        </GameEffectsProvider>
      </LocaleProvider>
    );

    expect(html).toContain("aria-label");
    expect(html).toContain("AUDIO");
    expect(html).toContain("MOTION");
  });

  it("ProfileSettings 包含游戏化视听与无障碍偏好配置卡片 (动效、音效、性能模式)", () => {
    const html = renderToString(
      <LocaleProvider>
        <UserProvider>
          <GameEffectsProvider>
            <ProfileSettings />
          </GameEffectsProvider>
        </UserProvider>
      </LocaleProvider>
    );

    expect(html).toContain("交互动效与声学体验");
    expect(html).toContain("过渡动效强度");
    expect(html).toContain("全量流光");
    expect(html).toContain("极简减弱");
    expect(html).toContain("交互音效 (Web Audio)");
    expect(html).toContain("开启音效");
    expect(html).toContain("静音模式");
    expect(html).toContain("渲染性能偏好");
    expect(html).toContain("高清全效");
    expect(html).toContain("节能降级");
  });

  it("App 顶栏成功接入快捷音效动效控制组件且初始欢迎页完好", () => {
    const html = renderToString(
      <LocaleProvider>
        <UserProvider>
          <GameEffectsProvider>
            <App />
          </GameEffectsProvider>
        </UserProvider>
      </LocaleProvider>
    );

    // 确认 App 包含 GameQuickControls 结构
    expect(html).toContain("AUDIO");
    expect(html).toContain("MOTION");
    // 确认欢迎页核心交互可用
    expect(html).toContain("开启探索旅程");
  });
});
