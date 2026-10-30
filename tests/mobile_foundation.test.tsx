import React from "react";
import { describe, test, expect, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BottomSheet } from "../src/frontend/components/common/BottomSheet";
import { AuthModal } from "../src/frontend/components/auth/AuthModal";
import { MobileNavDrawer } from "../src/frontend/components/layout/MobileNavDrawer";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { UserProvider } from "../src/frontend/contexts/UserContext";
import * as fs from "fs";
import * as path from "path";

describe("Mobile Foundation & Universal BottomSheet Suite", () => {
  describe("1. Viewport & Safe Area Configuration Integrity", () => {
    test("src/frontend/index.html includes viewport-fit=cover and min-h-dvh", () => {
      const htmlPath = path.resolve("./src/frontend/index.html");
      const html = fs.readFileSync(htmlPath, "utf-8");
      expect(html).toContain("viewport-fit=cover");
      expect(html).toContain("min-h-dvh");
    });

    test("src/backend/server.ts inline template includes viewport-fit=cover and min-h-dvh", () => {
      const serverPath = path.resolve("./src/backend/server.ts");
      const serverCode = fs.readFileSync(serverPath, "utf-8");
      expect(serverCode).toContain("viewport-fit=cover");
      expect(serverCode).toContain("min-h-dvh");
    });

    test("src/frontend/index.css defines safe area variables and utility classes", () => {
      const cssPath = path.resolve("./src/frontend/index.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toContain("--safe-area-bottom: env(safe-area-inset-bottom");
      expect(css).toContain("safe-area-pb");
      expect(css).toContain("animate-bottom-sheet");
    });
  });

  describe("2. Universal BottomSheet Component", () => {
    test("When isOpen is false, BottomSheet returns null / empty output", () => {
      const markup = renderToStaticMarkup(
        <BottomSheet isOpen={false} onClose={() => {}}>
          <div>Content</div>
        </BottomSheet>
      );
      expect(markup).toBe("");
    });

    test("When isOpen is true, renders backdrop, dialog with aria attributes, drag handle, and title", () => {
      const markup = renderToStaticMarkup(
        <BottomSheet
          isOpen={true}
          onClose={() => {}}
          title="移动端标题"
          subtitle="辅助副标题"
          showDragHandle={true}
          showCloseButton={true}
        >
          <div id="test-content">抽屉内容测试</div>
        </BottomSheet>
      );

      // Dialog accessibility semantics
      expect(markup).toContain('role="dialog"');
      expect(markup).toContain('aria-modal="true"');
      expect(markup).toContain('aria-label="移动端标题"');

      // Drag handle pill for mobile gesture interaction
      expect(markup).toContain("cursor-grab");
      expect(markup).toContain("rounded-full");

      // Title & subtitle
      expect(markup).toContain("移动端标题");
      expect(markup).toContain("辅助副标题");

      // Content & safe area padding
      expect(markup).toContain("抽屉内容测试");
      expect(markup).toContain("pb-[max(1rem,env(safe-area-inset-bottom))]");
    });
  });

  describe("3. AuthModal BottomSheet Transformation", () => {
    test("AuthModal renders inside BottomSheet with OAuth providers and legal agreements", () => {
      const markup = renderToStaticMarkup(
        <LocaleProvider>
          <UserProvider>
            <AuthModal
              isOpen={true}
              onClose={() => {}}
              onSelectProvider={() => {}}
            />
          </UserProvider>
        </LocaleProvider>
      );

      // Semantics & BottomSheet container
      expect(markup).toContain('role="dialog"');
      expect(markup).toContain("cursor-grab");

      // Providers
      expect(markup).toContain("GitHub");
      expect(markup).toContain("Linux Do");
      expect(markup).toContain("Google");

      // Legal links
      expect(markup).toContain("/terms");
      expect(markup).toContain("/privacy");
    });
  });

  describe("4. MobileNavDrawer Component", () => {
    test("MobileNavDrawer renders navigation routes, theme toggle, and language selector", () => {
      const markup = renderToStaticMarkup(
        <LocaleProvider>
          <UserProvider>
            <MobileNavDrawer
              isOpen={true}
              onClose={() => {}}
              onNavigate={() => {}}
              extraLinks={[
                { label: "三步看懂玩法", href: "#how-it-works" },
                { label: "八大心智化身画卷", href: "#archetypes" },
              ]}
            />
          </UserProvider>
        </LocaleProvider>
      );

      // Structure
      expect(markup).toContain('role="dialog"');
      expect(markup).toContain("官网首页");
      expect(markup).toContain("认知评测");
      expect(markup).toContain("三步看懂玩法");
      expect(markup).toContain("八大心智化身画卷");

      // Preferences
      expect(markup).toContain("视觉主题模式");
      expect(markup).toContain("界面语言");
      expect(markup).toContain("中文");
      expect(markup).toContain("English");
      expect(markup).toContain("视听与动效");
    });
  });
});
