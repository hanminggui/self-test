import { describe, expect, it } from "bun:test";
import {
  generateDuelShareText,
  copyDuelShareTextToClipboard,
  renderTwinStarsPosterToCanvas,
  type DuelPosterData,
} from "../src/frontend/components/share/duelPosterGenerator";
import { CognitiveArchetype } from "../src/backend/models";

describe("Seam 3: Cognitive Twin Duel Joint Poster Generator", () => {
  const sampleDuelData: DuelPosterData = {
    participantA: {
      sessionId: "sess_alice_001",
      subjectName: "Alice",
      archetype: CognitiveArchetype.SOVEREIGN,
      roleTitle: "人形外挂",
      praiseTagline: "你开了 · 诗人握持",
      totemOrOrder: "九天应龙",
      aphorism: "九重御天 · 算力降维",
    },
    participantB: {
      sessionId: "sess_bob_002",
      subjectName: "Bob",
      archetype: CognitiveArchetype.ADAPTIVE_LEARNER,
      roleTitle: "灵窍天开",
      praiseTagline: "心开一窍 · 融会贯通",
      totemOrOrder: "混元鲲鹏",
      aphorism: "心开一窍 · 融会贯通",
    },
    comparison: {
      euclidean_distance: 0.18,
      similarity_percentage: 91,
      cognitive_alignment_score: 91,
      complementary_index: 96,
      synergy_title: "宗师火种 · 灵感飞跃",
      pairing_dynamics: "人形外挂的顶层推演构架与灵窍天开的高速吸收悟性完美结合。",
      mutual_strengths: [
        "顶级算力指引与敏锐悟性吸收的无缝咬合",
        "深邃逻辑框架与机敏纠错反应同频共振",
      ],
      mutual_differences: [
        "外挂倚重既有逻辑严密性，灵窍重在动态吸收进化",
      ],
    },
    locale: "zh-CN",
    entryUrl: "http://localhost:8000/duel/sess_alice_001/sess_bob_002",
  };

  it("generateDuelShareText produces forum-ready viral comparison text in Chinese", () => {
    const text = generateDuelShareText(sampleDuelData);
    expect(text).toContain("双星认知对决");
    expect(text).toContain("Alice");
    expect(text).toContain("Bob");
    expect(text).toContain("人形外挂");
    expect(text).toContain("灵窍天开");
    expect(text).toContain("91%");
    expect(text).toContain("宗师火种 · 灵感飞跃");
    expect(text).toContain("互补指数");
    expect(text).toContain("96%");
    expect(text).toContain("/duel/sess_alice_001/sess_bob_002");
  });

  it("generateDuelShareText produces arcane order styled text in English", () => {
    const enData: DuelPosterData = {
      ...sampleDuelData,
      locale: "en-US",
      participantA: {
        ...sampleDuelData.participantA,
        roleTitle: "The Grand Archmage",
        totemOrOrder: "Order of the Grand Archmage",
        aphorism: "Sight Beyond the Veil",
      },
      participantB: {
        ...sampleDuelData.participantB,
        roleTitle: "The Adaptive Learner",
        totemOrOrder: "Order of the Dawn Seeker",
        aphorism: "Infinite Horizon",
      },
      comparison: {
        ...sampleDuelData.comparison,
        synergy_title: "Archmage & Luminary · Ascendant Leap",
        pairing_dynamics: "High deductive architecture meets infinite evolutionary receptivity.",
        mutual_strengths: ["Masterful tactical guidance merged with acute self-learning"],
        mutual_differences: ["The Sovereign relies on axiomatic depth"],
      },
    };

    const text = generateDuelShareText(enData);
    expect(text).toContain("Twin Stars Cognitive Duel");
    expect(text).toContain("【Alice】[The Grand Archmage]");
    expect(text).toContain("【Bob】[The Adaptive Learner]");
    expect(text).toContain("91% Alignment");
    expect(text).toContain("Archmage & Luminary");
    expect(text).toContain("Complementary Index: 96%");
  });

  it("copyDuelShareTextToClipboard writes text to navigator clipboard", async () => {
    let captured = "";
    (globalThis as any).navigator = {
      clipboard: {
        writeText: async (str: string) => {
          captured = str;
        },
      },
    };

    const success = await copyDuelShareTextToClipboard(sampleDuelData);
    expect(success).toBe(true);
    expect(captured).toContain("双星认知对决");
  });

  it("renderTwinStarsPosterToCanvas renders dual-star poster with side-by-side elements", async () => {
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
      closePath: () => drawCalls.push("closePath"),
      moveTo: () => drawCalls.push("moveTo"),
      lineTo: () => drawCalls.push("lineTo"),
      arc: () => drawCalls.push("arc"),
      fill: () => drawCalls.push("fill"),
      stroke: () => drawCalls.push("stroke"),
      strokeRect: () => drawCalls.push("strokeRect"),
      fillText: (text: string) => drawCalls.push(`fillText:${text}`),
      measureText: (text: string) => ({ width: text.length * 10 }),
      drawImage: () => drawCalls.push("drawImage"),
      clip: () => drawCalls.push("clip"),
      roundRect: () => drawCalls.push("roundRect"),
      setLineDash: () => {},
    };

    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => mockContext,
            toBlob: (cb: any) => cb(new Blob(["mock"], { type: "image/png" })),
          };
        }
        return {};
      },
    };

    const canvas = await renderTwinStarsPosterToCanvas(sampleDuelData, 1);
    expect(canvas).toBeDefined();
    expect(drawCalls.length).toBeGreaterThan(20);
    // Verified that both participants' names are rendered
    expect(drawCalls.some((c) => c.includes("Alice"))).toBe(true);
    expect(drawCalls.some((c) => c.includes("Bob"))).toBe(true);
  });
});
