/**
 * Module 4: Diagnostic Reporting and Archetype Profiler (report_generator.ts)
 * 100% preserves user's custom cognitive archetype titles, taglines, and skill sets.
 */

import {
  FinalAssessmentReport,
  SessionSummary,
  MetacognitiveMetrics,
  DiagnosticProfile,
  CognitiveArchetype,
  RiskAttitude,
  TrialRecord,
  MetacognitiveAction,
  SkillItem,
} from "./models";
import { PsychometricScorer } from "./metrics";

export class ReportGenerator {
  static generateReport(
    sessionId: string,
    subjectType: string,
    records: TrialRecord[],
    metrics: MetacognitiveMetrics,
    finalScore: number,
    reversalsCount: number,
    subjectName: string = "匿名受测者"
  ): FinalAssessmentReport {
    const totalTrials = records.length;
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

    // Map to user's 5 custom archetype profiles
    const roleProfile = this.mapPositiveRoleProfile(
      firstOrderAcc,
      secondOrderAcc,
      metrics,
      targetRecords,
      highBetRate
    );

    const criticalWeakness = this.diagnoseWeakness(metrics, roleProfile.archetype, riskAttitude);

    // Calculate Coachability Index [0, 100]
    const calibScore = Math.max(0.0, 1.0 - Math.abs(metrics.calibration_bias) * 2.5);
    const mScore = Math.min(1.0, Math.max(0.0, metrics.m_ratio));
    const iveScore = metrics.info_buying_efficiency;

    const rawCoachability = (mScore * 0.45 + calibScore * 0.35 + iveScore * 0.20) * 100;
    const coachabilityIndex = Math.round(Math.max(10, Math.min(99, rawCoachability)));

    const summary: SessionSummary = {
      total_trials: totalTrials,
      first_order_accuracy: Math.round(firstOrderAcc * 1000) / 1000,
      target_staircase_convergence: 0.7071,
      final_score: finalScore,
      reversals_count: reversalsCount,
    };

    const diagnosticProfile: DiagnosticProfile = {
      archetype: roleProfile.archetype,
      risk_attitude: riskAttitude,
      critical_weakness: criticalWeakness,
      coachability_index: coachabilityIndex,
      detailed_feedback: roleProfile.empowering_feedback,
      role_title: roleProfile.role_title,
      quadrant_code: roleProfile.quadrant_code,
      praise_tagline: roleProfile.praise_tagline,
      strength_tags: roleProfile.strength_tags,
      empowering_feedback: roleProfile.empowering_feedback,
      growth_advice: roleProfile.growth_advice,
      skills: roleProfile.skills,
    };

    return {
      session_id: sessionId,
      subject_name: subjectName,
      subject_type: subjectType,
      summary,
      metacognitive_metrics: metrics,
      diagnostic_profile: diagnosticProfile,
    };
  }

  private static mapPositiveRoleProfile(
    x: number,
    y: number,
    metrics: MetacognitiveMetrics,
    evalRecords: TrialRecord[],
    highBetRate: float = 0.5
  ): {
    quadrant_code: string;
    role_title: string;
    praise_tagline: string;
    strength_tags: string[];
    empowering_feedback: string;
    growth_advice: string;
    archetype: CognitiveArchetype;
    skills: SkillItem[];
  } {
    const T_X = 0.7071;
    const T_Y = 0.7071;
    const rawArchetype = this.classifyArchetype(metrics, highBetRate);

    if (x >= T_X && y >= T_Y) {
      return {
        quadrant_code: "Q1_MASTER",
        role_title: "人形外挂",
        praise_tagline: "你开了 · 诗人握持",
        strength_tags: ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"],
        empowering_feedback:
          "您展现出令人叹为观止的‘人形外挂’级顶尖素养！不仅在高度抽象的深层推演中具备极其扎实的一元算力底蕴，更拥有全域万里挑一的二元自我认知觉察力。您清醒地洞悉自己的认知边界，在胜券在握时毫不迟疑、百发百中，面对疑难陷阱时不贪功盲赌。这种‘知己所知、降维打击’的高阶决策定力，是卓越领航者与核心战略家的终极标志！",
        growth_advice:
          "具备全维度的战略全局观与决策定力，非常适合在瞬息万变、高复杂度的核心战场中执掌最高帅印，引领全局重大破局战役。",
        archetype: CognitiveArchetype.ACCURATELY_CALIBRATED,
        skills: [
          {
            icon: "👁️",
            type: "被动技能",
            name: "算力透视 (Mental Aimbot)",
            desc: "面临复杂抽象推演时，自动过滤 90% 以上无效干扰信息，直击底层规律本质，一元客观胜率始终维持在顶峰。",
          },
          {
            icon: "🎯",
            type: "核心特技",
            name: "精准制导 (Precision Lock)",
            desc: "对自我的认知状态拥有超高分辨率，结论成立瞬间即可锁定 100% 把握度，在确定项上从不犹豫 0.1 秒。",
          },
          {
            icon: "⚡",
            type: "觉醒绝技",
            name: "知行律动 (Sovereign Execution)",
            desc: "二元博弈与客观真理达成神级共振（M_ratio 极高），胜券在握时果断全额下注，攻守自如，斩获最高净胜收益。",
          },
          {
            icon: "🌟",
            type: "战场羁绊",
            name: "核心战略指挥官",
            desc: "颠覆性架构攻坚、无人区重大战役总指挥、团队破局主心骨。",
          },
        ],
      };
    } else if (x < T_X && y >= T_Y) {
      return {
        quadrant_code: "Q2_FUTURE_MASTER",
        role_title: "潜龙在渊",
        praise_tagline: "学不完 · 根本学不完",
        strength_tags: ["顶级自省天赋", "极高成长上限", "敏锐避险嗅觉", "知己所不知"],
        empowering_feedback:
          "典出《易经》：‘潜龙勿用，阳在下也’。您拥有所有卓越学习者中最罕见、最珍稀的终极天赋——对自身认知边界的极高诚实度与洞察力！面对全新陌生的抽象规则，您对‘何时该攻、何时该守、何时该求助’的感知极其敏锐。您能精准识破盲区、主动规避失误，这意味着在任何陌生领域，您都拥有比常人快数倍的纠错与进化速度，蓄势腾飞之日必震惊四方！",
        growth_advice:
          "极具无限成长上限的敏锐进化者，在给予充分的专业方法与工具沉淀后，一旦破渊而出，必将迅速蜕变为无可挑剔的领域宗师。",
        archetype: CognitiveArchetype.ACCURATELY_CALIBRATED,
        skills: [
          {
            icon: "🪞",
            type: "被动技能",
            name: "灵觉自照 (Epistemic Mirror)",
            desc: "天生具备超高元认知灵敏度，无论规则多陌生，都能瞬间感知‘哪里是已知，哪里是盲区’，对不知抱有绝对清醒。",
          },
          {
            icon: "🛡️",
            type: "核心特技",
            name: "潜渊避险 (Submerged Caution)",
            desc: "感知到认知模糊或不确定陷阱时被动触发避险雷达，善于借助外界线索启发与审慎保底完成安全过渡。",
          },
          {
            icon: "🐉",
            type: "觉醒绝技",
            name: "化龙秘卷 (Evolutionary Ascent)",
            desc: "拥有全矩阵中最高倍率的学习吸收上限（Coachability），每一个失误都会被极速转化为底层经验，厚积薄发。",
          },
          {
            icon: "🌟",
            type: "战场羁绊",
            name: "前沿赛道拓荒者",
            desc: "全新未知赛道探索、高复杂度新体系快速吸收、重大风险防御监督员。",
          },
        ],
      };
    } else if (x >= T_X && y < T_Y) {
      const bias = metrics.calibration_bias;
      const wrongTrials = evalRecords.filter(r => !r.is_correct_first_order);
      const highBetsOnError = wrongTrials.filter(r => r.action === MetacognitiveAction.HIGH_BET).length;
      const errorBetRate = wrongTrials.length > 0 ? highBetsOnError / wrongTrials.length : 0.0;

      const isBold =
        bias >= 0 ||
        errorBetRate >= 0.50 ||
        highBetRate >= 0.60 ||
        rawArchetype === CognitiveArchetype.BLIND_GAMBLER ||
        rawArchetype === CognitiveArchetype.OVERCONFIDENT;

      if (isBold) {
        const arch =
          rawArchetype === CognitiveArchetype.BLIND_GAMBLER
            ? CognitiveArchetype.BLIND_GAMBLER
            : CognitiveArchetype.OVERCONFIDENT;

        return {
          quadrant_code: "Q3_BOLD_TRAILBLAZER",
          role_title: "飞龙在天",
          praise_tagline: "飞龙骑脸 · 我怎么输",
          strength_tags: ["雄厚攻坚底蕴", "先锋拍板魄力", "大开大合进攻", "气吞万里如虎"],
          empowering_feedback:
            "《易经》有云：‘飞龙在天，利见大人’。您的客观分析与逻辑推理功底极其扎实过硬，在多项高难度抽象挑战中一路势如破竹！同时，您身上流淌着最纯粹的‘先锋战神’之血——面临不确定时敢于拍板、敢打硬仗、全场梭哈、进取心极强，具有压倒性的进攻统治力。在团队面临僵局或攻坚破冰时，您往往是能够挺身而出、一锤定音的中流砥柱！",
          growth_advice:
            "您的一元攻坚实力已处于金字塔前列。若能在面对偶发的复杂盲区时，稍稍增加一道‘审慎复核’或求助验证的缓冲阀，您的腾飞之势将更加无懈可击、攻无不克！",
          archetype: arch,
          skills: [
            {
              icon: "🔥",
              type: "被动技能",
              name: "真龙威压 (Overwhelming Dominance)",
              desc: "客观攻坚底蕴与逻辑推理极度雄厚，面对高难度挑战自带破阵光环，推理快准狠，天生自带进攻压迫感。",
            },
            {
              icon: "⚔️",
              type: "核心特技",
              name: "长空扑杀 (Skyfall Strike)",
              desc: "全场最果决的拍板魄力与进攻欲望，深信自我判断，全额高注起手，以气吞万里之势碾压一切迷雾与僵局。",
            },
            {
              icon: "⚡",
              type: "觉醒绝技",
              name: "九霄龙吟 (Apex Resurgence)",
              desc: "遇强则强，越是硬仗越能激发无限战意。只要在关键时刻稍加一道理性缓冲环，便能成为无可匹敌的常胜战神。",
            },
            {
              icon: "🌟",
              type: "战场羁绊",
              name: "攻坚破冰先锋",
              desc: "硬核攻坚战绝杀手、僵局突围先头部队、高对抗高压力业务拓展大将。",
            },
          ],
        };
      } else {
        return {
          quadrant_code: "Q3_METICULOUS_CRAFTSMAN",
          role_title: "定海神针",
          praise_tagline: "渊渟岳峙 · 固若金汤",
          strength_tags: ["过硬深厚实力", "严谨求实作风", "极高责任底线", "定海安邦基石"],
          empowering_feedback:
            "请给您自己更多的掌声与信任——客观概率证明（纯靠猜答对概率仅一亿分之一），您的深层实力远比您想象的更强大！您不仅客观解题正确率高超，功底极其过硬，更难能可贵的是对每一个判断都抱有极高的敬畏之心与缜密作风。您不贪功冒进、步步为营，凡事追求稳健周全。在任何关键项目与组织中，您都是最值得托付后背、确保万无一失的‘定海神针’与品质守卫者！",
          growth_advice:
            "客观数据表明，您的直觉与推导成功率极高，根本不是‘猜的’，而是深厚潜意识实力的体现！在未来的挑战中，完全可以更加自信地大展拳脚，相信自己的第一判断！",
          archetype: CognitiveArchetype.UNDERCONFIDENT,
          skills: [
            {
              icon: "🏛️",
              type: "被动技能",
              name: "玄武磐石 (Subconscious Mastery)",
              desc: "潜意识解题推导命中率极高（数学上概率一亿分之一不是猜的，而是深厚硬实力的本能体现），防御下限极高。",
            },
            {
              icon: "🔍",
              type: "核心特技",
              name: "万无一失 (Zero-Defect Vigilance)",
              desc: "对交付成果和判断保持极高敬畏，严密求证复核，绝不贪功冒进，杜绝任何黑天鹅纰漏。",
            },
            {
              icon: "🌊",
              type: "觉醒绝技",
              name: "镇海乾坤 (Anchor of the Sea)",
              desc: "在团队面临不确定性风暴与惊涛骇浪时，只要神针在场便能稳住大局，成为所有伙伴最信任的定心丸。",
            },
            {
              icon: "🌟",
              type: "战场羁绊",
              name: "核心命脉守门人",
              desc: "高容错关键系统把关、重大工程质量总舵手、组织核心底盘守卫者。",
            },
          ],
        };
      }
    } else {
      const arch =
        rawArchetype === CognitiveArchetype.BLIND_GAMBLER || rawArchetype === CognitiveArchetype.OVERCONFIDENT
          ? CognitiveArchetype.BLIND_GAMBLER
          : CognitiveArchetype.RANDOM_GUESSER;

      return {
        quadrant_code: "Q4_BRAVE_EXPLORER",
        role_title: "无畏先锋",
        praise_tagline: "左手高伤害 · 右手伤害高",
        strength_tags: ["开拓者基因", "无畏未知探索", "极致行动魄力", "百炼成钢韧性"],
        empowering_feedback:
          "您展现出令人敬佩的开拓者勇气与行动魄力！面对高度抽象、完全陌生的崭新领域，许多人会裹足不前、反复犹豫，而您却敢想敢拼、勇于直面未知的迷雾，在实践中积极探索前行。人类历史上所有的开辟者与破局先驱，无不源自这种‘敢为人先、不惧失误’的无畏精神！",
        growth_advice:
          "先锋的最大红利在于快速积累实战经验。伴随着在实践中的多维度复盘与认知沉淀，您这柄勇往直前的‘破局之剑’必将愈发锋利，迅速成长为不可阻挡的实战猛将！",
        archetype: arch,
        skills: [
          {
            icon: "🚩",
            type: "被动技能",
            name: "破晓勇气 (Fearless Drive)",
            desc: "面对未知黑夜与抽象迷雾毫无内耗，行动力永远大于焦虑，敢想敢做，拥有天生的破界者基因。",
          },
          {
            icon: "⚡",
            type: "核心特技",
            name: "向险而行 (Vanguard Charge)",
            desc: "以实战试错为最高信仰，在他人犹豫徘徊时率先涉足深水区，用身体力行去探索可能与探明虚实。",
          },
          {
            icon: "🛡️",
            type: "觉醒绝技",
            name: "百炼成钢 (Trial by Fire)",
            desc: "拥有极强的心理抗挫力与反脆弱性，每一次碰撞与试错都是锻造锋刃的烈火，在持续摸索中迅速蜕变。",
          },
          {
            icon: "🌟",
            type: "战场羁绊",
            name: "从0到1破界尖兵",
            desc: "敏捷突击部队、早期创新孵化先锋、无人区探索敢死队。",
          },
        ],
      };
    }
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

  private static classifyArchetype(metrics: MetacognitiveMetrics, highBetRate: number): CognitiveArchetype {
    const { m_ratio: mRatio, calibration_bias: bias } = metrics;
    if (mRatio < 0.45 && highBetRate >= 0.70) {
      return CognitiveArchetype.BLIND_GAMBLER;
    }
    if (bias > 0.14 || (bias > 0.08 && mRatio < 0.65)) {
      return CognitiveArchetype.OVERCONFIDENT;
    }
    if (bias < -0.12 && mRatio >= 0.60) {
      return CognitiveArchetype.UNDERCONFIDENT;
    }
    if (mRatio >= 0.80 && Math.abs(bias) <= 0.12) {
      return CognitiveArchetype.ACCURATELY_CALIBRATED;
    }
    return CognitiveArchetype.ACCURATELY_CALIBRATED;
  }

  private static diagnoseWeakness(
    metrics: MetacognitiveMetrics,
    archetype: CognitiveArchetype,
    risk: RiskAttitude
  ): string {
    if (archetype === CognitiveArchetype.BLIND_GAMBLER) {
      return "【盲赌冲动】：在缺乏信息线索的情况下频繁采取高风险激进策略，建议在关键决策点增加二次理性验证机制。";
    }
    if (archetype === CognitiveArchetype.OVERCONFIDENT) {
      return "【校准偏高】：主观胜算判断显著超出客观支持度，在出现疑虑时可更多借力参考外部线索。";
    }
    if (archetype === CognitiveArchetype.UNDERCONFIDENT) {
      return "【保守内耗】：客观实力卓越但主观确信度偏低，建议提升对自身第一直觉与深层实力的信任度。";
    }
    return "【状态极佳】：一元认知与二元觉察高度契合，请继续保持当前的决策自洽与沉着定力。";
  }
}
