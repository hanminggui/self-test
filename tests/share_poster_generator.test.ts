import { describe, expect, it } from "bun:test";
import {
  formatCognitiveMetric,
  formatBiasMetric,
  generatePosterQrCodeSvg,
  generatePosterQrCodeDataUrl,
  type PosterShareData,
} from "../src/frontend/components/share/posterGenerator";
import { CognitiveArchetype } from "../src/backend/models";

describe("Chinese Oriental Mythic Share Poster: Generator & Formatting", () => {
  it("formatCognitiveMetric 格式化各类浮点与边界指标 (NaN, 无穷大, 极值)", () => {
    expect(formatCognitiveMetric(2.3456, 2)).toBe("2.35");
    expect(formatCognitiveMetric(0.0001, 2)).toBe("0.00");
    expect(formatCognitiveMetric(1, 2)).toBe("1.00");
    expect(formatCognitiveMetric(undefined, 2)).toBe("--");
    expect(formatCognitiveMetric(NaN, 2)).toBe("--");
    expect(formatCognitiveMetric(Infinity, 2)).toBe("9.99+");
    expect(formatCognitiveMetric(-Infinity, 2)).toBe("-9.99");
  });

  it("formatBiasMetric 带有明确的正负号与中性 0 标志", () => {
    expect(formatBiasMetric(0.123)).toBe("+0.12");
    expect(formatBiasMetric(-0.456)).toBe("-0.46");
    expect(formatBiasMetric(0.00)).toBe("±0.00");
    expect(formatBiasMetric(undefined)).toBe("--");
  });

  it("generatePosterQrCodeSvg 生成合法的 SVG 矢量字符串", async () => {
    const url = "http://localhost:8000/?ref=poster";
    const svg = await generatePosterQrCodeSvg(url);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("viewBox");
  });

  it("generatePosterQrCodeDataUrl 生成合法的 base64 PNG dataUrl", async () => {
    const url = "http://localhost:8000/?ref=poster";
    const dataUrl = await generatePosterQrCodeDataUrl(url);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
