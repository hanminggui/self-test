import React, { useState, useEffect, useMemo, useRef } from "react";
import CosmicGalaxyCompass from "./CosmicGalaxyCompass";
import {
  ShieldCheck,
  Lock,
  Layers,
  Search,
  RefreshCw,
  Users,
  Brain,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
  Sliders,
  ExternalLink,
  Sparkles,
  Info,
  Compass,
  Zap,
  Filter,
  LayoutGrid,
  PieChart,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

export interface VisualColorToken {
  backgroundColor: string; // hsla 格式
  borderColor: string;     // 高亮边框色
  boxShadow: string;       // 外发光阴影
  hue: number;
}

/**
 * Spec §7.4: 双变量色彩映射纯函数
 * Hue 表达决策偏向倾角 Bias (冷暖双极流向)
 * Saturation, Alpha & Glow 表达信息觅食弹性 IVE (能量充盈度)
 */
export function computeMultivariateColor(
  bias: number, // [-1.0, 1.0], 决策倾角
  ive: number   // [0.0, 1.0], 信息觅食杠杆
): VisualColorToken {
  // 1. 计算色相 Hue (Bias 驱动: 冰蓝 205° -> 翡翠绿 155° -> 炽橙红 15°)
  let hue = 155;
  if (bias < -0.12) {
    const t = Math.min(1.0, Math.max(0.0, (-bias - 0.12) / 0.25));
    hue = Math.round(155 + t * 50); // 155° -> 205°
  } else if (bias > 0.12) {
    const t = Math.min(1.0, Math.max(0.0, (bias - 0.12) / 0.25));
    hue = Math.round(155 - t * 140); // 155° -> 15°
  }

  // 2. 计算饱和度 Saturation 与亮度 Lightness (IVE 驱动)
  const clampedIve = Math.min(1.0, Math.max(0.0, ive));
  const saturation = Math.round(40 + clampedIve * 60); // 40% ~ 100%
  const lightness = Math.round(50 + clampedIve * 10);   // 50% ~ 60%

  // 3. 计算约束透明度 Alpha (IVE 驱动，设立 0.45 保底，杜绝隐形)
  const alpha = (0.45 + clampedIve * 0.55).toFixed(2); // 0.45 ~ 1.00

  // 4. 高杠杆外发光辉光 (IVE >= 0.70 激活)
  const isHighLeverage = clampedIve >= 0.70;
  const boxShadow = isHighLeverage
    ? `0 0 10px hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`
    : "none";

  return {
    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`,
    borderColor: `hsla(${hue}, ${saturation}%, ${Math.min(90, lightness + 20)}%, 0.9)`,
    boxShadow,
    hue,
  };
}

export interface SubjectPoint {
  id: string;
  name: string;
  subject_type: string;
  first_order_accuracy: number;
  second_order_accuracy: number;
  d_prime: number;
  meta_d_prime: number;
  m_ratio: number;
  calibration_bias: number;
  final_score: number;
  is_current?: boolean;
  created_at?: string;
  role_title?: string;
  quadrant_code?: string;
  d_star: number;
  ive: number;
  cognitive_manifold_vector: [number, number, number, number];
  clinical_summary?: string;
}

interface ScatterData {
  baseline_x: number;
  baseline_y: number;
  median_x: number;
  median_y: number;
  mean_x: number;
  mean_y: number;
  subjects: SubjectPoint[];
}

const QUADRANT_PRESETS = [
  { code: "Q1-CAL", defaultTitle: "人形外挂" },
  { code: "Q2-EVO", defaultTitle: "灵窍天开" },
  { code: "Q3-SEN", defaultTitle: "定海神针" },
  { code: "Q4-PIO", defaultTitle: "飞龙在天" },
  { code: "Q5-RET", defaultTitle: "大音希声" },
  { code: "Q6-GAM", defaultTitle: "无畏先锋" },
  { code: "Q7-ARB", defaultTitle: "诸葛在世" },
  { code: "Q8-DRI", defaultTitle: "暮光星灵" },
];

export interface OctantSectorConfig {
  code: string;
  name: string;
  subTitle: string;
  startAngle: number; // 0度为正北，顺时针
  endAngle: number;
  centerAngle: number;
  primaryColor: string;
  glowColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  desc: string;
  quadrantName: string;
}

export const OCTANT_SECTOR_CONFIGS: Record<string, OctantSectorConfig> = {
  "Q1-CAL": {
    code: "Q1-CAL",
    name: "人形外挂",
    subTitle: "知行绝对自洽",
    startAngle: 0,
    endAngle: 45,
    centerAngle: 22.5,
    primaryColor: "#10b981", // emerald-500
    glowColor: "rgba(16, 185, 129, 0.4)",
    textColor: "text-emerald-400",
    badgeBg: "bg-emerald-950/80",
    badgeBorder: "border-emerald-500/40",
    desc: "高一元突破 · 二阶知行完全自洽",
    quadrantName: "北偏东 · 纯粹自洽领地",
  },
  "Q4-PIO": {
    code: "Q4-PIO",
    name: "飞龙在天",
    subTitle: "果敢自信破局",
    startAngle: 45,
    endAngle: 90,
    centerAngle: 67.5,
    primaryColor: "#f59e0b", // amber-500
    glowColor: "rgba(245, 158, 11, 0.4)",
    textColor: "text-amber-400",
    badgeBg: "bg-amber-950/80",
    badgeBorder: "border-amber-500/40",
    desc: "高一元底蕴 · 果敢进攻破局",
    quadrantName: "东偏北 · 进攻破局领地",
  },
  "Q3-SEN": {
    code: "Q3-SEN",
    name: "定海神针",
    subTitle: "深厚审慎守舵",
    startAngle: 90,
    endAngle: 135,
    centerAngle: 112.5,
    primaryColor: "#38bdf8", // sky-400
    glowColor: "rgba(56, 189, 248, 0.4)",
    textColor: "text-sky-400",
    badgeBg: "bg-sky-950/80",
    badgeBorder: "border-sky-500/40",
    desc: "高一元底蕴 · 审慎万无一失",
    quadrantName: "东偏南 · 坚石防守领地",
  },
  "Q5-RET": {
    code: "Q5-RET",
    name: "大音希声",
    subTitle: "知弱守拙避险",
    startAngle: 135,
    endAngle: 180,
    centerAngle: 157.5,
    primaryColor: "#0d9488", // teal-600
    glowColor: "rgba(13, 148, 136, 0.4)",
    textColor: "text-teal-400",
    badgeBg: "bg-teal-950/80",
    badgeBorder: "border-teal-500/40",
    desc: "探索期 · 知己不足克制避险",
    quadrantName: "南偏东 · 守拙固本领地",
  },
  "Q6-GAM": {
    code: "Q6-GAM",
    name: "无畏先锋",
    subTitle: "达克盲赌冲锋",
    startAngle: 180,
    endAngle: 225,
    centerAngle: 202.5,
    primaryColor: "#f43f5e", // rose-500
    glowColor: "rgba(244, 63, 94, 0.4)",
    textColor: "text-rose-400",
    badgeBg: "bg-rose-950/80",
    badgeBorder: "border-rose-500/40",
    desc: "探索期 · 勇猛敢拼无知盲赌",
    quadrantName: "南偏西 · 破釜沉舟领地",
  },
  "Q8-DRI": {
    code: "Q8-DRI",
    name: "暮光星灵",
    subTitle: "逍遥灵动漫游",
    startAngle: 225,
    endAngle: 270,
    centerAngle: 247.5,
    primaryColor: "#a855f7", // purple-500
    glowColor: "rgba(168, 85, 247, 0.4)",
    textColor: "text-purple-400",
    badgeBg: "bg-purple-950/80",
    badgeBorder: "border-purple-500/40",
    desc: "探索期 · 超脱规则纯粹直觉",
    quadrantName: "西偏南 · 混沌灵感领地",
  },
  "Q2-EVO": {
    code: "Q2-EVO",
    name: "灵窍天开",
    subTitle: "心开一窍悟道",
    startAngle: 270,
    endAngle: 315,
    centerAngle: 292.5,
    primaryColor: "#06b6d4", // cyan-500
    glowColor: "rgba(6, 182, 212, 0.4)",
    textColor: "text-cyan-400",
    badgeBg: "bg-cyan-950/80",
    badgeBorder: "border-cyan-500/40",
    desc: "探索期 · 敏锐求真自省进化",
    quadrantName: "西偏北 · 顿悟进阶领地",
  },
  "Q7-ARB": {
    code: "Q7-ARB",
    name: "诸葛在世",
    subTitle: "草船借箭套利",
    startAngle: 315,
    endAngle: 360,
    centerAngle: 337.5,
    primaryColor: "#eab308", // yellow-500
    glowColor: "rgba(234, 179, 8, 0.4)",
    textColor: "text-yellow-400",
    badgeBg: "bg-yellow-950/80",
    badgeBorder: "border-yellow-500/40",
    desc: "探索期 · 算尽期望借力打力",
    quadrantName: "北偏西 · 谋略套利领地",
  },
};

export interface OctantDetailedInfo {
  code: string;
  name: string;
  definition: string;
  features: string;
  tiers: {
    awakened: string;
    core: string;
    passive: string;
    vacuum: string;
  };
}

export const OCTANT_DETAILED_INFO: Record<string, OctantDetailedInfo> = {
  "Q1-CAL": {
    code: "Q1-CAL",
    name: "人形外挂",
    definition: "高一元客观突破 (D* ≥ 0.60) 与高二元元认知自洽 (M_ratio ≥ 0.80) 的理想超临界状态。受测者对自身能力的感知如精密仪表般精确，无虚妄自大亦无过度退缩。",
    features: "D* ≥ 0.60, M_ratio ≥ 0.80, |Bias| ≤ 0.12。能精准在自身胜率高时重注出击、疑虑时稳健保底，真正做到知行绝对合一。",
    tiers: {
      awakened: "【觉醒阶】全知自洽通透，D* ≥ 0.85 且 M_ratio ≥ 1.20",
      core: "【核心阶】机器级稳定自洽，D* ≥ 0.60 且 M_ratio ≥ 0.80",
      passive: "【被动阶】靠近相变奇点，初显自洽纠偏潜质",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q4-PIO": {
    code: "Q4-PIO",
    name: "飞龙在天",
    definition: "高一元客观实力底蕴深厚，同时伴随果敢激进的进攻与冒险破局倾向。敢于向最高难度发起冲锋，具备极强的开拓者魄力。",
    features: "D* ≥ 0.60, Bias > +0.10。攻坚实力强大，面对高阶挑战果断重注破局，开拓势能与攻坚爆发力极强。",
    tiers: {
      awakened: "【觉醒阶】极限难度强攻破关，破局先锋领袖",
      core: "【核心阶】进取攻坚，高自信驱动攻坚破关",
      passive: "【被动阶】试探进击，尝试跨出安全舒适区",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q3-SEN": {
    code: "Q3-SEN",
    name: "定海神针",
    definition: "高一元客观实力深厚，同时伴随极度严谨、低估胜率的审慎自省倾向。万无一失型守舵者，深谋远虑，不轻举妄动。",
    features: "D* ≥ 0.60, Bias < -0.10。客观胜率极高仍保持敬畏自谦，防守万无一失，是团队中最可信赖的压舱石。",
    tiers: {
      awakened: "【觉醒阶】绝对防线，零失误严谨守舵压舱",
      core: "【核心阶】稳健底盘，高胜率下的审慎控制",
      passive: "【被动阶】防守内敛，低调积蓄认知势能",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q5-RET": {
    code: "Q5-RET",
    name: "大音希声",
    definition: "处于一元任务探索期，深刻知晓自身认知盲区，采取知弱守拙、克制避险的防御策略。深谙知人者智、自知者明。",
    features: "D* < 0.60, Bias < -0.10。知己不足而有所不为，防御心态克制，绝不盲目试错，有效规避系统性毁灭风险。",
    tiers: {
      awakened: "【觉醒阶】抱朴守真，高明克制的避险艺术",
      core: "【核心阶】稳重防守，精准识别不可为领域",
      passive: "【被动阶】退守安全区，谨慎探索",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q6-GAM": {
    code: "Q6-GAM",
    name: "无畏先锋",
    definition: "达克效应盲赌冲锋态。一元辨别能力处于筑基期，但主观自信极度膨胀。由于元认知回路未闭环，产生无知者无畏的盲赌冲锋行为。",
    features: "D* < 0.60, Bias > +0.20, M_ratio < 0.80。在无把握局面下频频高倍下注盲冲，敢拼敢闯，极具破釜沉舟之勇。",
    tiers: {
      awakened: "【觉醒阶】绝地孤勇，盲赌破局极端特例",
      core: "【核心阶】达克冲锋，典型过度自信冒险",
      passive: "【被动阶】盲动试探，初显过度自信倾向",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q8-DRI": {
    code: "Q8-DRI",
    name: "暮光星灵",
    definition: "高熵直觉漫游态。决策行为呈现纯直觉或高随机性，尚未建立稳定的反思元认知回路。超脱既定规则，随性探索。",
    features: "D* < 0.60, M_ratio ≈ 0.05，决策脱钩。下注与答题正误无序关联，处于纯直觉游走或测试动机脱失状态，偶显灵光一现。",
    tiers: {
      awakened: "【觉醒阶】超验直觉，混沌中偶发惊人灵感",
      core: "【核心阶】逍遥游走，纯直觉与无序漫游",
      passive: "【被动阶】随机漂移，行为模式离散",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q2-EVO": {
    code: "Q2-EVO",
    name: "灵窍天开",
    definition: "低一元基础但具备极高二元元认知觉察与强悍的学习进化能力。敏锐自省，能通过持续复盘与试错迅速实现跨越式进阶。",
    features: "D* < 0.60, M_ratio ≥ 0.80, IVE 居中偏高。极度善于反省复盘，能通过外部试错与信息吸收迅速跨越认知壁垒。",
    tiers: {
      awakened: "【觉醒阶】破茧成蝶，极速跨越难度壁垒",
      core: "【核心阶】敏锐自省，高二元反馈驱动进化",
      passive: "【被动阶】初识自省，开始建立复盘回路",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
  "Q7-ARB": {
    code: "Q7-ARB",
    name: "诸葛在世",
    definition: "系统性概率与信息套利者。极度善于借助外部线索与环境杠杆（草船借箭）达成目标，崇尚谋定而后动。",
    features: "IVE ≥ 0.70, 高期望导向。面临高难度或不确定性时，主动搜寻并利用高性价比线索进行期望值套利，锁定胜局。",
    tiers: {
      awakened: "【觉醒阶】算尽天机，超高确定性套利",
      core: "【核心阶】借力打力，成熟的信息杠杆运作",
      passive: "【被动阶】初步借势，开始尝试利用外部提示",
      vacuum: "【平衡区】高熵平衡中性区",
    },
  },
};

export interface AxisDetailInfo {
  deg: number;
  axisName: string;
  dimension: string;
  shortName: string;
  value: string;
  definition: string;
  features: string;
  thresholdNote: string;
}

export const AXIS_DETAILED_INFO: Record<number, AxisDetailInfo> = {
  0: {
    deg: 0,
    axisName: "元认知效率轴 (M_ratio) 自洽顶端",
    dimension: "二元认知保真度 (Meta-d' / d')",
    shortName: "自洽 (M)",
    value: "2.0+",
    definition: "二元反思敏感度 (Meta-d') 与一元任务辨别力 (d') 的比值，衡量受测者对自己“知不知”的自我觉知保真度。",
    features: "M ≥ 0.80 为相变自洽区，达到或超过 1.0 时代表“知之为知之，不知为不知”的绝对自我校准；反思觉知通透。",
    thresholdNote: "临界点: M = 0.80 自洽分界线",
  },
  45: {
    deg: 45,
    axisName: "决策倾角轴 (Calibration Bias) 审慎侧",
    dimension: "主观置信度偏差 (Confidence Bias)",
    shortName: "审慎 (Bias)",
    value: "-0.30",
    definition: "受测者主观下注置信概率与实际真实答对概率的差值。负值代表习惯性审慎自谦与低估胜率。",
    features: "Bias < -0.12 表示受测者习惯性低估自身胜率，风格极其严谨防守、克制稳重，不打无把握之仗。",
    thresholdNote: "临界点: Bias = -0.12 审慎防守分界",
  },
  90: {
    deg: 90,
    axisName: "相变突破度轴 (D*) 正向右侧",
    dimension: "一元任务难度穿越阶次 (Task Difficulty)",
    shortName: "突破 (D*)",
    value: "1.0",
    definition: "在双上一下自适应阶梯算法中，受测者成功穿越并收敛的最高任务难度阶次。",
    features: "D* ≥ 0.60 表明受测者突破基础难度瓶颈，进入具备高阶认知底蕴的相变区；能攻克高阶复杂问题。",
    thresholdNote: "临界点: D* = 0.60 难度相变突破线",
  },
  135: {
    deg: 135,
    axisName: "信息觅食杠杆轴 (IVE) 零借力端",
    dimension: "信息搜寻与外部借力杠杆",
    shortName: "内算 (IVE)",
    value: "0.0",
    definition: "面对不确定性时，使用外部提示或线索的频次与转化效能。0.0 代表纯内部心算、零外部采购。",
    features: "完全不依赖外部线索提示，依靠自身认知储备硬解，单兵作战与自主内算倾向明显。",
    thresholdNote: "基准线: IVE = 0.50 先验中性线",
  },
  180: {
    deg: 180,
    axisName: "元认知效率轴 (M_ratio) 衰减底端",
    dimension: "二元觉察失真度 (Metacognitive Attenuation)",
    shortName: "衰减 (M)",
    value: "0.0",
    definition: "元认知效率极低甚至失真，受测者无法准确评估自己的对错状态，反思回路未建立或严重钝化。",
    features: "当 M_ratio < 0.80 时自我觉察失真；趋近于 0.05 截断下限时代表决策动作与真实答题行为完全脱钩。",
    thresholdNote: "临界点: M = 0.80 自洽临界线，M = 0.40 达克高危线",
  },
  225: {
    deg: 225,
    axisName: "决策倾角轴 (Calibration Bias) 过度自信侧",
    dimension: "达克盲赌置信溢出 (Overconfidence Overflow)",
    shortName: "盲赌 (Bias)",
    value: "+0.50",
    definition: "受测者主观下注置信概率远高于真实客观胜率的正偏差。在胜率极低时依然盲目高额下注。",
    features: "Bias > +0.12 进入过度自信区，Bias > +0.25 处于严重达克盲赌状态，极易产生高风险冲动盲目决策。",
    thresholdNote: "临界点: Bias = +0.12 自信溢出分界，Bias = +0.25 盲赌临界",
  },
  270: {
    deg: 270,
    axisName: "相变突破度轴 (D*) 噪声基底端",
    dimension: "一元任务基准探索底限",
    shortName: "基底 (D*)",
    value: "0.0",
    definition: "受测者阶梯测试收敛于起始基础难度，尚未跨越第一道难度相变阶次。",
    features: "处于一元辨别能力筑基与探索期，尚未形成高阶模式识别能力，容易受表面干扰项迷惑。",
    thresholdNote: "临界点: D* = 0.60 难度相变突破线",
  },
  315: {
    deg: 315,
    axisName: "信息觅食杠杆轴 (IVE) 高套利端",
    dimension: "信息杠杆与环境借力效能",
    shortName: "套利 (IVE)",
    value: "1.0",
    definition: "面对不确定性时，主动搜寻高信噪比外部线索并成功转化为决策胜率的能力。",
    features: "IVE ≥ 0.70 表明具有极高策略期望意识，善于借助一切可用外部资源将确定性最大化（草船借箭）。",
    thresholdNote: "临界点: IVE = 0.70 高杠杆谋略相变线",
  },
};

/**
 * 计算受测者在八相认知星盘上的屏幕坐标 (百分比: left% 与 top%)
 * 画布以 (50%, 50%) 为中心相变奇点
 */
export function computeOctantCompassPosition(sub: SubjectPoint) {
  const code = sub.quadrant_code || "Q1-CAL";
  const conf = OCTANT_SECTOR_CONFIGS[code] || OCTANT_SECTOR_CONFIGS["Q1-CAL"];

  // 1. 扇区角度微调 (在 centerAngle 左右 +/- 16 度范围内展开，预留安全间距)
  let angleJitter = 0;
  if (code === "Q6-GAM") {
    // 盲赌越严重 (bias 越高)，越偏向 202.5° 轴心深处
    angleJitter = Math.max(-16, Math.min(16, (sub.calibration_bias - 0.25) * 45));
  } else if (code === "Q1-CAL") {
    angleJitter = Math.max(-16, Math.min(16, (((sub.m_ratio ?? 1.0) - 1.0) - ((sub.d_star ?? 0.7) - 0.7)) * 20));
  } else if (code === "Q3-SEN") {
    angleJitter = Math.max(-16, Math.min(16, (sub.calibration_bias + 0.20) * 35));
  } else if (code === "Q4-PIO") {
    angleJitter = Math.max(-16, Math.min(16, (sub.calibration_bias - 0.10) * 35));
  } else if (code === "Q2-EVO" || code === "Q7-ARB") {
    angleJitter = Math.max(-16, Math.min(16, ((sub.ive ?? 0.5) - 0.65) * 40));
  } else if (code === "Q5-RET") {
    angleJitter = Math.max(-16, Math.min(16, ((sub.d_star ?? 0.3) - 0.3) * 35));
  } else {
    // Q8-DRI
    angleJitter = Math.max(-16, Math.min(16, (sub.calibration_bias - 0.5) * 25));
  }

  const finalAngle = conf.centerAngle + angleJitter;

  // 2. 极径 R (距离中心的距离，范围 20% ~ 44%，画布中心为 50%)
  let radialFactor = 0.5;
  if (code === "Q1-CAL") {
    radialFactor = Math.min(1.0, Math.max(0.1, ((sub.d_star ?? 0.6) - 0.6) * 2.0));
  } else if (code === "Q6-GAM") {
    radialFactor = Math.min(1.0, Math.max(0.2, sub.calibration_bias * 1.8));
  } else if (code === "Q4-PIO") {
    radialFactor = Math.min(1.0, Math.max(0.2, ((sub.d_star ?? 0.5) - 0.5) * 1.8));
  } else if (code === "Q3-SEN") {
    radialFactor = Math.min(1.0, Math.max(0.2, Math.abs(sub.calibration_bias) * 2.2));
  } else if (code === "Q7-ARB" || code === "Q2-EVO") {
    radialFactor = Math.min(1.0, Math.max(0.2, (sub.ive ?? 0.5) * 1.2));
  } else {
    radialFactor = Math.min(1.0, Math.max(0.2, (1.0 - (sub.d_star ?? 0.3)) * 1.2));
  }

  const radiusPercent = 18 + radialFactor * 25;

  // 角度转弧度 (0度为正北，顺时针方向)
  const rad = ((finalAngle - 90) * Math.PI) / 180;
  const leftPercent = 50 + radiusPercent * Math.cos(rad);
  const topPercent = 50 + radiusPercent * Math.sin(rad);

  return {
    left: leftPercent,
    top: topPercent,
    finalAngle,
    radiusPercent,
  };
}

/**
 * 生成 600x600 SVG 扇区 Path
 */
export function getSectorPath(startAngle: number, endAngle: number, outerR: number, innerR: number = 0) {
  const rad1 = ((startAngle - 90) * Math.PI) / 180;
  const rad2 = ((endAngle - 90) * Math.PI) / 180;

  const x1 = 300 + outerR * Math.cos(rad1);
  const y1 = 300 + outerR * Math.sin(rad1);
  const x2 = 300 + outerR * Math.cos(rad2);
  const y2 = 300 + outerR * Math.sin(rad2);

  if (innerR <= 0) {
    return `M 300 300 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  } else {
    const ix1 = 300 + innerR * Math.cos(rad1);
    const iy1 = 300 + innerR * Math.sin(rad1);
    const ix2 = 300 + innerR * Math.cos(rad2);
    const iy2 = 300 + innerR * Math.sin(rad2);
    return `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${innerR} ${innerR} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
  }
}

/**
 * 计算受测者在 600x600 SVG 坐标系下的绝对落点 (x, y)
 */
export function computeOctantSvgCoords(sub: SubjectPoint) {
  const code = sub.quadrant_code || "Q1-CAL";
  const conf = OCTANT_SECTOR_CONFIGS[code] || OCTANT_SECTOR_CONFIGS["Q1-CAL"];

  let angleJitter = 0;
  if (code === "Q6-GAM") {
    angleJitter = Math.max(-14, Math.min(14, (sub.calibration_bias - 0.25) * 40));
  } else if (code === "Q1-CAL") {
    angleJitter = Math.max(-14, Math.min(14, (((sub.m_ratio ?? 1.0) - 1.0) - ((sub.d_star ?? 0.7) - 0.7)) * 20));
  } else if (code === "Q3-SEN") {
    angleJitter = Math.max(-14, Math.min(14, (sub.calibration_bias + 0.20) * 30));
  } else if (code === "Q4-PIO") {
    angleJitter = Math.max(-14, Math.min(14, (sub.calibration_bias - 0.10) * 30));
  } else if (code === "Q2-EVO" || code === "Q7-ARB") {
    angleJitter = Math.max(-14, Math.min(14, ((sub.ive ?? 0.5) - 0.65) * 35));
  } else if (code === "Q5-RET") {
    angleJitter = Math.max(-14, Math.min(14, ((sub.d_star ?? 0.3) - 0.3) * 30));
  } else {
    angleJitter = Math.max(-14, Math.min(14, (sub.calibration_bias - 0.5) * 20));
  }

  const finalAngle = conf.centerAngle + angleJitter;

  let radialFactor = 0.5;
  if (code === "Q1-CAL") {
    radialFactor = Math.min(1.0, Math.max(0.15, ((sub.d_star ?? 0.6) - 0.6) * 2.0));
  } else if (code === "Q6-GAM") {
    radialFactor = Math.min(1.0, Math.max(0.2, sub.calibration_bias * 1.8));
  } else if (code === "Q4-PIO") {
    radialFactor = Math.min(1.0, Math.max(0.2, ((sub.d_star ?? 0.5) - 0.5) * 1.8));
  } else if (code === "Q3-SEN") {
    radialFactor = Math.min(1.0, Math.max(0.2, Math.abs(sub.calibration_bias) * 2.2));
  } else if (code === "Q7-ARB" || code === "Q2-EVO") {
    radialFactor = Math.min(1.0, Math.max(0.2, (sub.ive ?? 0.5) * 1.2));
  } else {
    radialFactor = Math.min(1.0, Math.max(0.2, (1.0 - (sub.d_star ?? 0.3)) * 1.2));
  }

  const r = 68 + radialFactor * 165;
  const rad = ((finalAngle - 90) * Math.PI) / 180;
  const x = 300 + r * Math.cos(rad);
  const y = 300 + r * Math.sin(rad);

  return { x, y, finalAngle, r };
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data
  const [scatterData, setScatterData] = useState<ScatterData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedSubjectReport, setSelectedSubjectReport] = useState<any | null>(null);

  // Reset page when filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag, pageSize]);

  // Scatter view controls
  const [chartViewMode, setChartViewMode] = useState<"COMPASS" | "RECT">("COMPASS");
  const [splitLine, setSplitLine] = useState<"BASELINE" | "MEDIAN" | "MEAN">("BASELINE");
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Verify token
  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_token", token);
        loadData();
      } else {
        setAuthError("访问密码或免密令牌无效，请重新输入");
      }
    } catch {
      setAuthError("网络连接失败");
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    // 1. Check URL query token
    const urlParams = new URLSearchParams(window.location.search);
    const tokenInUrl = urlParams.get("token");
    if (tokenInUrl) {
      verifyToken(tokenInUrl);
      return;
    }

    // 2. Check SessionStorage
    const savedToken = sessionStorage.getItem("admin_token");
    if (savedToken) {
      verifyToken(savedToken);
      return;
    }

    setCheckingAuth(false);
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/cohort/scatter");
      if (res.ok) {
        const data = await res.json();
        setScatterData(data);
      }
    } catch (e) {
      console.error("加载数据失败", e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;
    setCheckingAuth(true);
    setAuthError("");
    verifyToken(inputPassword.trim());
  };

  const handleOpenReport = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/report`);
      if (res.ok) {
        const rep = await res.json();
        setSelectedSubjectReport(rep);
      }
    } catch (e) {
      console.error("加载报告失败", e);
    }
  };

  const subjects = scatterData?.subjects || [];

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: subjects.length };
    subjects.forEach((s) => {
      const code = s.quadrant_code;
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, [subjects]);

  // 计算每个相室画像的明细统计 (人数、占比、平均 D*、平均 M_ratio、平均得分)
  const octantStatsMap = useMemo(() => {
    const total = subjects.length || 1;
    const stats: Record<string, { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }> = {};

    Object.keys(OCTANT_SECTOR_CONFIGS).forEach((code) => {
      const cohort = subjects.filter((s) => s.quadrant_code === code);
      const count = cohort.length;
      const percentage = ((count / total) * 100).toFixed(1);
      const avgDStar = count > 0 ? (cohort.reduce((a, b) => a + (b.d_star ?? 0.5), 0) / count).toFixed(3) : "--";
      const avgMRatio = count > 0 ? (cohort.reduce((a, b) => a + b.m_ratio, 0) / count).toFixed(2) : "--";
      const avgScore = count > 0 ? Math.round(cohort.reduce((a, b) => a + b.final_score, 0) / count) : 0;
      stats[code] = { count, percentage, avgDStar, avgMRatio, avgScore };
    });

    return stats;
  }, [subjects]);

  const quadrantTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    subjects.forEach((s) => {
      if (s.quadrant_code && s.role_title && !titles[s.quadrant_code]) {
        titles[s.quadrant_code] = s.role_title;
      }
    });
    return titles;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.role_title && s.role_title.toLowerCase().includes(query)) ||
        (s.quadrant_code && s.quadrant_code.toLowerCase().includes(query));

      const matchesTag =
        selectedTag === "ALL" ||
        s.quadrant_code === selectedTag ||
        s.role_title === selectedTag;

      return matchesSearch && matchesTag;
    });
  }, [subjects, searchQuery, selectedTag]);

  const totalItems = filteredSubjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Compute split line coordinates based on active settings (4D Cognitive Manifold)
  let splitXRatio = 0.60;
  let splitYRatio = 0.40; // 0.80 / 2.0 = 0.40
  let splitXVal = 0.60;
  let splitYVal = 0.80;

  if (splitLine === "MEDIAN" && scatterData) {
    splitXVal = scatterData.median_x;
    splitYVal = scatterData.median_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  } else if (splitLine === "MEAN" && scatterData) {
    splitXVal = scatterData.mean_x;
    splitYVal = scatterData.mean_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
        正在验证管理员访问凭据...
      </div>
    );
  }

  // 1. 锁屏登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0f]">
        <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">独立管理控制台</h2>
            <p className="text-xs text-slate-400 mt-1">请输入终端生成的管理员访问密码以调阅群体 4D 认知流形数据</p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4">
            <input
              type="password"
              placeholder="请输入管理员密码..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
            />

            {authError && <div className="text-xs text-rose-400">{authError}</div>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              解锁进入控制台 →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-200 p-4 md:p-8 space-y-8">
      {/* 顶部控制台导航 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              4D 认知流形评测控制台 (Admin Manifold Portal)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v2.0 4D认知流形
              </span>
            </h1>
            <p className="text-xs text-slate-400">群体 4D 正交相空间分布图 · 8 大画像 MECE 拓扑与双变量色彩映射</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loadingData}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer border border-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} /> 刷新数据
          </button>
          <a
            href="/"
            className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-medium text-indigo-300 flex items-center gap-1.5 border border-indigo-500/30"
          >
            返回答题页面 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* 统计指标卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" /> 总参测人次
          </div>
          <div className="text-2xl font-bold font-mono text-white">{subjects.length}</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-cyan-400" /> 平均相变突破度 D*
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {subjects.length > 0
              ? (subjects.reduce((a, b) => a + (b.d_star ?? 0.5), 0) / subjects.length).toFixed(3)
              : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> 平均元认知效率 M_ratio
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {subjects.length > 0
              ? (subjects.reduce((a, b) => a + b.m_ratio, 0) / subjects.length).toFixed(2)
              : "--"}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> 群体最高战绩得分
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {subjects.length > 0 ? Math.max(...subjects.map((s) => s.final_score)) : 0}
          </div>
        </div>
      </div>

      {/* 4D 认知流形宏观点阵相空间图 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> 4D 认知流形全息相空间 (Manifold Phase Space)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {chartViewMode === "COMPASS"
                ? "四条相变轴线于中心交叉，严格切割 8 大专属认知相室 · 空间即画像 · 所见即所得"
                : "横坐标: 相变突破度 D* [0~1.0] · 纵坐标: 元认知效率 M_ratio [0~2.0+] · 色相: 决策倾角 Bias"}
            </p>
          </div>

          {/* 控制选项与视图模式切换 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 视图模式切换器 */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setChartViewMode("COMPASS")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  chartViewMode === "COMPASS"
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-cyan-300" /> 八相认知星盘 (8-Sector)
              </button>
              <button
                onClick={() => setChartViewMode("RECT")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  chartViewMode === "RECT"
                    ? "bg-indigo-600 text-white font-medium shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 2D 直角相图
              </button>
            </div>

            {/* 直角图分割线控制 */}
            {chartViewMode === "RECT" && (
              <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
                <button
                  onClick={() => setSplitLine("BASELINE")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    splitLine === "BASELINE" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  相变基准 (D*=0.60, M=0.80)
                </button>
                <button
                  onClick={() => setSplitLine("MEDIAN")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    splitLine === "MEDIAN" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  群体中位数
                </button>
                <button
                  onClick={() => setSplitLine("MEAN")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    splitLine === "MEAN" ? "bg-indigo-600 text-white font-medium shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  群体均值
                </button>
              </div>
            )}

            {/* 移除理论依据按钮 */}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 模式 A: 4D 认知流形全息星系 (Cosmic Manifold Galaxy)           */}
        {/* ============================================================== */}
        {chartViewMode === "COMPASS" ? (
          <CosmicGalaxyCompass
            subjects={subjects}
            onOpenReport={handleOpenReport}
            octantStatsMap={octantStatsMap}
          />
        ) : (
          /* ============================================================== */
          /* 模式 B: 2D 直角投影图 (Cartesian Phase Plane)                  */
          /* ============================================================== */
          <div className="relative w-full rounded-2xl bg-slate-950/95 border border-white/10 overflow-hidden pt-6 pb-12 pl-14 pr-6 select-none shadow-2xl">
            {/* Y 轴刻度尺 */}
            <div className="absolute left-0 top-6 bottom-12 w-14 pr-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
              <span className="absolute top-0 right-2.5 -translate-y-1/2 text-slate-400">2.0+</span>
              <span className="absolute top-[20%] right-2.5 -translate-y-1/2">1.6</span>
              <span className="absolute top-[40%] right-2.5 -translate-y-1/2">1.2</span>
              <span className="absolute bottom-[40%] right-2.5 translate-y-1/2 text-purple-400 font-bold flex items-center gap-0.5">0.8</span>
              <span className="absolute bottom-[20%] right-2.5 translate-y-1/2">0.4</span>
              <span className="absolute bottom-0 right-2.5 translate-y-1/2 text-slate-400">0.0</span>
            </div>

            {/* Y 轴垂直标头 */}
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] tracking-wider font-semibold text-slate-400 uppercase pointer-events-none whitespace-nowrap">
              元认知效率 M_ratio (Meta-d' / d')
            </div>

            {/* 内部绘图核心网格区 */}
            <div className="relative w-full h-[380px] md:h-[460px] border border-white/10 rounded-xl bg-slate-950/60">
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                {/* 四象限光晕背景 */}
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: `${splitXRatio * 100}%`,
                    bottom: `${splitYRatio * 100}%`,
                    right: 0,
                    top: 0,
                    background: "radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.12), transparent 75%)",
                  }}
                />
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: 0,
                    bottom: `${splitYRatio * 100}%`,
                    width: `${splitXRatio * 100}%`,
                    top: 0,
                    background: "radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.10), transparent 75%)",
                  }}
                />
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: `${splitXRatio * 100}%`,
                    bottom: 0,
                    right: 0,
                    height: `${splitYRatio * 100}%`,
                    background: "radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.09), transparent 75%)",
                  }}
                />
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: 0,
                    bottom: 0,
                    width: `${splitXRatio * 100}%`,
                    height: `${splitYRatio * 100}%`,
                    background: "radial-gradient(ellipse at bottom left, rgba(244, 63, 94, 0.08), transparent 75%)",
                  }}
                />

                {[0.2, 0.4, 0.6, 0.8].map((x) => (
                  <div
                    key={`grid-x-${x}`}
                    className="absolute top-0 bottom-0 border-l border-white/[0.04] pointer-events-none"
                    style={{ left: `${x * 100}%` }}
                  />
                ))}
                {[0.2, 0.4, 0.6, 0.8].map((y) => (
                  <div
                    key={`grid-y-${y}`}
                    className="absolute left-0 right-0 border-t border-white/[0.04] pointer-events-none"
                    style={{ bottom: `${y * 100}%` }}
                  />
                ))}
              </div>

              {/* 象限水印标识 */}
              <div className="absolute top-3 right-4 text-right pointer-events-none z-0">
                <span className="text-xs font-bold text-emerald-400/50 uppercase tracking-widest block flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Q1-CAL: 人形外挂
                </span>
                <span className="text-[10px] text-slate-400">高一元突破 · 知行绝对自洽</span>
              </div>
              <div className="absolute top-3 left-4 text-left pointer-events-none z-0">
                <span className="text-xs font-bold text-cyan-400/50 uppercase tracking-widest block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Q2-EVO: 灵窍天开 / Q7-ARB: 诸葛在世
                </span>
                <span className="text-[10px] text-slate-400">高二元觉察 · 借力进化与概率套利</span>
              </div>
              <div
                className="absolute right-4 text-right pointer-events-none z-0 transition-all duration-300"
                style={{
                  top: `calc(${Math.min(78, (1 - splitYRatio) * 100 + 2.5)}% + 6px)`,
                }}
              >
                <span className="text-xs font-bold text-amber-400/50 uppercase tracking-widest block flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Q3-SEN: 定海神针 / Q4-PIO: 飞龙在天
                </span>
                <span className="text-[10px] text-slate-400">高一元底蕴 · 审慎守舵 vs 果敢破局</span>
              </div>
              <div
                className="absolute left-4 text-left pointer-events-none z-0 transition-all duration-300"
                style={{
                  top: `calc(${Math.min(78, (1 - splitYRatio) * 100 + 2.5)}% + 6px)`,
                }}
              >
                <span className="text-xs font-bold text-rose-400/50 uppercase tracking-widest block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Q5-RET / Q6-GAM / Q8-DRI
                </span>
                <span className="text-[10px] text-slate-400">大音希声 · 无畏先锋 · 暮光星灵</span>
              </div>

              {/* 动态相变分割线 */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
                style={{
                  left: `${splitXRatio * 100}%`,
                  boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
                }}
              >
                <div className="absolute top-2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
                  {splitLine === "BASELINE"
                    ? "D* = 0.60 难度相变"
                    : splitLine === "MEDIAN"
                      ? `中位 D*: ${splitXVal.toFixed(2)}`
                      : `均值 D*: ${splitXVal.toFixed(2)}`}
                </div>
              </div>

              <div
                className="absolute left-0 right-0 border-t-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
                style={{
                  bottom: `${splitYRatio * 100}%`,
                  boxShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
                }}
              >
                <div className="absolute right-2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
                  {splitLine === "BASELINE"
                    ? "M = 0.80 自洽临界"
                    : splitLine === "MEDIAN"
                      ? `中位 M: ${splitYVal.toFixed(2)}`
                      : `均值 M: ${splitYVal.toFixed(2)}`}
                </div>
              </div>

              {/* 直角散点 */}
              {subjects.map((sub) => {
                const dStarVal = sub.d_star !== undefined ? sub.d_star : 0.5;
                const posX = Math.max(0.02, Math.min(0.98, dStarVal)) * 100;
                const posY = Math.max(0.02, Math.min(0.98, (sub.m_ratio ?? 0.8) / 2.0)) * 100;

                const isHovered = hoveredSubject?.id === sub.id;
                const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.50);

                return (
                  <div
                    key={sub.id}
                    onMouseEnter={() => setHoveredSubject(sub)}
                    onMouseLeave={() => setHoveredSubject(null)}
                    onClick={() => handleOpenReport(sub.id)}
                    className={`absolute w-3.5 h-3.5 -ml-[7px] -mb-[7px] rounded-full cursor-pointer transition-all duration-150 z-20 flex items-center justify-center ${
                      sub.is_current
                        ? "scale-150 ring-4 ring-amber-400/80 animate-pulse"
                        : isHovered
                          ? "scale-150 ring-2 ring-white z-30"
                          : "hover:scale-125"
                    }`}
                    style={{
                      left: `${posX}%`,
                      bottom: `${posY}%`,
                      backgroundColor: colorToken.backgroundColor,
                      border: `1.5px solid ${colorToken.borderColor}`,
                      boxShadow: colorToken.boxShadow,
                    }}
                  >
                    <div className="w-1 h-1 rounded-full bg-white/80 pointer-events-none" />
                  </div>
                );
              })}

              {/* 直角模式悬浮浮窗 Tooltip */}
              {hoveredSubject && (() => {
                const dStar = hoveredSubject.d_star !== undefined ? hoveredSubject.d_star : 0.5;
                const posX = Math.max(0.02, Math.min(0.98, dStar)) * 100;
                const posY = Math.max(0.02, Math.min(0.98, (hoveredSubject.m_ratio ?? 0.8) / 2.0)) * 100;
                const isUpperHalf = posY > 48;
                const isRightHalf = posX > 52;

                return (
                  <div
                    className="absolute pointer-events-none glass-panel rounded-2xl p-4 border border-indigo-500/50 text-xs shadow-2xl z-50 space-y-2.5 w-72 md:w-80 backdrop-blur-xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      ...(isUpperHalf
                        ? { top: `${Math.max(4, Math.min(62, 100 - posY + 4))}%` }
                        : { bottom: `${Math.max(4, Math.min(62, posY + 4))}%` }),
                      ...(isRightHalf
                        ? { right: `${Math.max(3, Math.min(65, 100 - posX + 3))}%` }
                        : { left: `${Math.max(3, Math.min(65, posX + 3))}%` }),
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {hoveredSubject.name}
                          {hoveredSubject.is_current && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">当前</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">ID: {hoveredSubject.id.slice(0, 16)}...</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono inline-block">
                          {hoveredSubject.role_title || "受测者"}
                        </span>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{hoveredSubject.quadrant_code || "Q1-CAL"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-slate-400 block text-[10px]">相变突破度 D*</span>
                        <span className="font-mono text-cyan-300 font-bold">{(hoveredSubject.d_star ?? 0.5).toFixed(3)}</span>
                        <span className="text-[9px] ml-1 text-slate-500">
                          {(hoveredSubject.d_star ?? 0.5) >= 0.60 ? "≥0.6 拓扑" : "<0.6 基底"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">元认知 M_ratio</span>
                        <span className="font-mono text-purple-300 font-bold">{hoveredSubject.m_ratio}</span>
                        <span className="text-[9px] ml-1 text-slate-500">
                          {hoveredSubject.m_ratio >= 0.80 ? "≥0.8 自洽" : "<0.8 衰减"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">决策偏向 Bias</span>
                        <span className="font-mono text-slate-200">
                          {hoveredSubject.calibration_bias > 0 ? `+${hoveredSubject.calibration_bias}` : hoveredSubject.calibration_bias}
                        </span>
                        <span className="text-[9px] ml-1 text-slate-500">
                          {hoveredSubject.calibration_bias > 0.12 ? "自负" : hoveredSubject.calibration_bias < -0.12 ? "谨慎" : "均衡"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">觅食杠杆 IVE</span>
                        <span className="font-mono text-amber-300 font-bold">{(hoveredSubject.ive ?? 0.5).toFixed(3)}</span>
                        <span className="text-[9px] ml-1 text-slate-500">
                          {(hoveredSubject.ive ?? 0.5) >= 0.70 ? "高杠杆" : "自力"}
                        </span>
                      </div>
                    </div>

                    {hoveredSubject.clinical_summary && (
                      <div className="text-[10px] text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5 leading-relaxed">
                        <span className="text-amber-400 font-semibold mr-1">[临床真值]</span>
                        {hoveredSubject.clinical_summary}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
                      <span>最终得分: <strong className="text-yellow-400 font-mono text-xs">{hoveredSubject.final_score}</strong></span>
                      <span className="text-indigo-400 flex items-center">点击查看画像报告 →</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* X 轴刻度尺 */}
            <div className="absolute left-14 right-6 bottom-5 h-4 pointer-events-none text-[10px] font-mono text-slate-500">
              <span className="absolute left-0 text-slate-400">0.0 (基底噪声)</span>
              <span className="absolute left-[20%] -translate-x-1/2">0.2</span>
              <span className="absolute left-[40%] -translate-x-1/2">0.4</span>
              <span className="absolute left-[60%] -translate-x-1/2 text-cyan-400 font-bold whitespace-nowrap">0.6 (相变阈值)</span>
              <span className="absolute left-[80%] -translate-x-1/2">0.8</span>
              <span className="absolute right-0 text-slate-400">1.0 (极值突破)</span>
            </div>

            {/* X 轴水平标头 */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase pointer-events-none">
              相变突破度 D* (自适应阶梯信噪比倒数: [0.85 - δ*] / 0.80)
            </div>
          </div>
        )}

        {/* Spec §7.3 双变量色彩映射图例指南 (Bivariate Color Legend) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            4D 认知流形视觉通道编码规范 (Visual Channels Legend)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* 色相通道说明 */}
            <div className="space-y-1.5">
              <div className="text-slate-400 flex items-center justify-between text-[11px]">
                <span>色相 Hue · 决策偏向倾角 Bias</span>
                <span className="font-mono text-[10px] text-slate-500">双极色温流向</span>
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-[hsl(205,80%,55%)] via-[hsl(155,80%,55%)] to-[hsl(15,85%,55%)] shadow-inner" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span>过度谨慎 (&lt;-0.12)</span>
                <span className="text-emerald-400 font-semibold">知行自洽 (±0.12)</span>
                <span>自负破局 (&gt;+0.12)</span>
              </div>
            </div>

            {/* 饱和度/辉光说明 */}
            <div className="space-y-1.5">
              <div className="text-slate-400 flex items-center justify-between text-[11px]">
                <span>纯度与透明度 Sat/Alpha · 信息觅食杠杆 IVE</span>
                <span className="font-mono text-[10px] text-slate-500">能量充盈度</span>
              </div>
              <div className="h-3 rounded-full bg-gradient-to-r from-slate-600 via-amber-500/70 to-amber-400 shadow-inner" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span>纯内生算力 (IVE=0, α=0.45)</span>
                <span>均衡借力 (IVE=0.5)</span>
                <span className="text-amber-300 font-semibold">高杠杆辉光 (IVE≥0.70)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 历史明细数据表格 */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">受测者 4D 流形评测明细 (MECE 8 大画像全量)</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
              {totalItems} 条
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="搜索受测者 / 称号 / 画像编码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 分类标签过滤栏 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 text-xs no-scrollbar border-b border-white/5">
          <div className="flex items-center gap-1.5 text-slate-500 shrink-0 text-[11px] pr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>标签筛选:</span>
          </div>
          <button
            onClick={() => setSelectedTag("ALL")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 text-xs ${selectedTag === "ALL"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold"
              : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
          >
            <span>全部画像</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedTag === "ALL" ? "bg-white/20 text-white" : "bg-black/30 text-slate-400"
                }`}
            >
              {tagCounts["ALL"] || 0}
            </span>
          </button>
          {QUADRANT_PRESETS.map((q) => {
            const count = tagCounts[q.code] || 0;
            const isSelected = selectedTag === q.code;
            const title = quadrantTitles[q.code] || q.defaultTitle;
            return (
              <button
                key={q.code}
                onClick={() => setSelectedTag(isSelected ? "ALL" : q.code)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 shrink-0 text-xs border ${isSelected
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10 font-semibold"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
              >
                <span className="font-mono text-[10px] opacity-75">{q.code.split("-")[0]}</span>
                <span>{title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-amber-500/30 text-amber-200" : "bg-black/30 text-slate-400"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-medium">
                <th className="py-3 px-3">受测者</th>
                <th className="py-3 px-3">画像称号</th>
                <th className="py-3 px-3">突破度 D*</th>
                <th className="py-3 px-3">M_ratio</th>
                <th className="py-3 px-3">偏向 Bias</th>
                <th className="py-3 px-3">杠杆 IVE</th>
                <th className="py-3 px-3">最终战绩</th>
                <th className="py-3 px-3">临床真值诊断</th>
                <th className="py-3 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedSubjects.map((sub) => {
                const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.50);
                return (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{
                          backgroundColor: colorToken.backgroundColor,
                          border: `1px solid ${colorToken.borderColor}`,
                          boxShadow: colorToken.boxShadow,
                        }}
                      />
                      {sub.name}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-amber-300 font-semibold">{sub.role_title || "人形外挂"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sub.quadrant_code || "Q1-CAL"}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300 font-semibold">
                      {(sub.d_star ?? 0.5).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-300 font-semibold">
                      {sub.m_ratio}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {sub.calibration_bias > 0 ? `+${sub.calibration_bias}` : sub.calibration_bias}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-300">
                      {(sub.ive ?? 0.5).toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-yellow-400">{sub.final_score}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={sub.clinical_summary}>
                      {sub.clinical_summary || "--"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenReport(sub.id)}
                        className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        详情报告
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedSubjects.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    未检索到符合条件的受试者记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控制栏 */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              显示第 <span className="text-white font-mono font-medium">{totalItems > 0 ? startIndex + 1 : 0}</span> - <span className="text-white font-mono font-medium">{endIndex}</span> 条，共 <span className="text-white font-mono font-medium">{totalItems}</span> 条
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-500">每页:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={10}>10 条</option>
                <option value={20}>20 条</option>
                <option value={50}>50 条</option>
                <option value={100}>100 条</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - safeCurrentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-600">...</span>;
                  }
                  return null;
                }

                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs flex items-center justify-center transition-colors ${isActive
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 调阅完整报告 Drawer 弹窗 (双层契约清晰隔离展示) */}
      {selectedSubjectReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  受测者双层诊断报告
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                    {selectedSubjectReport.diagnostic_profile.quadrant_code}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{selectedSubjectReport.subject_name} ({selectedSubjectReport.session_id})</p>
              </div>
              <button
                onClick={() => setSelectedSubjectReport(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 顶栏展示：用户展示层专属称号 */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-2xl font-black text-amber-300">
                {selectedSubjectReport.diagnostic_profile.role_title}
              </div>
              <div className="text-xs text-amber-200/80 mt-1">
                “{selectedSubjectReport.diagnostic_profile.praise_tagline}”
              </div>
            </div>

            {/* 双层架构模块 1：后台统计分析层（严谨客观临床真值） */}
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> 后台统计分析层 · 临床真值与 4D 认知流形特征
              </div>

              {/* 4D 流形参数矩阵 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">突破度 D*</div>
                  <div className="text-sm font-bold font-mono text-cyan-300">
                    {selectedSubjectReport.metacognitive_metrics.d_star?.toFixed(3) ?? "--"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">元认知 M_ratio</div>
                  <div className="text-sm font-bold font-mono text-purple-300">
                    {selectedSubjectReport.metacognitive_metrics.m_ratio}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">决策倾角 Bias</div>
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {selectedSubjectReport.metacognitive_metrics.calibration_bias > 0
                      ? `+${selectedSubjectReport.metacognitive_metrics.calibration_bias}`
                      : selectedSubjectReport.metacognitive_metrics.calibration_bias}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                  <div className="text-[10px] text-slate-400">觅食杠杆 IVE</div>
                  <div className="text-sm font-bold font-mono text-amber-300">
                    {selectedSubjectReport.metacognitive_metrics.info_buying_efficiency?.toFixed(3) ?? "--"}
                  </div>
                </div>
              </div>

              {/* 辅助参数 */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
                <div>一元辨别力 d': <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.d_prime}</span></div>
                <div>二元 Meta-d': <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.meta_d_prime}</span></div>
                <div>Brier Score: <span className="text-slate-200">{selectedSubjectReport.metacognitive_metrics.brier_score}</span></div>
              </div>

              {/* 客观临床诊断摘要 */}
              <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/10 text-xs text-indigo-100 leading-relaxed">
                <span className="font-semibold text-indigo-300">临床真值归因：</span>
                {selectedSubjectReport.diagnostic_profile.clinical_summary || selectedSubjectReport.diagnostic_profile.critical_weakness}
              </div>
            </div>

            {/* 双层架构模块 2：用户交互展示层（纯正面赋能） */}
            <div className="space-y-3 p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> 用户交互展示层 · 赋能解读与专属技能卡片
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                {selectedSubjectReport.diagnostic_profile.empowering_feedback}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-white">专属技能卡片矩阵：</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedSubjectReport.diagnostic_profile.skills.map((s: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>{s.icon}</span> {s.name}
                        </span>
                        <span className="text-[10px] text-amber-300/80">{s.type}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubjectReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
