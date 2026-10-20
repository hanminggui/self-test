import { describe, expect, it } from "bun:test";
import {
  formatCognitiveMetric,
  formatBiasMetric,
  formatMRatioMetric,
  generatePosterQrCodeSvg,
  generatePosterQrCodeDataUrl,
  copyShareTextToClipboard,
  renderPosterToCanvas,
  type PosterShareData,
} from "../src/frontend/components/share/posterGenerator";
import { CognitiveArchetype } from "../src/backend/models";

describe("Unified Share Suite: Poster Generator Engine & Text Purging", () => {
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

  it("formatMRatioMetric 格式化倍率", () => {
    expect(formatMRatioMetric(0.85)).toBe("0.85");
    expect(formatMRatioMetric(undefined)).toBe("--");
    expect(formatMRatioMetric(Infinity)).toBe("9.99+");
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

  it("Issue #25: copyShareTextToClipboard 中文分享文案敏感数据彻底净化与 4 项专属技能呈现", async () => {
    let capturedText = "";
    (globalThis as any).navigator = {
      clipboard: {
        writeText: async (text: string) => {
          capturedText = text;
          return Promise.resolve();
        },
      },
    };

    const data: PosterShareData = {
      subjectName: "伏羲042",
      archetype: CognitiveArchetype.SOVEREIGN,
      roleTitle: "人形外挂",
      praiseTagline: "你开了 · 诗人握持",
      strengthTags: ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽"],
      empoweringFeedback: "您展现出令人叹为观止的‘人形外挂’级顶尖素养！",
      locale: "zh-CN",
      metrics: {
        d_prime: 2.45,
        meta_d_prime: 2.15,
        m_ratio: 0.88,
        calibration_bias: -0.05,
      },
      entryUrl: "http://localhost:8000/",
    };

    const success = await copyShareTextToClipboard(data);
    expect(success).toBe(true);

    // 核心信息与特技
    expect(capturedText).toContain("【人形外挂】");
    expect(capturedText).toContain("“你开了 · 诗人握持”");
    expect(capturedText).toContain("探索者：伏羲042");
    expect(capturedText).toContain("专属认知特技：");
    expect(capturedText).toContain("算力透视");
    expect(capturedText).toContain("精准制导");
    expect(capturedText).toContain("知行律动");
    expect(capturedText).toContain("核心战略指挥官");
    expect(capturedText).toContain("赋能启示：");

    // 绝对无敏感数据与内部代码泄漏
    expect(capturedText).not.toContain("Q1-CAL");
    expect(capturedText).not.toContain("2.45");
    expect(capturedText).not.toContain("d'");
    expect(capturedText).not.toContain("Meta-d'");
    expect(capturedText).not.toContain("M_ratio");
    expect(capturedText).not.toContain("Bias");
    expect(capturedText).not.toContain("4D 认知流形特征");

    // 绝对无八卦与卦爻泄露
    expect(capturedText).not.toContain("☰");
    expect(capturedText).not.toContain("卦");
    expect(capturedText).not.toContain("周易");
    expect(capturedText).not.toContain("象辞");
  });

  it("Issue #27: copyShareTextToClipboard 英文状态输出纯正 Western Arcane 秘法分享文案", async () => {
    let capturedText = "";
    (globalThis as any).navigator = {
      clipboard: {
        writeText: async (text: string) => {
          capturedText = text;
          return Promise.resolve();
        },
      },
    };

    const data: PosterShareData = {
      subjectName: "Arthur042",
      archetype: CognitiveArchetype.SOVEREIGN,
      locale: "en-US",
      entryUrl: "http://localhost:8000/",
    };

    const success = await copyShareTextToClipboard(data);
    expect(success).toBe(true);

    expect(capturedText).toContain("[The Grand Archmage]");
    expect(capturedText).toContain("Explorer: Arthur042");
    expect(capturedText).toContain("Unique Cognitive Skills:");
    expect(capturedText).toContain("Eye of Aether");
    expect(capturedText).toContain("Precision Incantation");
    expect(capturedText).toContain("Arcane Coherence");
    expect(capturedText).toContain("Grand Strategist Bond");
    expect(capturedText).toContain("Empowering Insight:");

    // 绝无中文遗留与敏感指标
    expect(capturedText).not.toContain("人形外挂");
    expect(capturedText).not.toContain("Q1-CAL");
    expect(capturedText).not.toContain("d'");
  });

  it("Issue #26: renderPosterToCanvas 具备完整的暗金多层渐变、星尘粒子与无敏感数据渲染管道", async () => {
    // 创建轻量 Mock Canvas Context 验证渲染流程无崩溃且参数严密
    const drawCalls: string[] = [];
    const mockContext: any = {
      scale: () => drawCalls.push("scale"),
      fillRect: () => drawCalls.push("fillRect"),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      save: () => drawCalls.push("save"),
      restore: () => drawCalls.push("restore"),
      beginPath: () => drawCalls.push("beginPath"),
      arc: () => drawCalls.push("arc"),
      fill: () => drawCalls.push("fill"),
      stroke: () => drawCalls.push("stroke"),
      moveTo: () => drawCalls.push("moveTo"),
      lineTo: () => drawCalls.push("lineTo"),
      quadraticCurveTo: () => drawCalls.push("quadraticCurveTo"),
      closePath: () => drawCalls.push("closePath"),
      strokeRect: () => drawCalls.push("strokeRect"),
      fillText: (text: string) => drawCalls.push(`fillText:${text}`),
      measureText: (text: string) => ({ width: text.length * 10 }),
      roundRect: () => drawCalls.push("roundRect"),
      drawImage: () => drawCalls.push("drawImage"),
    };

    const mockCanvas: any = {
      width: 1080,
      height: 1920,
      getContext: () => mockContext,
    };

    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      },
    };

    // 模拟 Image 对象
    (globalThis as any).Image = class {
      src = "";
      onload = () => {};
      constructor() {
        setTimeout(() => this.onload(), 10);
      }
    };

    const canvas = await renderPosterToCanvas({
      subjectName: "伏羲042",
      archetype: CognitiveArchetype.SOVEREIGN,
      entryUrl: "http://localhost:8000/",
    });

    expect(canvas).toBeDefined();
    expect(drawCalls).toContain("scale");
    expect(drawCalls).toContain("fillRect");
    expect(drawCalls).toContain("arc");

    // 验证文字绘制包含真实昵称、画像标题、四大特技，但绝对不含 Q1-CAL 或 d'
    const renderedTexts = drawCalls.filter((c) => c.startsWith("fillText:")).map((c) => c.slice(9));
    expect(renderedTexts.some((t) => t.includes("人形外挂"))).toBe(true);
    expect(renderedTexts.some((t) => t.includes("探索者 · 伏羲042"))).toBe(true);
    expect(renderedTexts.some((t) => t.includes("算力透视"))).toBe(true);
    expect(renderedTexts.some((t) => t.includes("精准制导"))).toBe(true);
    expect(renderedTexts.some((t) => t.includes("知行律动"))).toBe(true);
    expect(renderedTexts.some((t) => t.includes("核心战略指挥官"))).toBe(true);

    // 绝对无敏感数据与卦象
    expect(renderedTexts.some((t) => t.includes("Q1-CAL"))).toBe(false);
    expect(renderedTexts.some((t) => t.includes("d'"))).toBe(false);
    expect(renderedTexts.some((t) => t.includes("Meta-d'"))).toBe(false);
    expect(renderedTexts.some((t) => t.includes("☰"))).toBe(false);
  });
});
