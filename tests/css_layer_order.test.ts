import { describe, expect, it } from "bun:test";
import { build } from "vite";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Extract the effective CSS cascade layer precedence order from a compiled stylesheet.
 * In CSS Cascade Level 5, a layer's priority is fixed by the first time its name
 * appears in either a `@layer a, b, c;` statement or a `@layer a { ... }` block.
 */
function extractCascadeLayerOrder(css: string): string[] {
  const order: string[] = [];
  const register = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !order.includes(trimmed)) {
      order.push(trimmed);
    }
  };

  const layerRegex = /@layer\s+([^{;]+)\s*([;{])/g;
  let match: RegExpExecArray | null;
  while ((match = layerRegex.exec(css)) !== null) {
    const names = match[1].split(",");
    for (const name of names) {
      register(name);
    }
  }
  return order;
}

describe("CSS Cascade Layer Ordering (Tailwind v4 + Astryx)", () => {
  it("orders Astryx base/theme layers above Tailwind preflight (base) and below utilities", async () => {
    const tmpOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "self-test-css-layers-"));
    try {
      await build({
        configFile: path.resolve(import.meta.dir, "../vite.config.ts"),
        logLevel: "silent",
        build: {
          outDir: tmpOutDir,
          emptyOutDir: true,
        },
      });

      const assetsDir = path.join(tmpOutDir, "assets");
      const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".css"));
      expect(cssFiles.length).toBeGreaterThan(0);

      const cssContent = cssFiles
        .map((f) => fs.readFileSync(path.join(assetsDir, f), "utf-8"))
        .join("\n");

      const layerOrder = extractCascadeLayerOrder(cssContent);

      const idxReset = layerOrder.indexOf("reset");
      const idxBase = layerOrder.indexOf("base");
      const idxAstryxBase = layerOrder.indexOf("astryx-base");
      const idxAstryxTheme = layerOrder.indexOf("astryx-theme");
      const idxUtilities = layerOrder.indexOf("utilities");

      expect(idxReset).toBeGreaterThanOrEqual(0);
      expect(idxBase).toBeGreaterThanOrEqual(0);
      expect(idxAstryxBase).toBeGreaterThanOrEqual(0);
      expect(idxAstryxTheme).toBeGreaterThanOrEqual(0);
      expect(idxUtilities).toBeGreaterThanOrEqual(0);

      // Astryx reset must be lowest; Tailwind preflight (`base`) must not override Astryx components (`astryx-base`)
      expect(idxReset).toBeLessThan(idxBase);
      expect(idxBase).toBeLessThan(idxAstryxBase);
      expect(idxAstryxBase).toBeLessThan(idxAstryxTheme);
      // Tailwind utilities must outrank Astryx component/theme layers so className overrides work
      expect(idxAstryxTheme).toBeLessThan(idxUtilities);
    } finally {
      fs.rmSync(tmpOutDir, { recursive: true, force: true });
    }
  }, 30000);
});
