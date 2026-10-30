import React from "react";
import { describe, test, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GuestLandingPage } from "../src/frontend/pages/GuestLandingPage";
import { ArchetypeStickyScrollBand } from "../src/frontend/components/landing/ArchetypeStickyScrollBand";
import { GuestTrajectoryShowcase } from "../src/frontend/components/landing/GuestTrajectoryShowcase";
import { GuestGalaxyHero } from "../src/frontend/components/landing/GuestGalaxyHero";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { UserProvider } from "../src/frontend/contexts/UserContext";

describe("Task 02: 游客落地页移动端体验重构 (Guest Landing Mobile View)", () => {
  describe("1. GuestLandingPage Hero CTA & Touch Area Standard", () => {
    test("Renders Hero CTA button with min-h-[48px] and testid", () => {
      const markup = renderToStaticMarkup(
        <LocaleProvider>
          <UserProvider>
            <GuestLandingPage onNavigate={() => {}} />
          </UserProvider>
        </LocaleProvider>
      );

      // Hero Start Test CTA button
      expect(markup).toContain('data-testid="hero-start-test-btn"');
      expect(markup).toContain("min-h-[48px]");
      expect(markup).toContain("立即开启 5 分钟直觉闯关");

      // Header controls touch area >= 44px
      expect(markup).toContain('data-testid="header-signin-btn"');
      expect(markup).toContain("min-h-[44px]");
      expect(markup).toContain("w-11 h-11 min-w-[44px] min-h-[44px]"); // Hamburger button

      // Interactive demo buttons in Section 2 (How It Works)
      expect(markup).toContain("全额强攻");
      expect(markup).toContain("稳健防守");
      expect(markup).toContain("翻开「草船借箭」线索锦囊");

      // Footer links and buttons with >= 44x44px touch targets
      expect(markup).toContain("min-h-[44px] min-w-[44px]");
    });
  });

  describe("2. ArchetypeStickyScrollBand Touch-Friendly Controls", () => {
    test("Renders touch-pan-y container, 44px chevron buttons, and 44px archetype pills", () => {
      const markup = renderToStaticMarkup(
        <LocaleProvider>
          <ArchetypeStickyScrollBand onStartTest={() => {}} />
        </LocaleProvider>
      );

      // touch-pan-y for smooth vertical scrolling
      expect(markup).toContain("touch-pan-y");

      // Navigation chevrons >= 44x44px
      expect(markup).toContain('aria-label="上一尊化身"');
      expect(markup).toContain('aria-label="下一尊化身"');
      expect(markup).toContain("w-11 h-11 min-w-[44px] min-h-[44px]");

      // Active card CTA button
      expect(markup).toContain("min-h-[44px]");
      expect(markup).toContain("测测你是不是");

      // Archetype pill buttons have min-h-[44px]
      expect(markup).toContain("min-h-[44px] px-3.5 py-2");
    });
  });

  describe("3. GuestTrajectoryShowcase Touch & Gesture Support", () => {
    test("Renders trajectory chart with touch-pan-y, 44px node hit radius, and 44px step buttons", () => {
      const markup = renderToStaticMarkup(
        <LocaleProvider>
          <GuestTrajectoryShowcase onSignIn={() => {}} onStartTest={() => {}} />
        </LocaleProvider>
      );

      // Touch-pan-y for smooth vertical scrolling while allowing horizontal swipe
      expect(markup).toContain("touch-pan-y");

      // Node hit circle radius 22px (44px diameter)
      expect(markup).toContain('r="22"');

      // 5 quick-switch step buttons have 44x44px touch targets
      expect(markup).toContain('aria-label="Step #1"');
      expect(markup).toContain('aria-label="Step #2"');
      expect(markup).toContain("w-11 h-11 min-w-[44px] min-h-[44px]");

      // Bottom CTA buttons have min-h-[48px]
      expect(markup).toContain("min-h-[48px]");
      expect(markup).toContain("立即登录 · 开启我的心智宇宙");
      expect(markup).toContain("先测一次");
    });
  });

  describe("4. GuestGalaxyHero Mobile Touch Handling", () => {
    test("Renders touch-pan-y container and enlarged touch hit areas for planets and octants", () => {
      const markup = renderToStaticMarkup(<GuestGalaxyHero />);

      // touch-pan-y container
      expect(markup).toContain("touch-pan-y");

      // Octant badges touch target >= 44px height
      expect(markup).toContain("height=\"44\"");
    });
  });
});
