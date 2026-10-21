/**
 * Module 4: Diagnostic Reporting and Archetype Profiler (report_generator.ts)
 * 
 * Spec v2.0: Decoupled Two-Tier Architecture:
 * - Analytical Truth Layer: Strict MECE classification and clinical truth diagnostics
 * - User-Facing Presentation Layer: 100% positive empowering titles, taglines, and skill sets
 */

import {
  FinalAssessmentReport,
  AssessmentMetrics,
  DiagnosticProfile,
  CognitiveArchetype,
  RiskAttitude,
  TrialRecord,
  MetacognitiveAction,
} from "./models";
import { PsychometricScorer } from "./metrics";
import { classifyCognitiveArchetype, getArchetypeDefinition } from "./archetype_matrix";
import { getLocale, getDictionary, type SupportedLocale } from "../i18n";

export class ReportGenerator {
  /**
   * Counts the number of target trials where external hints were purchased.
   */
  static countHintTrials(records?: TrialRecord[], excludeWarmup: boolean = true): number {
    if (!records || records.length === 0) return 0;
    const evalRecords = excludeWarmup ? records.filter(r => !r.is_warmup) : records;
    const targetRecords = evalRecords.length > 0 ? evalRecords : records;
    let hintsCount = 0;
    for (const r of targetRecords) {
      if ((r.hints_unlocked !== undefined && r.hints_unlocked > 0) || (r as any).hint_purchased) {
        hintsCount += 1;
      }
    }
    return hintsCount;
  }

  static generateReport(
    sessionId: string,
    subjectType: string,
    records: TrialRecord[],
    metrics: any,
    finalScore: number,
    reversalsCount: number,
    subjectName: string = "匿名受测者",
    locale?: SupportedLocale
  ): FinalAssessmentReport {
    const totalTrials = records.length;
    const warmupTrials = records.filter(r => r.is_warmup).length;
    const evalRecords = records.filter(r => !r.is_warmup);
    const targetRecords = evalRecords.length > 0 ? evalRecords : records;

    const firstOrderAcc = targetRecords.length > 0
      ? targetRecords.filter(r => r.is_correct_first_order).length / targetRecords.length
      : 0.7071;
    const secondOrderAcc = targetRecords.length > 0
      ? PsychometricScorer.computeMetacognitiveJudgmentAccuracy(targetRecords)
      : 0.7071;

    const highBetCount = targetRecords.filter(r => r.action === MetacognitiveAction.HIGH_BET).length;
    const safeBetCount = targetRecords.filter(r => r.action === MetacognitiveAction.SAFE_BET).length;
    const highBetRate = targetRecords.length > 0 ? highBetCount / targetRecords.length : 0.5;
    const safeBetRate = targetRecords.length > 0 ? safeBetCount / targetRecords.length : 0.5;

    const riskAttitude = this.classifyRiskAttitude(highBetRate, safeBetRate, metrics.calibration_bias);

    // Count hints purchased across target records
    const hintsCount = this.countHintTrials(records, true);

    // Spec §6.1 MECE 单向超平面判别
    const archetype = classifyCognitiveArchetype({
      dStar: metrics.d_star,
      dPrime: metrics.d_prime,
      mRatio: metrics.m_ratio,
      bias: metrics.calibration_bias,
      brier: metrics.brier_score,
      ive: metrics.info_buying_efficiency ?? metrics.ive ?? 0.50,
      hintsCount,
    });

    const targetLocale = locale || getLocale();
    const archetypeDef = getArchetypeDefinition(archetype, targetLocale);

    // Calculate Coachability Index [0, 100]
    const calibScore = Math.max(0.0, 1.0 - Math.abs(metrics.calibration_bias) * 2.5);
    const mScore = Math.min(1.0, Math.max(0.0, metrics.m_ratio));
    const iveScore = metrics.info_buying_efficiency ?? metrics.ive ?? 0.50;

    const rawCoachability = (mScore * 0.45 + calibScore * 0.35 + iveScore * 0.20) * 100;
    const coachabilityIndex = Math.round(Math.max(10, Math.min(99, rawCoachability)));

    const assessmentMetrics: AssessmentMetrics = {
      first_order_accuracy: Math.round(firstOrderAcc * 1000) / 1000,
      second_order_accuracy: Math.round(secondOrderAcc * 1000) / 1000,
      reversals_count: reversalsCount,
      d_star: metrics.d_star,
      d_prime: metrics.d_prime,
      meta_d_prime: metrics.meta_d_prime,
      m_ratio: metrics.m_ratio,
      calibration_bias: metrics.calibration_bias,
      brier_score: metrics.brier_score,
      ive: iveScore,
      coachability_index: coachabilityIndex,
      risk_attitude: riskAttitude,
    };

    const summary = {
      total_trials: totalTrials,
      first_order_accuracy: Math.round(firstOrderAcc * 1000) / 1000,
      final_score: finalScore,
      reversals_count: reversalsCount,
      d_star: metrics.d_star,
    };

    const diagnosticProfile: DiagnosticProfile = {
      archetype,
      risk_attitude: riskAttitude,
      critical_weakness: this.diagnoseWeakness(metrics, archetype, riskAttitude, targetLocale),
      coachability_index: coachabilityIndex,
      clinical_summary: archetypeDef.clinical_summary,
      detailed_feedback: archetypeDef.empowering_feedback,
      role_title: archetypeDef.role_title,
      quadrant_code: archetypeDef.quadrant_code,
      praise_tagline: archetypeDef.praise_tagline,
      strength_tags: archetypeDef.strength_tags,
      empowering_feedback: archetypeDef.empowering_feedback,
      growth_advice: archetypeDef.growth_advice,
      skills: archetypeDef.skills,
    };

    return {
      session_id: sessionId,
      subject_name: subjectName,
      subject_type: subjectType,
      locale: targetLocale,
      created_at: new Date().toISOString(),
      total_trials: totalTrials,
      warmup_trials: warmupTrials,
      completed_trials: totalTrials,
      total_duration_ms: 0,
      final_score: finalScore,
      quadrant_code: archetypeDef.quadrant_code,
      archetype,
      metrics: assessmentMetrics,
      summary,
      metacognitive_metrics: {
        ...metrics,
        ive: iveScore,
        info_buying_efficiency: iveScore,
      },
      diagnostic_profile: diagnosticProfile,
    };
  }

  private static classifyRiskAttitude(highBetRate: number, safeBetRate: number, bias: number): RiskAttitude {
    if (highBetRate >= 0.65 || bias > 0.20) {
      return RiskAttitude.HIGH_RISK_SEEKING;
    } else if (safeBetRate >= 0.50 || bias < -0.15) {
      return RiskAttitude.RISK_AVERTED;
    } else {
      return RiskAttitude.MODERATE_RATIONAL;
    }
  }

  public static diagnoseWeakness(
    metrics: MetacognitiveMetrics,
    archetype: CognitiveArchetype,
    risk: RiskAttitude,
    locale?: SupportedLocale
  ): string {
    const targetLocale = locale || getLocale();
    const dict = getDictionary(targetLocale);
    if (dict?.archetypes?.[archetype]?.critical_weakness) {
      return dict.archetypes[archetype].critical_weakness;
    }

    switch (archetype) {
      case CognitiveArchetype.SOVEREIGN:
        return "【知行合一】：核心逻辑与深层觉察高度契合，请继续保持当前的决策自洽与沉着定力。";
      case CognitiveArchetype.ADAPTIVE_LEARNER:
        return "【自省借力】：对未知盲区具备极高清醒度，持续提升底层抽象储备将助您极速蜕变化龙。";
      case CognitiveArchetype.VIGILANT_SENTINEL:
        return "【严谨缜密】：深层实力极为过硬，完全可以更加信任自己的第一直觉，更加自信拍板。";
      case CognitiveArchetype.AUDACIOUS_PIONEER:
        return "【先锋魄力】：客观攻坚底蕴雄厚，遇到偶发未知疑点时增加一道微小复核阀将更臻完美。";
      case CognitiveArchetype.ANXIOUS_RETREATER:
        return "【防御谨慎】：守底纪律极佳，在安全边际充分的情境下可适度尝试进取，逐步拓展战果。";
      case CognitiveArchetype.BLIND_GAMBLER:
        return "【冲锋破局】：探索魄力极强，在面对陌生陷阱时增加一道理性缓冲验证能让攻势更加无懈可击。";
      case CognitiveArchetype.PRAGMATIC_ARBITRAGEUR:
        return "【精算博弈】：极擅长利用外界杠杆撬动收益，在更高复杂度的全局博弈中能大放异彩。";
      case CognitiveArchetype.STOCHASTIC_DRIFTER:
        return "【跳脱直觉】：灵感跳跃敏锐，在自由漫游中建立稳固推演锚点将让奇思妙想更有穿透力。";
      default:
        return "【状态极佳】：核心逻辑与深层觉察高度契合，请继续保持当前的决策自洽与沉着定力。";
    }
  }
}
