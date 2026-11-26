import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  computeAestheticParameters,
  generateAestheticSvg,
  pointsToSmoothCubicPath,
  reportToAestheticSession,
} from "../src/frontend/utils/aestheticEngine";
import { CognitiveManifoldSigil } from "../src/frontend/components/aesthetic/CognitiveManifoldSigil";
import { AmbientManifoldBackdrop } from "../src/frontend/components/aesthetic/AmbientManifoldBackdrop";
import { ThemeProvider } from "../src/frontend/contexts/ThemeContext";

const mockReport = {
  session_id: "sess_aesthetic_01",
  subject_name: "TestExplorer",
  subject_type: "HUMAN",
  quadrant_code: "Q1-CAL",
  created_at: "2026-11-25T15:00:00Z",
  total_trials: 6,
  final_score: 48,
  metrics: {
    d_prime: 2.1,
    meta_d_prime: 1.9,
    m_ratio: 0.9,
    calibration_bias: 0.05,
    brier_score: 0.15,
    first_order_accuracy: 0.83,
    second_order_accuracy: 0.86,
    reversals_count: 2,
    ive: 0.72,
    coachability_index: 70,
  },
  records: [
    { trial_index: 1, is_warmup: true, difficulty_level: 0.3, is_correct_first_order: true, is_correct_final: true, action: "SAFE_BET", confidence_level: 0.6, hints_unlocked: 0, score_delta: 3, duration_ms: 1200 },
    { trial_index: 2, is_warmup: false, difficulty_level: 0.45, is_correct_first_order: true, is_correct_final: true, action: "HIGH_BET", confidence_level: 0.85, hints_unlocked: 0, score_delta: 10, duration_ms: 1500 },
    { trial_index: 3, is_warmup: false, difficulty_level: 0.62, is_correct_first_order: false, is_correct_final: true, action: "SAFE_BET", confidence_level: 0.55, hints_unlocked: 1, score_delta: 2, duration_ms: 2800 },
    { trial_index: 4, is_warmup: false, difficulty_level: 0.78, is_correct_first_order: false, is_correct_final: false, action: "SAFE_BET", confidence_level: 0.4, hints_unlocked: 0, score_delta: 0, duration_ms: 2100 },
    { trial_index: 5, is_warmup: false, difficulty_level: 0.70, is_correct_first_order: true, is_correct_final: true, action: "HIGH_BET", confidence_level: 0.9, hints_unlocked: 0, score_delta: 10, duration_ms: 1300 },
    { trial_index: 6, is_warmup: false, difficulty_level: 0.82, is_correct_first_order: true, is_correct_final: true, action: "HIGH_BET", confidence_level: 0.88, hints_unlocked: 0, score_delta: 10, duration_ms: 1700 },
  ],
};

describe("Computational Aesthetics Engine & Visual Components", () => {
  it("pointsToSmoothCubicPath 生成平滑的三次贝塞尔样条而非锯齿折线", () => {
    const path = pointsToSmoothCubicPath([[0, 0], [10, 20], [30, 15], [50, 30]], true);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.includes(" C ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
  });

  it("reportToAestheticSession 正确转换评测报告与微观试次", () => {
    const session = reportToAestheticSession(mockReport);
    expect(session.id).toBe("sess_aesthetic_01");
    expect(session.trials?.length).toBe(6);
    expect(session.trials?.[2].hints_unlocked).toBe(1);
    expect(session.metrics.m_ratio).toBe(0.9);
  });

  it("支持 Dark/Light 双主题与 Artifact/Ambient 双模式生成合法 SVG", () => {
    const session = reportToAestheticSession(mockReport);
    const darkParams = computeAestheticParameters(session, 800, 800, { theme: "dark", surface: "artifact" });
    const lightParams = computeAestheticParameters(session, 800, 800, { theme: "light", surface: "artifact" });

    expect(darkParams.bgGradStart).not.toBe(lightParams.bgGradStart);
    expect(darkParams.resonancePaths.length).toBe(3);
    expect(darkParams.nodes[2].isReversal).toBe(true);
    expect(darkParams.nodes[2].hintTaken).toBe(true);

    const darkSvg = generateAestheticSvg(session, 800, { theme: "dark", surface: "artifact" });
    const ambientSvg = generateAestheticSvg(session, 800, { theme: "light", surface: "ambient" });
    expect(darkSvg).toContain("<svg");
    expect(darkSvg).toContain("MANIFOLD // Q1-CAL");
    expect(ambientSvg).not.toContain("MANIFOLD //");
  });

  it("CognitiveManifoldSigil 与 AmbientManifoldBackdrop 在 SSR 下正常渲染", () => {
    const sigilHtml = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(CognitiveManifoldSigil, { report: mockReport, isEn: false })
      )
    );
    expect(sigilHtml).toContain("专属认知流形图腾");
    expect(sigilHtml).toContain("MANIFOLD //");

    const backdropHtml = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(AmbientManifoldBackdrop, { report: mockReport, intensity: "rich" })
      )
    );
    expect(backdropHtml).toContain("aria-hidden=\"true\"");
    expect(backdropHtml).toContain("<svg");
  });
});
