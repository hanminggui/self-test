import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { GamifiedTransition } from "../src/frontend/components/game/GamifiedTransition";
import { PortalTransition } from "../src/frontend/components/game/PortalTransition";
import { GameEffectsProvider } from "../src/frontend/contexts/GameEffectsContext";

describe("Seam 3: Gamified Transition & Portal Transition Components", () => {
  it("当 active 为 false 时，组件不渲染任何可见内容", () => {
    const html = renderToString(
      <GamifiedTransition active={false} variant="portal" />
    );
    expect(html).toBe("");
  });

  it("当 active 为 true 时，正确渲染包含无障碍 role 与 aria-live 的结构", () => {
    const html = renderToString(
      <GamifiedTransition
        active={true}
        variant="portal"
        title="开启认知试炼"
        subtitle="正在锚定意识流形"
      />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("开启认知试炼");
    expect(html).toContain("正在锚定意识流形");
  });

  it("PortalTransition 渲染核心法阵星环与能量枢纽", () => {
    const html = renderToString(
      <PortalTransition size="md" />
    );
    expect(html).toContain("portal-core");
    expect(html).toContain("portal-ring");
  });

  it("settlement 变体能够展示算力推演多阶段里程碑步进", () => {
    const steps = [
      "一阶作答响应聚合",
      "二阶置信博弈推演 (Meta-d')",
      "八大认知画像对齐",
      "神级画像铸成揭晓",
    ];
    const html = renderToString(
      <GamifiedTransition
        active={true}
        variant="settlement"
        title="认知流形高维推演"
        steps={steps}
        currentStepIndex={1}
      />
    );
    expect(html).toContain("认知流形高维推演");
    expect(html).toContain("二阶置信博弈推演");
  });

  it("level_shift 变体正确展示阶梯升降阶自适应视觉反馈", () => {
    const htmlUp = renderToString(
      <GamifiedTransition
        active={true}
        variant="level_shift"
        direction="up"
        level={4}
      />
    );
    expect(htmlUp).toContain("难度跃迁");

    const htmlDown = renderToString(
      <GamifiedTransition
        active={true}
        variant="level_shift"
        direction="down"
        level={2}
      />
    );
    expect(htmlDown).toContain("阶梯自适应校准");
  });
});
