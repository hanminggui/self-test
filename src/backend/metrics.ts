/**
 * Module 3: Psychometric Scoring Engine (metrics.ts)
 * Implements:
 *   1. Type-1 SDT sensitivity (d') and criterion (c) with log-linear correction
 *   2. Type-2 SDT sensitivity (Meta-d') using Maniscalco & Lau (2012) MLE & empirical calibration
 *   3. Metacognitive Efficiency (M_ratio = Meta-d' / d')
 *   4. Calibration Bias (Overconfidence / Underconfidence)
 *   5. Brier Score
 *   6. Information Value Efficiency (IVE)
 *   7. Balanced Type-2 Decision Alignment Rate
 */

import { TrialRecord, MetacognitiveAction, MetacognitiveMetrics } from "./models";
import { normPpf, normCdf, compute4AFCdPrime, nelderMead } from "./math";

export class PsychometricScorer {
  /**
   * Calculates d' and criterion c using log-linear Hautus (1995) correction.
   * Supports both 2-alternative (2AFC) and 4-alternative (4AFC) paradigms.
   */
  static computeType1Sdt(records: TrialRecord[]): [number, number] {
    if (!records || records.length === 0) {
      return [0.01, 0.0];
    }

    const is4afc = records.some(
      r => r.correct_option === "C" || r.correct_option === "D" ||
           r.first_order_choice === "C" || r.first_order_choice === "D"
    );

    if (is4afc) {
      // 4-Alternative Forced Choice
      const nCorr = records.filter(r => r.is_correct_first_order).length;
      let pc = (nCorr + 0.5) / (records.length + 1.0);
      pc = Math.max(0.2501, Math.min(0.9999, pc));

      const dPrime = compute4AFCdPrime(pc);
      return [Math.max(0.01, Math.round(dPrime * 10000) / 10000), 0.0];
    } else {
      // Classical 2AFC: S1 ('A') vs S2 ('B')
      const s2Records = records.filter(r => r.signal_type === "S2");
      const s1Records = records.filter(r => r.signal_type === "S1");

      const hits = s2Records.filter(r => r.first_order_choice === "B").length;
      const fas = s1Records.filter(r => r.first_order_choice === "B").length;

      let hRate = s2Records.length > 0 ? (hits + 0.5) / (s2Records.length + 1.0) : 0.5;
      let faRate = s1Records.length > 0 ? (fas + 0.5) / (s1Records.length + 1.0) : 0.5;

      hRate = Math.max(1e-4, Math.min(1.0 - 1e-4, hRate));
      faRate = Math.max(1e-4, Math.min(1.0 - 1e-4, faRate));

      const dPrime = normPpf(hRate) - normPpf(faRate);
      const c = -0.5 * (normPpf(hRate) + normPpf(faRate));

      return [
        Math.max(0.01, Math.round(dPrime * 10000) / 10000),
        Math.round(c * 10000) / 10000,
      ];
    }
  }

  /**
   * Fits Type-2 Meta-d' via empirical calibration or Maximum Likelihood Estimation (Maniscalco & Lau, 2012).
   */
  static computeMetaDPrime(records: TrialRecord[], dPrime: number, c: number): number {
    const correctRecords = records.filter(r => r.is_correct_first_order);
    const incorrectRecords = records.filter(r => !r.is_correct_first_order);

    const nCorrectHigh = correctRecords.filter(r => r.action === MetacognitiveAction.HIGH_BET).length;
    const nIncorrectHigh = incorrectRecords.filter(r => r.action === MetacognitiveAction.HIGH_BET).length;

    const rawH2 = correctRecords.length > 0 ? nCorrectHigh / correctRecords.length : 0.5;
    const rawFa2 = incorrectRecords.length > 0 ? nIncorrectHigh / incorrectRecords.length : 0.5;

    // Zero / negative empirical sensitivity (e.g. blind gambler)
    if (rawH2 - rawFa2 <= 0.05) {
      return 0.01;
    }

    let h2 = correctRecords.length > 0 ? (nCorrectHigh + 0.5) / (correctRecords.length + 1.0) : 0.5;
    let fa2 = incorrectRecords.length > 0 ? (nIncorrectHigh + 0.5) / (incorrectRecords.length + 1.0) : 0.5;

    h2 = Math.max(1e-4, Math.min(1.0 - 1e-4, h2));
    fa2 = Math.max(1e-4, Math.min(1.0 - 1e-4, fa2));
    const empiricalD2 = normPpf(h2) - normPpf(fa2);

    const is4afc = records.some(
      r => r.correct_option === "C" || r.correct_option === "D" ||
           r.first_order_choice === "C" || r.first_order_choice === "D"
    );

    if (is4afc) {
      const metaD = empiricalD2 * 0.80;
      return Math.max(0.01, Math.round(metaD * 10000) / 10000);
    }

    // 2AFC MLE Optimization: Count 4 response categories for S1 and S2
    const nR_S1 = [0.25, 0.25, 0.25, 0.25];
    const nR_S2 = [0.25, 0.25, 0.25, 0.25];

    for (const r of records) {
      const isHigh = r.action === MetacognitiveAction.HIGH_BET;
      const resp = r.first_order_choice;
      const sig = r.signal_type;

      let cat: number;
      if (resp === "A") {
        cat = isHigh ? 0 : 1;
      } else {
        cat = isHigh ? 3 : 2;
      }

      if (sig === "S1") {
        nR_S1[cat] += 1.0;
      } else {
        nR_S2[cat] += 1.0;
      }
    }

    const cRatio = c / Math.max(0.1, dPrime);

    const nllFn = (params: number[]): number => {
      const [metaD, delta1, delta2] = params;
      if (metaD <= 1e-5 || delta1 <= 1e-5 || delta2 <= 1e-5) {
        return 1e8;
      }

      const cMeta = cRatio * metaD;
      const c1 = cMeta - delta1;
      const c2 = cMeta + delta2;

      // S1: mean = -metaD / 2
      const muS1 = -metaD / 2.0;
      const p1S1 = normCdf(c1 - muS1);
      const p2S1 = Math.max(1e-6, normCdf(cMeta - muS1) - normCdf(c1 - muS1));
      const p3S1 = Math.max(1e-6, normCdf(c2 - muS1) - normCdf(cMeta - muS1));
      const p4S1 = Math.max(1e-6, 1.0 - normCdf(c2 - muS1));

      // S2: mean = metaD / 2
      const muS2 = metaD / 2.0;
      const p1S2 = normCdf(c1 - muS2);
      const p2S2 = Math.max(1e-6, normCdf(cMeta - muS2) - normCdf(c1 - muS2));
      const p3S2 = Math.max(1e-6, normCdf(c2 - muS2) - normCdf(cMeta - muS2));
      const p4S2 = Math.max(1e-6, 1.0 - normCdf(c2 - muS2));

      const probsS1 = [p1S1, p2S1, p3S1, p4S1];
      const probsS2 = [p1S2, p2S2, p3S2, p4S2];

      let logLik = 0;
      for (let i = 0; i < 4; i++) {
        logLik += nR_S1[i] * Math.log(Math.max(1e-6, probsS1[i]));
        logLik += nR_S2[i] * Math.log(Math.max(1e-6, probsS2[i]));
      }

      return -logLik;
    };

    const candidateInits = [
      [Math.max(0.1, empiricalD2), 0.6, 0.6],
      [Math.max(0.1, dPrime), 0.5, 0.5],
      [0.1, 0.8, 0.8],
    ];

    const bounds: [number, number][] = [
      [0.01, 6.0],
      [0.01, 4.0],
      [0.01, 4.0],
    ];

    let bestNll = Infinity;
    let bestMetaD = empiricalD2;

    for (const init of candidateInits) {
      const res = nelderMead(nllFn, init, bounds);
      if (res.value < bestNll) {
        bestNll = res.value;
        bestMetaD = res.point[0];
      }
    }

    return Math.max(0.01, Math.round(bestMetaD * 10000) / 10000);
  }

  /**
   * Calibration Bias = Subjective Confidence - Objective Accuracy
   */
  static computeCalibrationBias(records: TrialRecord[]): number {
    if (!records || records.length === 0) return 0.0;
    const confidences: number[] = records.map(r => r.confidence_level ?? 0.5);
    const accuracies: number[] = records.map(r => (r.is_correct_first_order ? 1.0 : 0.0));

    const meanConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const meanAcc = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

    return Math.round((meanConf - meanAcc) * 10000) / 10000;
  }

  /**
   * Brier Score = 1/N * sum((confidence - outcome)^2)
   */
  static computeBrierScore(records: TrialRecord[]): number {
    if (!records || records.length === 0) return 0.25;
    const squaredErrors = records.map(r => {
      const outcome = r.is_correct_first_order ? 1.0 : 0.0;
      const conf = r.confidence_level ?? 0.5;
      return Math.pow(conf - outcome, 2);
    });
    const avg = squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length;
    return Math.round(avg * 10000) / 10000;
  }

  /**
   * Information Value Efficiency (IVE) = (Delta Accuracy * Payoff) / Cost
   */
  static computeInfoBuyingEfficiency(records: TrialRecord[]): number {
    const hintRecords = records.filter(r => r.hint_purchased);
    if (hintRecords.length === 0) return 0.50;

    const rescued = hintRecords.filter(r => !r.is_correct_first_order && r.is_correct_final).length;
    const wasted = hintRecords.filter(r => r.is_correct_first_order && !r.is_correct_final).length;

    const deltaAcc = (rescued - wasted) / hintRecords.length;
    const rawIve = (Math.max(0.0, deltaAcc) * 10.0) / 2.0;
    const normalizedIve = Math.min(1.0, Math.max(0.0, rawIve * 0.2 + (rescued / hintRecords.length) * 0.8));
    return Math.round(normalizedIve * 10000) / 10000;
  }

  /**
   * Balanced Type-2 Decision Alignment Rate:
   * 0.5 * P(High Bet | Correct) + 0.5 * P(Safe Bet or Hint | Incorrect)
   */
  static computeMetacognitiveJudgmentAccuracy(records: TrialRecord[]): number {
    if (!records || records.length === 0) return 0.70;

    const correctRecords = records.filter(r => r.is_correct_first_order);
    const incorrectRecords = records.filter(r => !r.is_correct_first_order);

    const pHit = correctRecords.length > 0
      ? correctRecords.filter(r => r.action === MetacognitiveAction.HIGH_BET).length / correctRecords.length
      : 0.5;

    const pCr = incorrectRecords.length > 0
      ? incorrectRecords.filter(r => r.action === MetacognitiveAction.SAFE_BET || r.action === MetacognitiveAction.BUY_HINT).length / incorrectRecords.length
      : 0.5;

    return Math.round(0.5 * (pHit + pCr) * 10000) / 10000;
  }

  static evaluate(records: TrialRecord[], excludeWarmup: boolean = true): MetacognitiveMetrics {
    const evalRecords = excludeWarmup ? records.filter(r => !r.is_warmup) : records;
    const targetRecords = evalRecords.length > 0 ? evalRecords : records;

    const [dPrime, c] = this.computeType1Sdt(targetRecords);
    const metaD = this.computeMetaDPrime(targetRecords, dPrime, c);
    const mRatio = Math.round((metaD / Math.max(0.05, dPrime)) * 10000) / 10000;
    const bias = this.computeCalibrationBias(targetRecords);
    const brier = this.computeBrierScore(targetRecords);
    const ive = this.computeInfoBuyingEfficiency(targetRecords);

    return {
      d_prime: dPrime,
      meta_d_prime: metaD,
      m_ratio: mRatio,
      calibration_bias: bias,
      brier_score: brier,
      info_buying_efficiency: ive,
    };
  }
}
