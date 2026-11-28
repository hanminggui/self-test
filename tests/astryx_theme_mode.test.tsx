import React from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "../src/frontend/contexts/ThemeContext";
import { AstryxThemeBridge } from "../src/frontend/components/common/AstryxThemeBridge";
import { AuthModal } from "../src/frontend/components/auth/AuthModal";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { UserProvider } from "../src/frontend/contexts/UserContext";

describe("AstryxThemeBridge Dark Mode Sync", () => {
  const origWindow = (globalThis as any).window;
  const origLocalStorage = (globalThis as any).localStorage;

  afterEach(() => {
    (globalThis as any).window = origWindow;
    (globalThis as any).localStorage = origLocalStorage;
  });

  function renderWithStoredTheme(mode: "light" | "dark"): string {
    const store: Record<string, string> = { mind_star_map_theme: mode };
    const ls = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    };
    (globalThis as any).localStorage = ls;
    (globalThis as any).window = {
      localStorage: ls,
      matchMedia: () => ({ matches: false }),
    };

    return renderToStaticMarkup(
      <ThemeProvider>
        <AstryxThemeBridge>
          <LocaleProvider>
            <UserProvider>
              <AuthModal isOpen={true} onClose={() => {}} onSelectProvider={() => {}} />
            </UserProvider>
          </LocaleProvider>
        </AstryxThemeBridge>
      </ThemeProvider>
    );
  }

  it("syncs ThemeProvider dark mode to AstryxTheme (data-theme=dark, never system light-dark)", () => {
    const html = renderWithStoredTheme("dark");
    expect(html).toContain('data-astryx-theme="neutral"');
    expect(html).toContain('data-theme="dark"');
    // xntwwlm = color-scheme: dark; x108lcm5 = color-scheme: light dark (system fallback)
    expect(html).toContain("xntwwlm");
    expect(html).not.toContain("x108lcm5");
    expect(html).toContain("astryx-dialog");
  });

  it("syncs ThemeProvider light mode to AstryxTheme (data-theme=light)", () => {
    const html = renderWithStoredTheme("light");
    expect(html).toContain('data-astryx-theme="neutral"');
    expect(html).toContain('data-theme="light"');
    expect(html).toContain("x19aimcq");
    expect(html).not.toContain("x108lcm5");
  });
});
