import { describe, it, expect } from "bun:test";
import {
  compute4DEuclideanDistance,
  computeCognitiveAlignmentScore,
  computeArchetypePairingDynamics,
  computeDuelComparison,
  normalizeManifoldVector,
} from "../src/backend/duel_engine";
import { CognitiveArchetype } from "../src/backend/models";

describe("Seam 1: Cognitive Twin Duel Comparison Engine", () => {
  describe("4D Cognitive Manifold Euclidean Distance & Alignment Score", () => {
    it("computes 0 distance and 100% alignment for identical vectors", () => {
      const vec: [number, number, number, number] = [0.8, 0.75, 0.5, 0.6];
      const dist = compute4DEuclideanDistance(vec, vec);
      expect(dist).toBe(0);
      const alignment = computeCognitiveAlignmentScore(dist);
      expect(alignment).toBe(100);
    });

    it("computes maximum theoretical distance (2.0) and 0% alignment for opposite extremes", () => {
      const vecA: [number, number, number, number] = [0.0, 0.0, 0.0, 0.0];
      const vecB: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0];
      const dist = compute4DEuclideanDistance(vecA, vecB);
      expect(dist).toBe(2);
      const alignment = computeCognitiveAlignmentScore(dist);
      expect(alignment).toBe(0);
    });

    it("correctly normalizes raw metrics into 4D unit manifold vector", () => {
      const rawMetrics = {
        d_star: 0.85,
        m_ratio: 1.5, // 1.5 / 2.0 = 0.75
        calibration_bias: 0.2, // (0.2 + 1) / 2 = 0.6
        ive: 0.4,
      };
      const normalized = normalizeManifoldVector(rawMetrics);
      expect(normalized[0]).toBeCloseTo(0.85, 2);
      expect(normalized[1]).toBeCloseTo(0.75, 2);
      expect(normalized[2]).toBeCloseTo(0.60, 2);
      expect(normalized[3]).toBeCloseTo(0.40, 2);
    });

    it("safely clamps outliers in raw metrics", () => {
      const extremeMetrics = {
        d_star: 1.5, // clamps to 1.0
        m_ratio: 3.5, // clamps to 1.0
        calibration_bias: -2.0, // clamps to 0.0
        ive: -0.5, // clamps to 0.0
      };
      const normalized = normalizeManifoldVector(extremeMetrics);
      expect(normalized).toEqual([1.0, 1.0, 0.0, 0.0]);
    });
  });

  describe("Archetype Pairing Dynamics & Complementary Index", () => {
    it("evaluates symmetric sovereign pairing (人形外挂 vs 人形外挂)", () => {
      const dynamicsZh = computeArchetypePairingDynamics(
        CognitiveArchetype.SOVEREIGN,
        CognitiveArchetype.SOVEREIGN,
        "zh-CN"
      );
      expect(dynamicsZh.synergyTitle).toBeDefined();
      expect(dynamicsZh.complementaryIndex).toBeGreaterThanOrEqual(80);
      expect(dynamicsZh.pairingDynamics.length).toBeGreaterThan(10);
      expect(dynamicsZh.mutualStrengths.length).toBeGreaterThanOrEqual(2);
      expect(dynamicsZh.mutualDifferences.length).toBeGreaterThanOrEqual(1);

      const dynamicsEn = computeArchetypePairingDynamics(
        CognitiveArchetype.SOVEREIGN,
        CognitiveArchetype.SOVEREIGN,
        "en-US"
      );
      expect(dynamicsEn.synergyTitle).toBeDefined();
      expect(dynamicsEn.mutualStrengths.length).toBeGreaterThanOrEqual(2);
    });

    it("evaluates highly complementary pairing (定海神针 vs 飞龙在天 / Sentinel vs Pioneer)", () => {
      const dynamics = computeArchetypePairingDynamics(
        CognitiveArchetype.VIGILANT_SENTINEL,
        CognitiveArchetype.AUDACIOUS_PIONEER,
        "zh-CN"
      );
      expect(dynamics.complementaryIndex).toBeGreaterThanOrEqual(90);
      expect(dynamics.synergyTitle).toContain("智勇");
      expect(dynamics.mutualStrengths.some((s) => s.includes("攻守") || s.includes("互补"))).toBe(true);
    });

    it("is symmetric with respect to participant order (A vs B equals B vs A dynamics)", () => {
      const pairAB = computeArchetypePairingDynamics(
        CognitiveArchetype.SOVEREIGN,
        CognitiveArchetype.ADAPTIVE_LEARNER,
        "zh-CN"
      );
      const pairBA = computeArchetypePairingDynamics(
        CognitiveArchetype.ADAPTIVE_LEARNER,
        CognitiveArchetype.SOVEREIGN,
        "zh-CN"
      );
      expect(pairAB.synergyTitle).toBe(pairBA.synergyTitle);
      expect(pairAB.complementaryIndex).toBe(pairBA.complementaryIndex);
    });

    it("gracefully falls back for unknown or legacy archetype names", () => {
      const dynamics = computeArchetypePairingDynamics(
        "Q1-CAL",
        "UNKNOWN_ARCHETYPE",
        "zh-CN"
      );
      expect(dynamics.synergyTitle).toBeDefined();
      expect(dynamics.complementaryIndex).toBeGreaterThan(0);
    });
  });

  describe("computeDuelComparison End-to-End", () => {
    it("computes complete duel comparison between two full assessment reports", () => {
      const reportA = {
        session_id: "sess_a",
        subject_name: "Alice",
        archetype: CognitiveArchetype.SOVEREIGN,
        quadrant_code: "Q1-CAL",
        metrics: {
          d_star: 0.9,
          m_ratio: 1.6,
          calibration_bias: 0.05,
          ive: 0.7,
        },
      };

      const reportB = {
        session_id: "sess_b",
        subject_name: "Bob",
        archetype: CognitiveArchetype.ADAPTIVE_LEARNER,
        quadrant_code: "Q2-EVO",
        metrics: {
          d_star: 0.6,
          m_ratio: 1.4,
          calibration_bias: -0.1,
          ive: 0.85,
        },
      };

      const duel = computeDuelComparison(reportA, reportB, "zh-CN");
      expect(duel.euclidean_distance).toBeGreaterThan(0);
      expect(duel.similarity_percentage).toBeGreaterThan(0);
      expect(duel.similarity_percentage).toBeLessThanOrEqual(100);
      expect(duel.cognitive_alignment_score).toBe(duel.similarity_percentage);
      expect(duel.complementary_index).toBeGreaterThan(50);
      expect(duel.synergy_title).toBeDefined();
      expect(duel.pairing_dynamics).toBeDefined();
      expect(duel.mutual_strengths.length).toBeGreaterThanOrEqual(2);
      expect(duel.mutual_differences.length).toBeGreaterThanOrEqual(1);
      expect(duel.manifold_comparison.dimensionDeltas).toBeDefined();
    });
  });
});
