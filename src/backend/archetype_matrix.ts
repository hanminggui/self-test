/**
 * Archetype Configuration Matrix and MECE Classification Engine (archetype_matrix.ts)
 * 
 * Spec v2.0: Cognitive Manifold & Two-Tier 8-Archetype Architecture.
 * Strictly decouples User-Facing Empowerment layer from Analytical Clinical Truth.
 */

import { CognitiveArchetype, SkillItem } from "./models";
import { getLocale, getDictionary, type SupportedLocale } from "../i18n";

export interface ArchetypeDefinition {
  archetype: CognitiveArchetype;
  quadrant_code: string;
  role_title: string;
  english_title: string;
  praise_tagline: string;
  strength_tags: string[];
  empowering_feedback: string;
  growth_advice: string;
  skills: SkillItem[];
  clinical_summary: string;
}

/**
 * 8 大认知画像权威对照矩阵 (Configurable Mapping Matrix)
 * 遵循展示层 100% 正向赋能、后台统计层真实临床诊断的双层契约
 */
export const ARCHETYPE_MATRIX: Record<CognitiveArchetype, ArchetypeDefinition> = {
  [CognitiveArchetype.SOVEREIGN]: {
    archetype: CognitiveArchetype.SOVEREIGN,
    quadrant_code: "Q1-CAL",
    role_title: "人形外挂",
    english_title: "The Sovereign",
    praise_tagline: "你开了 · 诗人握持",
    strength_tags: ["高维逻辑底蕴", "算力降维压制", "知行绝对自洽", "手术刀级决断"],
    empowering_feedback:
      "您展现出令人叹为观止的‘人形外挂’级顶尖素养！不仅在高度抽象的深层推演中具备极其扎实的底层逻辑底蕴，更拥有全域万里挑一的超凡自我觉察力。您清醒地洞悉自己的掌控边界，在胜券在握时毫不迟疑、百发百中，面对疑难陷阱时不贪功盲赌。这种‘知己所知、降维打击’的高阶决策定力，是卓越领航者与核心战略家的终极标志！",
    growth_advice:
      "具备全维度的战略全局观与决策定力，非常适合在瞬息万变、高复杂度的核心战场中执掌最高帅印，引领全局重大破局战役。",
    skills: [
      {
        icon: "👁️",
        type: "被动特技",
        name: "算力透视",
        desc: "面临复杂抽象推演时，自动过滤 90% 以上无效干扰信息，直击底层规律本质，底层客观胜率始终维持在顶峰。",
      },
      {
        icon: "🎯",
        type: "核心特技",
        name: "精准制导",
        desc: "对自我的决断状态拥有超高分辨率，结论成立瞬间即可锁定 100% 把握度，在确定项上从不犹豫 0.1 秒。",
      },
      {
        icon: "⚡",
        type: "觉醒绝技",
        name: "知行律动",
        desc: "决策博弈与客观规律达成神级共振，胜券在握时果断全额下注，攻守自如，斩获最高净胜收益。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "核心战略指挥官",
        desc: "颠覆性架构攻坚、无人区重大战役总指挥、团队破局主心骨。",
      },
    ],
    clinical_summary:
      "高一元·高二元·知行自洽。底层抽象推演强，二阶敏感度极高，错题绝不下高注，做对从不犹疑，知己所知，战绩期望极优。",
  },

  [CognitiveArchetype.ADAPTIVE_LEARNER]: {
    archetype: CognitiveArchetype.ADAPTIVE_LEARNER,
    quadrant_code: "Q2-EVO",
    role_title: "灵窍天开",
    english_title: "The Adaptive Learner",
    praise_tagline: "心开一窍 · 融会贯通",
    strength_tags: ["顶级自省悟性", "极高成长上限", "敏锐求真直觉", "知己所不知"],
    empowering_feedback:
      "典出古典心学：‘心开一窍，万象昭然’。您拥有所有卓越学习者中最罕见、最珍稀的终极天赋——对自身掌控边界的极高诚实度与洞察力！面对全新陌生的抽象规则，您对‘何时该攻、何时该守、何时该借力’的感知极其敏锐。您能精准识破盲区、主动借助外界线索化险为夷，这意味着在任何陌生领域，您都拥有比常人快数倍的纠错与进化速度，蓄势顿悟之日必震惊四方！",
    growth_advice:
      "极具无限成长上限的敏锐进化者，在给予充分的专业方法与工具沉淀后，一旦融会贯通，必将顿悟蜕变为无可挑剔的领域宗师。",
    skills: [
      {
        icon: "🪞",
        type: "被动特技",
        name: "灵台自照",
        desc: "天生具备超高灵觉敏锐度，无论规则多陌生，都能瞬间感知‘哪里是已知，哪里是盲区’，对不知抱有绝对清醒。",
      },
      {
        icon: "🛡️",
        type: "核心特技",
        name: "灵台避险",
        desc: "感知到视野模糊或不确定陷阱时触发避险雷达，善于借助外界线索启发与审慎保底完成安全过渡。",
      },
      {
        icon: "⚡",
        type: "觉醒绝技",
        name: "灵窍蜕变",
        desc: "拥有全矩阵中最高倍率的学习吸收上限，每一个外界线索与失误都会被极速转化为底层认知资产，厚积薄发。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "前沿赛道破壁者",
        desc: "全新未知赛道探索、高复杂度新体系快速吸收、重大风险防御监督员。",
      },
    ],
    clinical_summary:
      "低一元·高二元·高信息杠杆。推演暂时受限，但自我认知边界极清醒，极擅长利用 Tier 1/2 线索挽救失误，Coachability 极高，成长天花板巨大。",
  },

  [CognitiveArchetype.VIGILANT_SENTINEL]: {
    archetype: CognitiveArchetype.VIGILANT_SENTINEL,
    quadrant_code: "Q3-SEN",
    role_title: "定海神针",
    english_title: "The Sentinel",
    praise_tagline: "渊渟岳峙 · 固若金汤",
    strength_tags: ["过硬深厚实力", "严谨求实作风", "极高责任底线", "定海安邦基石"],
    empowering_feedback:
      "请给您自己更多的掌声与信任——客观概率证明，您的深层实力远比您想象的更强大！您不仅客观解题正确率高超，功底极其过硬，更难能可贵的是对每一个判断都抱有极高的敬畏之心与缜密作风。您不贪功冒进、步步为营，凡事追求稳健周全。在任何关键项目与组织中，您都是最值得托付后背、确保万无一失的‘定海神针’与品质守卫者！",
    growth_advice:
      "客观数据表明，您的直觉与推导成功率极高，根本不是‘猜的’，而是深厚潜意识实力的体现！在未来的挑战中，完全可以更加自信地大展拳脚，相信自己的第一判断！",
    skills: [
      {
        icon: "🏛️",
        type: "被动技能",
        name: "玄武磐石",
        desc: "潜意识解题推导命中率极高（数学概率证明硬实力本能），在面对高难度挑战时防御下限极高。",
      },
      {
        icon: "🔍",
        type: "核心特技",
        name: "万无一失",
        desc: "对交付成果和判断保持极高敬畏，严密求证复核，绝不贪功冒进，杜绝任何黑天鹅纰漏。",
      },
      {
        icon: "🌊",
        type: "觉醒绝技",
        name: "镇海乾坤",
        desc: "在团队面临不确定性风暴与惊涛骇浪时，只要神针在场便能稳住大局，成为所有伙伴最信任的定心丸。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "核心命脉守门人",
        desc: "高容错关键系统把关、重大工程质量总舵手、组织核心底盘守卫者。",
      },
    ],
    clinical_summary:
      "高一元·审慎二元·过度谨慎。一元硬实力扎实，但存在冒名顶替偏向（Impostor Syndrome），做对时频繁保守下保底注，宁可少拿分绝不冒进，守底极稳。",
  },

  [CognitiveArchetype.AUDACIOUS_PIONEER]: {
    archetype: CognitiveArchetype.AUDACIOUS_PIONEER,
    quadrant_code: "Q4-PIO",
    role_title: "飞龙在天",
    english_title: "The Audacious Pioneer",
    praise_tagline: "飞龙骑脸 · 我怎么输",
    strength_tags: ["雄厚攻坚底蕴", "先锋拍板魄力", "大开大合进攻", "气吞万里如虎"],
    empowering_feedback:
      "《易经》有云：‘飞龙在天，利见大人’。您的客观分析与逻辑推理功底极其扎实过硬，在多项高难度抽象挑战中一路势如破竹！同时，您身上流淌着最纯粹的‘先锋战神’之血——面临不确定时敢于拍板、敢打硬仗、全场梭哈、进取心极强，具有压倒性的进攻统治力。在团队面临僵局或攻坚破冰时，您往往是能够挺身而出、一锤定音的中流砥柱！",
    growth_advice:
      "您的客观攻坚实力已处于金字塔前列。若能在面对偶发的复杂盲区时，稍稍增加一道‘审慎复核’或求助验证的缓冲阀，您的腾飞之势将更加无懈可击、攻无不克！",
    skills: [
      {
        icon: "🔥",
        type: "被动技能",
        name: "真龙威压",
        desc: "客观攻坚底蕴与逻辑推理极度雄厚，面对高难度挑战自带破阵光环，推理快准狠，天生自带进攻压迫感。",
      },
      {
        icon: "⚔️",
        type: "核心特技",
        name: "长空扑杀",
        desc: "全场最果决的拍板魄力与进攻欲望，深信自我判断，全额高注起手，以气吞万里之势碾压一切迷雾与僵局。",
      },
      {
        icon: "⚡",
        type: "觉醒绝技",
        name: "九霄龙吟",
        desc: "遇强则强，越是硬仗越能激发无限战意。只要在关键时刻稍加一道理性缓冲环，便能成为无可匹敌的常胜战神。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "攻坚破冰先锋",
        desc: "硬核攻坚战绝杀手、僵局突围先头部队、高对抗高压力业务拓展大将。",
      },
    ],
    clinical_summary:
      "高一元·激进冒险·进攻破局。推演底蕴扎实，但二阶风控较宽，遇到偶发盲区依然果断拍板前压，极少购买线索，攻坚破局魄力极强，高方差先锋。",
  },

  [CognitiveArchetype.ANXIOUS_RETREATER]: {
    archetype: CognitiveArchetype.ANXIOUS_RETREATER,
    quadrant_code: "Q5-RET",
    role_title: "大音希声",
    english_title: "The Formless Sentinel",
    praise_tagline: "大音希声 · 大象无形",
    strength_tags: ["深邃内敛定力", "敏锐见微知著", "抱朴守拙敬畏", "守土有责底盘"],
    empowering_feedback:
      "典出《道德经》：‘大音希声，大象无形’。您展现出深邃沉静的心智定力！在面对复杂迷雾与未知的潜在风险时，您深知‘大巧若拙、抱朴守真’之理，始终保持着极高的审慎敬畏与防守纪律，绝不盲目浮躁冒进。在高度不确定的商业博弈或工程试炼中，这种‘于无声处听惊雷、于无形中守阵地’的笃定与严密防线，往往是守护团队生存底盘最坚不可摧的终极底蕴！",
    growth_advice:
      "拥有天然的合规与风险预警直觉。在守住安全底线的同时，可以尝试在低风险情境下更多主动探索外部工具，逐步开拓更广阔的进攻战果。",
    skills: [
      {
        icon: "🤫",
        type: "被动特技",
        name: "希声守拙",
        desc: "面对未知迷雾本能抱朴守拙，杜绝任何轻浮冒进与侥幸无谓损失，守底极深。",
      },
      {
        icon: "📡",
        type: "核心特技",
        name: "辨音于微",
        desc: "对复杂局势中的微小异动与风险信号明察秋毫，在危机初显前守住交付底线与命脉防线。",
      },
      {
        icon: "🏔️",
        type: "觉醒绝技",
        name: "大象无形",
        desc: "在外部动荡与波动中坚如磐石、深藏若虚，化身不可动摇的防线基石与定盘锚点。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "风险合规压舱石",
        desc: "高风险业务底线防火墙、风控合规审查督导、复杂环境守底尖兵。",
      },
    ],
    clinical_summary:
      "低一元·防御避险·审慎守护。推演处于基底探索期，对未知具有高度敬畏，下注极其克制审慎，绝不盲目梭哈，擅长在迷雾中守住防线与底线。",
  },

  [CognitiveArchetype.BLIND_GAMBLER]: {
    archetype: CognitiveArchetype.BLIND_GAMBLER,
    quadrant_code: "Q6-GAM",
    role_title: "无畏先锋",
    english_title: "The Vanguard",
    praise_tagline: "左手高伤害 · 右手伤害高",
    strength_tags: ["开拓者基因", "无畏未知探索", "极致行动魄力", "百炼成钢韧性"],
    empowering_feedback:
      "您展现出令人敬佩的开拓者勇气与行动魄力！面对高度抽象、完全陌生的崭新领域，许多人会裹足不前、反复犹豫，而您却敢想敢拼、勇于直面未知的迷雾，在实践中积极探索前行。人类历史上所有的开辟者与破局先驱，无不源自这种‘敢为人先、不惧失误’的无畏精神！",
    growth_advice:
      "先锋的最大红利在于快速积累实战经验。伴随着在实践中的多维度复盘与实战沉淀，您这柄勇往直前的‘破局之剑’必将愈发锋利，迅速成长为不可阻挡的实战猛将！",
    skills: [
      {
        icon: "🚩",
        type: "被动特技",
        name: "破晓勇气",
        desc: "面对未知黑夜与抽象迷雾毫无内耗，行动力永远大于焦虑，敢想敢做，拥有天生的破界者基因。",
      },
      {
        icon: "⚡",
        type: "核心特技",
        name: "向险而行",
        desc: "以实战试错为最高信仰，在他人犹豫徘徊时率先涉足深水区，用身体力行去探索可能与探明虚实。",
      },
      {
        icon: "🛡️",
        type: "觉醒绝技",
        name: "百炼成钢",
        desc: "拥有极强的心理抗挫力与反脆弱性，每一次碰撞与试错都是锻造锋刃的烈火，在持续摸索中迅速蜕变。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "从0到1破界尖兵",
        desc: "敏捷突击部队、早期创新孵化先锋、无人区探索敢死队。",
      },
    ],
    clinical_summary:
      "低一元·低二元·达克自负。经典达克效应态。错题高注率极高 P(HighBet|Err) > 0.55，感知不到陷阱盲区，行动力强，敢于以身试错。",
  },

  [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
    archetype: CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
    quadrant_code: "Q7-ARB",
    role_title: "诸葛在世",
    english_title: "The Pragmatic Strategist",
    praise_tagline: "羽扇纶巾 · 算无遗策",
    strength_tags: ["极致概率精算", "草船借箭智慧", "四两拨千斤", "数学期望大师"],
    empowering_feedback:
      "您展现出令人拍案叫绝的‘诸葛在世’运筹博弈造诣！您是纯粹的数学期望大师与战略借力典范，深谙‘草船借箭、算无遗策’的高维智慧。面对未知疑难，您从不盲目硬抗蛮干，而是精于借助外界工具与信息杠杆攻守转换、借力打力。这种‘以巧破千钧、算尽先机’的运筹哲学，是顶尖谋略家与军师总参的绝对王牌！",
    growth_advice:
      "精通资源整合与杠杆效能，在复杂多变量约束、资源受限的极限博弈场景中，往往能以最小代价达成最大战略意图。",
    skills: [
      {
        icon: "🧮",
        type: "被动特技",
        name: "算无遗策",
        desc: "实时评估局势胜率与数学期望，对每一份资源投入的边际效用洞若观火，追求全局期望最大化。",
      },
      {
        icon: "🏹",
        type: "核心特技",
        name: "草船借箭",
        desc: "极精于利用外部工具穿透复杂迷雾，用微小线索成本换取决定性翻盘胜利，转化率高超。",
      },
      {
        icon: "📜",
        type: "觉醒绝技",
        name: "锦囊奇谋",
        desc: "把握高则果决下重注，存疑则调动锦囊对冲风险，以巧破千钧，在多重约束中收割最高净胜收益。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "核心谋略军师",
        desc: "资源受限攻坚统筹、高阶投融资策略博弈、战略谈判攻守操盘手。",
      },
    ],
    clinical_summary:
      "中高一元·高二元·系统性概率套利。纯粹的数学期望最大化者。把握高则全额下注，存疑则果断购入线索穿透，收益期望极高，极精于借力打力。",
  },

  [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
    archetype: CognitiveArchetype.STOCHASTIC_DRIFTER,
    quadrant_code: "Q8-DRI",
    role_title: "暮光星灵",
    english_title: "The Twilight Celestial",
    praise_tagline: "逍遥天地 · 不滞于物",
    strength_tags: ["自由纯粹直觉", "跳脱常规框架", "混沌孕育灵感", "灵动非线性思维"],
    empowering_feedback:
      "您展现出超脱常规框架的‘暮光星灵’独特灵动！您的思维不拘泥于既定规则与刻板推导的束缚，如同穿梭在浩瀚星轨中的自由光束，凭借纯粹敏锐的跳跃直觉在混沌中游走探索。在墨守成规无法打破的极端复杂瓶颈中，这种跳脱直觉往往能跨越已知边界，意外孕育出颠覆性的奇迹灵感！",
    growth_advice:
      "天生具有非线性发散思维的特质。若能在自由漫游的基础上，建立起属于自己的沉淀锚点，您的灵动直觉将绽放出无与伦比的创造力。",
    skills: [
      {
        icon: "🌌",
        type: "被动特技",
        name: "星界漫步",
        desc: "超脱固有逻辑与教条束缚，在多变混沌的复杂星域中凭借纯粹灵性本能穿行，灵动洒脱。",
      },
      {
        icon: "✨",
        type: "核心特技",
        name: "奇点闪烁",
        desc: "行为轨迹不可预测，跳出常规推演套路，在看似无序的探索中偶发惊艳奇解。",
      },
      {
        icon: "🚀",
        type: "觉醒绝技",
        name: "星轨跃迁",
        desc: "面对极端高压或僵局时具备绝佳的情绪解耦与心理弹性，不滞于一时得失，放眼星河。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "颠覆灵感破界者",
        desc: "概念验证头脑风暴、破除思维定势顾问、奇思妙想创意源泉。",
      },
    ],
    clinical_summary:
      "决策脱钩·纯高熵漫游态。行为模式呈现高度随机猜测，下注动作与真实正误完全脱钩，处于纯直觉游走或测试动机脱失状态。",
  },
};

/**
 * Spec §6.1 MECE 单向超平面判别算法
 * 严格单向拓扑判定，满足无死角、无重叠、无荒谬兜底
 */
export function classifyCognitiveArchetype(x: {
  dStar: number;          // [0, 1] 相变突破度
  dPrime: number;         // [0, 5] 一元辨别力
  mRatio: number;         // [0, 3] 元认知效率
  bias: number;           // [-1, 1] 置信偏差
  brier: number;          // [0, 1] Brier 评分
  ive: number;            // [0, 1] 信息价值效率
  hintsCount: number;     // >= 0 线索购买次数
}): CognitiveArchetype {
  // Step 1: 高熵混沌漫游态判定 (极度严格，杜绝正常谨慎者误入)
  if (x.brier > 0.28 && x.mRatio < 0.35) {
    return CognitiveArchetype.STOCHASTIC_DRIFTER; // Q8-DRI
  }

  // Step 2: 系统性概率套利者判定 (必须具备充足线索样本与高效利用)
  if (x.hintsCount >= 3 && x.ive >= 0.70 && x.mRatio >= 0.65) {
    return CognitiveArchetype.PRAGMATIC_ARBITRAGEUR; // Q7-ARB
  }

  // Step 3: 一元认知能力划分 (相变突破度 D* >= 0.60 或 d' >= 1.40)
  const isHighFirstOrder = x.dStar >= 0.60 || x.dPrime >= 1.40;

  if (isHighFirstOrder) {
    // 天花板高维自洽保护 (Ceiling Effect Calibration Protection):
    // 当一元辨别力极高 (d' >= 2.20 或 D* >= 0.85) 且置信偏差处于黄金自洽带 (|bias| <= 0.15) 时，
    // 错误样本极度稀疏 (零/极少错题) 会造成 Type-2 SDT 统计分母放大从而压低 M_ratio (天花板压缩效应)。
    // 此时模型客观上知行高度自洽、无盲目冒进 (Brier 极低)，属于知行合一的【人形外挂】(Q1-CAL)
    const isCeilingMaster = (x.dPrime >= 2.20 || x.dStar >= 0.85) && Math.abs(x.bias) <= 0.15;

    // 高一元分支：知行自洽 vs 谨慎守舵 vs 果敢进攻
    if ((x.mRatio >= 0.80 || isCeilingMaster) && Math.abs(x.bias) <= 0.15) {
      return CognitiveArchetype.SOVEREIGN; // Q1-CAL (人形外挂)
    }
    if (x.bias < -0.12) {
      return CognitiveArchetype.VIGILANT_SENTINEL; // Q3-SEN (定海神针)
    }
    return CognitiveArchetype.AUDACIOUS_PIONEER; // Q4-PIO (飞龙在天)
  } else {
    // 低一元分支 (D* < 0.60 且 d' < 1.40)：自省进化 vs 达克盲赌 vs 审慎避险
    // 1. 具有高二元线索借力能力与进化潜力的自省者 (主动借助外部工具穿透盲区)
    if (x.hintsCount >= 2 && x.ive >= 0.60 && x.mRatio >= 0.60) {
      return CognitiveArchetype.ADAPTIVE_LEARNER; // Q2-EVO (展示为: 灵窍天开)
    }

    // 2. 达克盲赌者截断：低一元且显著过度自信 (bias > 0.15)
    // 既不积极借力工具，又盲目押注，无论其小样本下 mRatio 数学计算是否因极小分母偶发偏高，其行为本质均为达克盲赌
    if (x.bias > 0.15) {
      return CognitiveArchetype.BLIND_GAMBLER; // Q6-GAM (展示为: 无畏先锋)
    }

    // 3. 高二元自照者 (bias <= 0.15 且 mRatio >= 0.80)：无需线索也能清醒知己不知
    if (x.mRatio >= 0.80) {
      return CognitiveArchetype.ADAPTIVE_LEARNER; // Q2-EVO (展示为: 灵窍天开)
    }

    // 4. 审慎本分且无盲赌恶习的低一元防御者 (bias <= 0.15 且 mRatio < 0.80)
    return CognitiveArchetype.ANXIOUS_RETREATER; // Q5-RET (展示为: 大音希声)
  }
}

export function getArchetypeDefinition(
  archetype: CognitiveArchetype,
  locale?: SupportedLocale
): ArchetypeDefinition {
  const targetLocale = locale || getLocale();
  const baseDef = ARCHETYPE_MATRIX[archetype] || ARCHETYPE_MATRIX[CognitiveArchetype.SOVEREIGN];
  if (targetLocale === "zh-CN") {
    return baseDef;
  }
  const dict = getDictionary(targetLocale);
  const localized = dict?.archetypes?.[archetype];
  if (!localized) {
    return baseDef;
  }

  return {
    ...baseDef,
    role_title: localized.role_title,
    english_title: localized.role_title,
    praise_tagline: localized.praise_tagline,
    strength_tags: localized.strength_tags,
    empowering_feedback: localized.empowering_feedback,
    growth_advice: localized.growth_advice,
    skills: baseDef.skills.map((baseSkill, idx) => ({
      ...baseSkill,
      type: localized.skills[idx]?.type || baseSkill.type,
      name: localized.skills[idx]?.name || baseSkill.name,
      desc: localized.skills[idx]?.desc || baseSkill.desc,
      icon: baseSkill.icon,
    })),
    clinical_summary: localized.clinical_summary,
  };
}

/**
 * 历史遗留 v1 字符串映射与无损容错转换
 */
export function mapLegacyArchetype(val: string): CognitiveArchetype {
  switch (val) {
    case "ACCURATELY_CALIBRATED":
    case "Q1_MASTER":
    case "人形外挂":
    case "SOVEREIGN":
    case "Q1-CAL":
      return CognitiveArchetype.SOVEREIGN;

    case "Q2_FUTURE_MASTER":
    case "ADAPTIVE_LEARNER":
    case "Q2-EVO":
    case "灵窍天开":
      return CognitiveArchetype.ADAPTIVE_LEARNER;

    case "UNDERCONFIDENT":
    case "Q3_METICULOUS_CRAFTSMAN":
    case "VIGILANT_SENTINEL":
    case "Q3-SEN":
    case "定海神针":
      return CognitiveArchetype.VIGILANT_SENTINEL;

    case "OVERCONFIDENT":
    case "Q3_BOLD_TRAILBLAZER":
    case "AUDACIOUS_PIONEER":
    case "Q4-PIO":
    case "飞龙在天":
      return CognitiveArchetype.AUDACIOUS_PIONEER;

    case "ANXIOUS_RETREATER":
    case "Q5-RET":
    case "大音希声":
      return CognitiveArchetype.ANXIOUS_RETREATER;

    case "BLIND_GAMBLER":
    case "Q4_BRAVE_EXPLORER":
    case "Q6-GAM":
    case "无畏先锋":
      return CognitiveArchetype.BLIND_GAMBLER;

    case "PRAGMATIC_ARBITRAGEUR":
    case "Q7-ARB":
    case "诸葛在世":
      return CognitiveArchetype.PRAGMATIC_ARBITRAGEUR;

    case "RANDOM_GUESSER":
    case "STOCHASTIC_DRIFTER":
    case "Q8-DRI":
    case "暮光星灵":
      return CognitiveArchetype.STOCHASTIC_DRIFTER;

    default:
      return CognitiveArchetype.SOVEREIGN;
  }
}
