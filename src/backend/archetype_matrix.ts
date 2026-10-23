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
        name: "极速进化先驱",
        desc: "前沿技术首探、跨学科跨代际融合攻坚、高潜智囊智囊团。",
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
    strength_tags: ["极限风险防御", "深藏不露底蕴", "零黑天鹅失误", "严谨守成纪律"],
    empowering_feedback:
      "典出东方兵家定力：‘渊渟岳峙，其重万钧’。您拥有让所有人肃然起敬的超强底层功底与极致沉稳的慎重心性！即便客观推演能力已达巅峰，您依然对未知抱有最大的敬畏，绝不因一时侥幸而让全局涉险。有您坐镇的防线坚不可摧，永远不会出现任何非预期的黑天鹅溃败。这种‘功在暗处、润物无声’的定海神针底蕴，是关键护城河的绝对守护神！",
    growth_advice:
      "您的真实客观实力远比自己主观以为的更加强悍！在建立扎实安全冗余后，请更加大胆地信任自己的第一直觉，主动出击拓宽战果。",
    skills: [
      {
        icon: "🏛️",
        type: "被动特技",
        name: "绝对壁垒",
        desc: "面临模糊陷阱或险恶迷局时，自动启动最高防御戒备，永远留有安全底牌，彻底杜绝致命溃退风险。",
      },
      {
        icon: "🔍",
        type: "核心特技",
        name: "深水沉锚",
        desc: "底层推演功力极其过硬扎实，但习惯将大部分高胜率局面归入稳健防线，零冒进、零投机、行胜于言。",
      },
      {
        icon: "🌊",
        type: "觉醒绝技",
        name: "神针定海",
        desc: "当遭遇全盘系统性混乱或逆境危机时，以绝对稳定的心理素质坚守底线，化解一切黑天鹅动荡。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "关键基石守护神",
        desc: "高危生产防线、核心资金与安全底线、重大交付压舱石。",
      },
    ],
    clinical_summary:
      "高一元·审慎防御·轻度低估。客观推演扎实过硬，但二阶下注偏向过度保守，将大量本已确定的胜局归为保底，行事极度稳健。",
  },

  [CognitiveArchetype.AUDACIOUS_PIONEER]: {
    archetype: CognitiveArchetype.AUDACIOUS_PIONEER,
    quadrant_code: "Q4-PIO",
    role_title: "飞龙在天",
    english_title: "The Audacious Pioneer",
    praise_tagline: "飞龙骑脸 · 我怎么输",
    strength_tags: ["摧枯拉朽压迫", "先锋进攻本能", "破局突围气魄", "强大攻坚自信"],
    empowering_feedback:
      "典出易经乾卦乾坤之象：‘飞龙在天，利见大人’。您展现出令人热血沸腾的无敌王者气魄与顶级攻坚实力！您不仅在复杂推演中具备凌厉的攻坚穿透力，更拥有敢为天下先的昂扬战意。在您眼中，难题不是阻碍而是猎物，永远选择以最主动、最具压迫感的方式正面碾压。这种‘勇冠三军、气吞万里’的先锋魄力，正是破除僵局、开疆拓拓土不可或缺的破壁利刃！",
    growth_advice:
      "天生的开路先锋与攻坚主将。如果在冲锋之时为自己配备一位洞悉死角的审慎参谋或轻量校验机制，您的攻势将彻底无懈可击！",
    skills: [
      {
        icon: "🔥",
        type: "被动特技",
        name: "先锋锋芒",
        desc: "天生自带破局攻坚加成，面对高维复杂迷题时从不退缩，以极高的能量密度和推演速度正面撕开防线。",
      },
      {
        icon: "⚔️",
        type: "核心特技",
        name: "气吞万里",
        desc: "战意昂扬，对自己的每一个判断充满信心，进攻火力拉满，在优势局中能以最快速度滚起胜利雪球。",
      },
      {
        icon: "⚡",
        type: "觉醒绝技",
        name: "飞龙破局",
        desc: "在全场陷入胶着死局时，以惊人的决断力率先拍板，带领团队强行突围冲出包围圈。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "战略开路先锋",
        desc: "从 0 到 1 破局战役、新业务拓荒突击队、硬核攻坚排头兵。",
      },
    ],
    clinical_summary:
      "高一元·进攻型·轻度过信。客观实力雄厚，倾向于全盘进攻下注，但在偶发盲区出现时缺乏自省刹车，存在轻微期望磨损。",
  },

  [CognitiveArchetype.ANXIOUS_RETREATER]: {
    archetype: CognitiveArchetype.ANXIOUS_RETREATER,
    quadrant_code: "Q5-RET",
    role_title: "大音希声",
    english_title: "The Formless Sentinel",
    praise_tagline: "大音希声 · 大象无形",
    strength_tags: ["极限风险避害", "敏锐危机嗅觉", "敬畏未知守则", "宁静致远心境"],
    empowering_feedback:
      "典出道家玄妙妙音：‘大音希声，大象无形’。您展现出非同寻常的宁静致远与深邃克制！在充斥着喧嚣浮躁的决策博弈中，您从不因贪恋虚幻浮利而轻易涉险。您对潜在的不确定性有着超乎寻常的敏感嗅觉，总能在风暴来临前悄然驻足、守住最根本的生存根基。这种‘不争一时、知止不殆’的至上清醒，是保护核心火种、在漫长周期中笑到最后的终极智慧！",
    growth_advice:
      "守正防危的卓越践行者。在巩固自身扎实安全冗余的同时，可尝试在可控的小范围内迈出探索步伐，您会发现自己的潜在能量远超想象。",
    skills: [
      {
        icon: "🤫",
        type: "被动特技",
        name: "静水流深",
        desc: "天生对外界复杂风险保有天然免疫屏障，心如止水，绝不在情绪上火或胜负欲驱使下做出非理性决策。",
      },
      {
        icon: "📡",
        type: "核心特技",
        name: "见微知著",
        desc: "对潜在模糊陷阱与规则暗礁有着超越常人的警觉性，一旦察觉盲区立刻收拢防线，守护基本盘。",
      },
      {
        icon: "🏔️",
        type: "觉醒绝技",
        name: "希声避世",
        desc: "在面对高烈度不确定性绞杀时，以极高的自律性执行安全防御协议，彻底免受全局崩盘之灾。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "安全合规守护者",
        desc: "风控合规审查、系统高可用容灾、生存底线红线督察。",
      },
    ],
    clinical_summary:
      "低一元·高防御·风险厌恶。客观推演准确率偏低，二阶下注极度审慎偏好保底，但对盲区有自知之明，未出现恶性盲赌。",
  },

  [CognitiveArchetype.BLIND_GAMBLER]: {
    archetype: CognitiveArchetype.BLIND_GAMBLER,
    quadrant_code: "Q6-GAM",
    role_title: "无畏先锋",
    english_title: "The Vanguard",
    praise_tagline: "左手高伤害 · 右手伤害高",
    strength_tags: ["不屈无畏魄力", "天生乐天开拓", "敢于直面深渊", "高频试错韧性"],
    empowering_feedback:
      "典出热血电竞传奇：‘向前一步是悬崖，退后一步是深渊，那我选择跃向深空！’您拥有整个矩阵中最炽热、最纯粹的无畏冒险精神！无论迷雾多重、规则多艰，您永远不会被恐惧困在原地，而是毫不犹豫地全仓下注、正面迎击未知。这种‘明知山有虎、偏向虎山行’的极致勇气与乐天气概，正是人类文明最宝贵的开荒火种——百炼成钢之后，必成惊世传奇！",
    growth_advice:
      "天生拥有全矩阵最顶级的无畏胆魄！若能在冲锋陷阵的关键刹那增加一道‘知彼知己’的冷静复盘阀，您的惊世锋芒将化为真正的一锤定音。",
    skills: [
      {
        icon: "🚩",
        type: "被动特技",
        name: "无畏炽心",
        desc: "拥有无可撼动的超强心理韧性，从不畏惧任何未知的挫折或复杂迷局，永远保持 100% 的昂扬战意。",
      },
      {
        icon: "⚡",
        type: "核心特技",
        name: "豪赌破局",
        desc: "在任何局面下均敢于全仓进攻，以极大的气势压迫未知迷宫，具备强大的高频暴力试错破冰能力。",
      },
      {
        icon: "🛡️",
        type: "觉醒绝技",
        name: "逆光行者",
        desc: "在看似毫无希望的至暗时刻依然敢于正面迎击深渊，在千锤百炼中淬炼出最坚韧的精神内核。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "破釜沉舟突击队",
        desc: "极限脱困爆破、高压绝境攻坚、试错排雷突击手。",
      },
    ],
    clinical_summary:
      "低一元·高过信·盲目下注（达克效应高危区）。客观实力薄弱但二阶盲目拉满高注，严重缺乏对自身盲区的感知，期望损耗巨大。",
  },

  [CognitiveArchetype.PRAGMATIC_ARBITRAGEUR]: {
    archetype: CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
    quadrant_code: "Q7-ARB",
    role_title: "诸葛在世",
    english_title: "The Pragmatic Strategist",
    praise_tagline: "羽扇纶巾 · 算无遗策",
    strength_tags: ["极致博弈精算", "极高信息收益", "善借外力杠杆", "效用期望大师"],
    empowering_feedback:
      "典出千古军师神韵：‘羽扇纶巾谈笑间，樯橹灰飞烟灭’。您展现出令人击节赞叹的当代顶级运筹精算水准！在复杂的规则迷局中，您绝不蛮干硬冲，而是以最优雅的博弈智慧洞察全局效用。您深谙‘善假于物也’的真谛，总能在最关键的节点以极小的信息成本撬动决定性的胜利战果。这种‘算无遗策、运筹帷幄’的决策杠杆大师风范，是现代社会无可替代的首席智囊！",
    growth_advice:
      "顶级的运筹智囊与套利精算大师。非常适合在大规模资源调度、战略博弈与全局期望收益优化中运筹帷幄，统揽胜局。",
    skills: [
      {
        icon: "🧮",
        type: "被动特技",
        name: "草船借箭",
        desc: "天生对外界信息的增量价值有极高辨识度，以 1 分代价精准撬动超额期望收益，信息转化效率冠绝全矩阵。",
      },
      {
        icon: "🏹",
        type: "核心特技",
        name: "神机妙算",
        desc: "随时随地建立清晰的期望收益平衡木，何时借力、何时进攻计算得分毫不差，杜绝任何无效资源损耗。",
      },
      {
        icon: "📜",
        type: "觉醒绝技",
        name: "东风借势",
        desc: "在复杂混沌的动态博弈中以四两拨千斤之势顺势而为，完成对全局期望走势的掌控与收益收割。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "首席运筹军师",
        desc: "资源配置精算、商务谈判策略把控、博弈收益最大化操盘手。",
      },
    ],
    clinical_summary:
      "高效用·善借杠杆·精算博弈。信息购买杠杆极高（IVE 优异），深谙效用博弈规则，极善于用极小线索成本博取巨大收益翻盘。",
  },

  [CognitiveArchetype.STOCHASTIC_DRIFTER]: {
    archetype: CognitiveArchetype.STOCHASTIC_DRIFTER,
    quadrant_code: "Q8-DRI",
    role_title: "暮光星灵",
    english_title: "The Twilight Celestial",
    praise_tagline: "逍遥天地 · 不滞于物",
    strength_tags: ["超脱直觉跳跃", "自由漫游心智", "不受框架羁绊", "灵动发散灵感"],
    empowering_feedback:
      "典出庄子逍遥游之境：‘若夫乘天地之正，而御六气之辩’。您展现出如天马行空般不受拘束的灵动心境！面对严苛刻板的抽象逻辑推演，您始终保持着最超然、最松弛的随性姿态。在常规推演陷入死胡同的世界里，唯有像您这样不墨守成规、敢于打破逻辑藩篱的跳脱灵魂，才能在不经意间捕捉到跨越维度的灵感火花。这种‘灵动超然、不滞于物’的自由心性，是跨界创新的无价源泉！",
    growth_advice:
      "拥有极佳发散直觉的灵感探索者。在自由漫游的同时，如果能在关键节点为自己树立一个固定的逻辑基准锚点，您的奇思妙想将爆发颠覆性力量。",
    skills: [
      {
        icon: "🌌",
        type: "被动特技",
        name: "星之自由",
        desc: "思维模式完全不受任何既定框架与刻板思维所拘束，能够在广袤的概念荒原中进行无拘无束的直觉漫游。",
      },
      {
        icon: "✨",
        type: "核心特技",
        name: "灵感闪烁",
        desc: "偶发跨维度的灵感火花闪现，在最意想不到的角度打破常规认知盲区，展现极高的思维发散力。",
      },
      {
        icon: "🚀",
        type: "觉醒绝技",
        name: "逍遥星游",
        desc: "在面对高压规则环境时保持超然松弛的心态，以独特的非线性直觉方式穿梭于多维信息空间之中。",
      },
      {
        icon: "🌟",
        type: "战场羁绊",
        name: "非常规创意策源地",
        desc: "跨界脑暴突发奇想、先锋艺术与概念设计、破除思维惯性催化剂。",
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

  // 天花板高维自洽保护 (Ceiling Effect Calibration Protection):
  // 当一元辨别力极高 (d' >= 2.20 或 D* >= 0.85) 且置信偏差处于黄金自洽带 (|bias| <= 0.15) 时，
  // 错误样本极度稀疏 (零/极少错题) 会造成 Type-2 SDT 统计分母放大从而压低 M_ratio (天花板压缩效应)。
  // 此时模型客观上知行高度自洽、无盲目冒进 (Brier 极低)，属于知行合一的【人形外挂】(Q1-CAL)
  const isCeilingMaster = (x.dPrime >= 2.20 || x.dStar >= 0.85) && Math.abs(x.bias) <= 0.15;

  // Step 3: 一元认知能力划分 (严格由相变突破度 D* >= 0.60 主导，废除 || dPrime >= 1.40 漏洞)
  const isHighFirstOrder = x.dStar >= 0.60 || isCeilingMaster;

  if (isHighFirstOrder) {
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

export function resolveArchetype(input: CognitiveArchetype | string): CognitiveArchetype {
  if (!input) return CognitiveArchetype.SOVEREIGN;
  if (ARCHETYPE_MATRIX[input as CognitiveArchetype]) {
    return input as CognitiveArchetype;
  }
  const str = String(input).trim().toUpperCase();
  const quadrantMap: Record<string, CognitiveArchetype> = {
    "Q1-CAL": CognitiveArchetype.SOVEREIGN,
    "Q2-EVO": CognitiveArchetype.ADAPTIVE_LEARNER,
    "Q3-SEN": CognitiveArchetype.VIGILANT_SENTINEL,
    "Q4-PIO": CognitiveArchetype.AUDACIOUS_PIONEER,
    "Q5-RET": CognitiveArchetype.ANXIOUS_RETREATER,
    "Q6-GAM": CognitiveArchetype.BLIND_GAMBLER,
    "Q7-ARB": CognitiveArchetype.PRAGMATIC_ARBITRAGEUR,
    "Q8-DRI": CognitiveArchetype.STOCHASTIC_DRIFTER,
  };
  if (quadrantMap[str]) {
    return quadrantMap[str];
  }
  for (const [key, def] of Object.entries(ARCHETYPE_MATRIX)) {
    if (def.role_title === input || def.english_title.toUpperCase() === str) {
      return key as CognitiveArchetype;
    }
  }
  const dictEn = getDictionary("en-US");
  for (const [key, val] of Object.entries(dictEn.archetypes)) {
    if (val.role_title.toUpperCase() === str) {
      return key as CognitiveArchetype;
    }
  }
  return CognitiveArchetype.SOVEREIGN;
}

export function getArchetypeDefinition(
  archetype: CognitiveArchetype | string,
  locale?: SupportedLocale
): ArchetypeDefinition {
  const targetLocale = locale || getLocale();
  const canonical = resolveArchetype(archetype);
  const baseDef = ARCHETYPE_MATRIX[canonical] || ARCHETYPE_MATRIX[CognitiveArchetype.SOVEREIGN];
  const dict = getDictionary(targetLocale);
  const localized = dict?.archetypes?.[canonical];
  if (!localized) {
    return baseDef;
  }

  return {
    ...baseDef,
    role_title: localized.role_title,
    english_title: targetLocale === "en-US" ? localized.role_title : baseDef.english_title,
    praise_tagline: localized.praise_tagline,
    strength_tags: localized.strength_tags,
    empowering_feedback: localized.empowering_feedback,
    growth_advice: localized.growth_advice,
    skills: baseDef.skills.map((baseSkill, idx) => ({
      ...baseSkill,
      type: localized.skills?.[idx]?.type || baseSkill.type,
      name: localized.skills?.[idx]?.name || baseSkill.name,
      desc: localized.skills?.[idx]?.desc || baseSkill.desc,
      icon: baseSkill.icon,
    })),
    clinical_summary: localized.clinical_summary || baseDef.clinical_summary,
  };
}

/**
 * 历史遗留 v1 字符串映射与无损容错转换
 */
export function mapLegacyArchetype(val: string): CognitiveArchetype {
  switch (val) {
    case "ACCURATELY_CALIBRATED":
    case "Q1_MASTER":
    case "SOVEREIGN":
    case "Q1-CAL":
    case "人形外挂":
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
