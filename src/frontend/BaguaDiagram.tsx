import React, { useState, useMemo } from "react";
import SubjectHoverCard from "./components/admin/SubjectHoverCard";
import { SubjectPoint } from "./types/admin";
import { OCTANT_SECTOR_CONFIGS } from "./constants/adminConstants";
import { computeMultivariateColor } from "./utils/manifoldUtils";

interface BaguaDiagramProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

const BAGUA_CX = 440;
const BAGUA_CY = 300;
const R_CORE = 48; // 中心太极奇点核心半径

// 最外侧直线处于扇区最外侧 (R = 216)，另外两条直线严格等分太极到扇区外侧的区域
// (216 - 48) / 3 = 56
// 初爻: 48 + 56 = 104
// 二爻: 48 + 112 = 160
// 上爻 (最外侧直线): 48 + 168 = 216
const R_OUTER_LINE = 216;
const YAO_RADII = [104, 160, 216];

// 扇区边界射线终止半径 (穿过三爻交汇点，至外侧角顶点微节点)
// 顶角外端半径 = 216 / cos(22.5°) ≈ 233.8px
const R_RAY_END = 240;

// 象区标签外展半径 (位于上爻外侧，保持从容呼吸感)
const R_LABEL = 248;

interface YaoLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 8 个象区对应的周易先天八卦标准方位与三爻结构
 * 方位：天地定位(乾南0°/坤北180°)，山泽通气(兑45°/艮225°)，雷风相薄(震135°/巽315°)，水火不相射(离90°/坎270°)
 * lines: [初爻(内), 二爻(中), 上爻(外)], true 为阳实线，false 为阴断线
 */
interface BaguaSectorConfig {
  code: string;
  angle: number; // 卦位中心角 (每个扇区的开口正对该卦象方位)
  name: string;
  dimensionLabel: string;
  lines: [boolean, boolean, boolean];
  nature: string;
}

const BAGUA_SECTORS: BaguaSectorConfig[] = [
  {
    code: "Q1-CAL",
    angle: 0,
    name: "人形外挂",
    dimensionLabel: "M_ratio 自洽极 · 2.0+",
    lines: [true, true, true], // 乾 ☰: 三实线 (纯阳无极，知行自洽)
    nature: "纯粹自洽 · 刚健中正",
  },
  {
    code: "Q4-PIO",
    angle: 45,
    name: "飞龙在天",
    dimensionLabel: "进攻破局 · 审慎侧",
    lines: [true, true, false], // 兑 ☱: 下二实，上一断
    nature: "果敢进击 · 锐意破局",
  },
  {
    code: "Q3-SEN",
    angle: 90,
    name: "定海神针",
    dimensionLabel: "D* 突破极 · 1.0",
    lines: [true, false, true], // 离 ☲: 初实，中断，上实 (外阳内阴)
    nature: "深厚审慎 · 明察秋毫",
  },
  {
    code: "Q5-RET",
    angle: 135,
    name: "大音希声",
    dimensionLabel: "内算借力 · 0.0",
    lines: [true, false, false], // 震 ☳: 初实，中断，上断
    nature: "知弱守拙 · 潜龙勿用",
  },
  {
    code: "Q6-GAM",
    angle: 180,
    name: "无畏先锋",
    dimensionLabel: "M 衰减极 · 盲赌冲锋",
    lines: [false, false, false], // 坤 ☷: 三断线 (纯阴承载，无知盲赌)
    nature: "无畏冲锋 · 破釜沉舟",
  },
  {
    code: "Q8-DRI",
    angle: 225,
    name: "暮光星灵",
    dimensionLabel: "过度自信 · 盲赌侧",
    lines: [false, false, true], // 艮 ☶: 初断，二断，上实
    nature: "灵动漫游 · 止而通幽",
  },
  {
    code: "Q2-EVO",
    angle: 270,
    name: "灵窍天开",
    dimensionLabel: "D* 基底极 · 0.0",
    lines: [false, true, false], // 坎 ☵: 初断，中实，上断 (外阴内阳)
    nature: "敏锐进化 · 见几而作",
  },
  {
    code: "Q7-ARB",
    angle: 315,
    name: "诸葛在世",
    dimensionLabel: "套利借力 · 1.0",
    lines: [false, true, true], // 巽 ☴: 初断，二实，上实
    nature: "借箭套利 · 随风逊入",
  },
];

/**
 * 4 条主轴（8 个半轴方向）定向高能电磁辐射边界射线配置
 * 四条射线理论颜色各不相同：
 * - 22.5° & 202.5°: 元认知效率轴 -> 量子电磁紫
 * - 67.5° & 247.5°: 决策倾角轴 -> 高能电离绯红
 * - 112.5° & 292.5°: 相变突破度轴 -> 宇宙电磁天青
 * - 157.5° & 337.5°: 信息觅食杠杆轴 -> 日冕辐射金
 */
interface BoundaryRayConfig {
  angle: number;
  primary: string;
  beamCore: string;
  beamGlow: string;
}

const BOUNDARY_RAYS: BoundaryRayConfig[] = [
  { angle: 22.5, primary: "#a855f7", beamCore: "#c084fc", beamGlow: "rgba(168, 85, 247, 0.40)" },
  { angle: 67.5, primary: "#f43f5e", beamCore: "#fb7185", beamGlow: "rgba(244, 63, 94, 0.40)" },
  { angle: 112.5, primary: "#06b6d4", beamCore: "#38bdf8", beamGlow: "rgba(6, 182, 212, 0.40)" },
  { angle: 157.5, primary: "#f59e0b", beamCore: "#fbbf24", beamGlow: "rgba(245, 158, 11, 0.40)" },
  { angle: 202.5, primary: "#a855f7", beamCore: "#c084fc", beamGlow: "rgba(168, 85, 247, 0.40)" },
  { angle: 247.5, primary: "#f43f5e", beamCore: "#fb7185", beamGlow: "rgba(244, 63, 94, 0.40)" },
  { angle: 292.5, primary: "#06b6d4", beamCore: "#38bdf8", beamGlow: "rgba(6, 182, 212, 0.40)" },
  { angle: 337.5, primary: "#f59e0b", beamCore: "#fbbf24", beamGlow: "rgba(245, 158, 11, 0.40)" },
];

/**
 * 计算某个方位特定层级爻线的平直切线线段
 * 规则：
 * 1. 线延长，与相邻扇区在交界处形成交汇交叉 (lHalf = wCorner + ext)
 * 2. 阴爻为两截线段，两端向外延伸形成交叉，中间位置必须能明显看出来有空间断隙 (gap = 2 * tGap)
 */
function getYaoLineSegments(
  angleDeg: number,
  r: number,
  isYang: boolean,
  cx: number = BAGUA_CX,
  cy: number = BAGUA_CY
): YaoLineSegment[] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  // 辐射法向量 (指向卦象中心)
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  // 切线横线向量 (与辐射法线严格垂直)
  const vx = -uy;
  const vy = ux;

  // 该层爻线的中心锚点
  const mx = cx + r * ux;
  const my = cy + r * uy;

  // 几何计算：扇区半张角 22.5°，到交界顶点的理论半宽
  const wCorner = r * Math.tan((22.5 * Math.PI) / 180);
  // 线延伸量：相邻扇区的横线在边界交错延长，形成清晰的几何交叉
  const ext = Math.max(8, r * 0.055);
  const lHalf = wCorner + ext;

  if (isYang) {
    // 阳爻：单一贯通横线，从左端延伸交叉点贯穿至右端延伸交叉点
    return [
      {
        x1: mx - lHalf * vx,
        y1: my - lHalf * vy,
        x2: mx + lHalf * vx,
        y2: my + lHalf * vy,
      },
    ];
  } else {
    // 阴爻：两截线段，两端向外延伸与邻卦交叉，中间明确留出空间断隙
    const tGap = Math.round(r * 0.075);
    return [
      {
        x1: mx - lHalf * vx,
        y1: my - lHalf * vy,
        x2: mx - tGap * vx,
        y2: my - tGap * vy,
      },
      {
        x1: mx + tGap * vx,
        y1: my + tGap * vy,
        x2: mx + lHalf * vx,
        y2: my + lHalf * vy,
      },
    ];
  }
}

export default function BaguaDiagram({
  subjects,
  onOpenReport,
  octantStatsMap,
  onHoverStatusChange,
  onActiveSectorChange,
}: BaguaDiagramProps) {
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [hoveredOctant, setHoveredOctant] = useState<string | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  // 极坐标转换屏幕笛卡尔坐标 (静态正俯视 90° 鸟瞰)
  const polarToScreen = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: BAGUA_CX + r * Math.cos(rad),
      y: BAGUA_CY + r * Math.sin(rad),
    };
  };

  // 生成扇形环道分块 Path (用于象区背景悬停感应热区)
  const getSectorAnnulusPath = (startDeg: number, endDeg: number, rIn: number, rOut: number) => {
    const rad1 = ((startDeg - 90) * Math.PI) / 180;
    const rad2 = ((endDeg - 90) * Math.PI) / 180;

    const ox1 = BAGUA_CX + rOut * Math.cos(rad1);
    const oy1 = BAGUA_CY + rOut * Math.sin(rad1);
    const ox2 = BAGUA_CX + rOut * Math.cos(rad2);
    const oy2 = BAGUA_CY + rOut * Math.sin(rad2);

    const ix1 = BAGUA_CX + rIn * Math.cos(rad1);
    const iy1 = BAGUA_CY + rIn * Math.sin(rad1);
    const ix2 = BAGUA_CX + rIn * Math.cos(rad2);
    const iy2 = BAGUA_CY + rIn * Math.sin(rad2);

    return `M ${ix1.toFixed(1)} ${iy1.toFixed(1)} L ${ox1.toFixed(1)} ${oy1.toFixed(1)} A ${rOut} ${rOut} 0 0 1 ${ox2.toFixed(1)} ${oy2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} A ${rIn} ${rIn} 0 0 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)} Z`;
  };

  // 计算受测者在八卦图中的落点：
  // 角度调整：数据严格对齐到每个象区对应的卦位中心角 (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
  const subjectPositions = useMemo(() => {
    return subjects.map((sub) => {
      const code = sub.quadrant_code || "Q1-CAL";
      const sector = BAGUA_SECTORS.find((s) => s.code === code) || BAGUA_SECTORS[0];
      const baseAngle = sector.angle;

      let angleJitter = 0;
      if (code === "Q6-GAM") {
        angleJitter = Math.max(-13, Math.min(13, (sub.calibration_bias - 0.25) * 36));
      } else if (code === "Q1-CAL") {
        angleJitter = Math.max(
          -13,
          Math.min(13, ((sub.m_ratio ?? 1.0) - 1.0 - ((sub.d_star ?? 0.7) - 0.7)) * 18)
        );
      } else if (code === "Q3-SEN") {
        angleJitter = Math.max(-13, Math.min(13, (sub.calibration_bias + 0.2) * 26));
      } else if (code === "Q4-PIO") {
        angleJitter = Math.max(-13, Math.min(13, (sub.calibration_bias - 0.1) * 26));
      } else if (code === "Q2-EVO" || code === "Q7-ARB") {
        angleJitter = Math.max(-13, Math.min(13, ((sub.ive ?? 0.5) - 0.65) * 30));
      } else if (code === "Q5-RET") {
        angleJitter = Math.max(-13, Math.min(13, ((sub.d_star ?? 0.3) - 0.3) * 26));
      } else {
        angleJitter = Math.max(-13, Math.min(13, (sub.calibration_bias - 0.5) * 18));
      }

      const finalAngle = (baseAngle + angleJitter + 360) % 360;

      // 径向距离映射：自然分布在太极奇点外圈与最外侧上爻之间 (穿插于三层爻线间)
      const radialFactor = Math.max(0.08, Math.min(0.92, sub.d_star ?? 0.5));
      const r = R_CORE + 14 + radialFactor * (R_OUTER_LINE - R_CORE - 28);
      const pos = polarToScreen(r, finalAngle);
      const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

      return {
        sub,
        x: pos.x,
        y: pos.y,
        r,
        deg: finalAngle,
        colorToken,
      };
    });
  }, [subjects]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={{ background: "transparent" }}
    >
      <svg
        viewBox="0 0 880 590"
        className="w-full h-full max-h-full max-w-full aspect-[880/590] object-contain overflow-visible"
      >
        <defs>
          {/* 太极阴阳互抱渐变 */}
          <linearGradient id="taiji-white" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="taiji-black" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* A. 8 象区背景感应热区 (每个扇区的开口正对对应卦象方位)          */}
        {/* ============================================================== */}
        <g className="select-none">
          {BAGUA_SECTORS.map((conf) => {
            const isHovered = hoveredOctant === conf.code;
            const startAngle = (conf.angle - 22.5 + 360) % 360;
            const endAngle = (conf.angle + 22.5) % 360;

            return (
              <path
                key={`bagua-sector-${conf.code}`}
                d={getSectorAnnulusPath(startAngle, endAngle, R_CORE + 4, R_OUTER_LINE + 10)}
                fill={isHovered ? "rgba(255, 255, 255, 0.05)" : "transparent"}
                className="transition-colors duration-150 cursor-pointer"
                onMouseEnter={() => {
                  setHoveredOctant(conf.code);
                  if (onHoverStatusChange) {
                    onHoverStatusChange(`【${conf.name}】: ${conf.nature}`);
                  }
                  if (onActiveSectorChange) onActiveSectorChange(conf.code);
                }}
                onMouseLeave={() => {
                  setHoveredOctant(null);
                  if (onHoverStatusChange) onHoverStatusChange(null);
                }}
              />
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* B. 8 条边界高能辐射射线 (分离相临扇区，穿过三爻交汇点)          */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {BOUNDARY_RAYS.map((ray) => {
            const pCore = polarToScreen(R_CORE + 2, ray.angle);
            const pEnd = polarToScreen(R_RAY_END, ray.angle);

            return (
              <g key={`bagua-boundary-ray-${ray.angle}`}>
                {/* 弥散光晕 */}
                <line
                  x1={pCore.x}
                  y1={pCore.y}
                  x2={pEnd.x}
                  y2={pEnd.y}
                  stroke={ray.primary}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity="0.18"
                />
                {/* 高能流束核心 */}
                <line
                  x1={pCore.x}
                  y1={pCore.y}
                  x2={pEnd.x}
                  y2={pEnd.y}
                  stroke={ray.beamCore}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.80"
                />
                {/* 白炽芯 */}
                <line
                  x1={pCore.x}
                  y1={pCore.y}
                  x2={pEnd.x}
                  y2={pEnd.y}
                  stroke="#ffffff"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                {/* 边界端点能量微珠 (位于外层交汇点外侧) */}
                <circle cx={pEnd.x} cy={pEnd.y} r="2.2" fill={ray.primary} />
                <circle cx={pEnd.x} cy={pEnd.y} r="1.0" fill="#ffffff" />
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* C. 标准八卦平直切线三爻结构 (线延长交错交叉，阴爻中间明显空间)  */}
        {/* ============================================================== */}
        <g className="select-none">
          {BAGUA_SECTORS.map((sector) => {
            const isHovered = hoveredOctant === sector.code;
            const sectorConf = OCTANT_SECTOR_CONFIGS[sector.code];
            const pLabel = polarToScreen(R_LABEL, sector.angle);

            return (
              <g
                key={`bagua-trigram-lines-${sector.code}`}
                className="cursor-pointer"
                onMouseEnter={() => {
                  setHoveredOctant(sector.code);
                  if (onHoverStatusChange) {
                    onHoverStatusChange(`【${sector.name}】: ${sector.nature}`);
                  }
                  if (onActiveSectorChange) onActiveSectorChange(sector.code);
                }}
                onMouseLeave={() => {
                  setHoveredOctant(null);
                  if (onHoverStatusChange) onHoverStatusChange(null);
                }}
              >
                {/* 1. 绘制三层平直切线爻 (初爻、二爻、上爻，自内向外) */}
                {sector.lines.map((isYang, levelIdx) => {
                  const rLevel = YAO_RADII[levelIdx];
                  const segments = getYaoLineSegments(sector.angle, rLevel, isYang);

                  return (
                    <g key={`yao-${sector.code}-${levelIdx}`}>
                      {segments.map((seg, segIdx) => (
                        <line
                          key={`seg-${segIdx}`}
                          x1={seg.x1.toFixed(1)}
                          y1={seg.y1.toFixed(1)}
                          x2={seg.x2.toFixed(1)}
                          y2={seg.y2.toFixed(1)}
                          stroke={
                            isHovered
                              ? sectorConf.primaryColor
                              : isYang
                                ? "rgba(255, 255, 255, 0.90)"
                                : "rgba(255, 255, 255, 0.72)"
                          }
                          strokeWidth="3.4"
                          strokeLinecap="round"
                          className="transition-colors duration-150"
                        />
                      ))}
                    </g>
                  );
                })}

                {/* 2. 象区称号与维度副标 (上下两行规整居中叠放，彻底杜绝角度挤压重叠) */}
                <g transform={`translate(${pLabel.x.toFixed(1)}, ${pLabel.y.toFixed(1)})`}>
                  {/* 主标题：象区名称 (纯矢量描边 + 宇宙深空黑 #090a0f 字心) */}
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill="none"
                    stroke={isHovered ? sectorConf.primaryColor : "rgba(255, 255, 255, 0.85)"}
                    strokeWidth={isHovered ? "2.8" : "2.2"}
                    strokeLinejoin="round"
                    fontSize="11.5"
                    fontWeight="900"
                    letterSpacing="1.0"
                  >
                    {sector.name}
                  </text>
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fill="#090a0f"
                    fontSize="11.5"
                    fontWeight="900"
                    letterSpacing="1.0"
                  >
                    {sector.name}
                  </text>

                  {/* 副标题：维度坐标标识 (紧凑微标，规整居于下方) */}
                  <text
                    x="0"
                    y="11.5"
                    textAnchor="middle"
                    fill={isHovered ? sectorConf.primaryColor : "rgba(148, 163, 184, 0.70)"}
                    fontSize="8.5"
                    fontWeight="600"
                    fontFamily="monospace"
                    letterSpacing="0.4"
                    className="transition-colors duration-150"
                  >
                    {sector.dimensionLabel}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* D. 中心太极相变奇点 (黑白双鱼太极核心，严整对称，秩序之源)    */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {/* 太极外环银色包边 */}
          <circle
            cx={BAGUA_CX}
            cy={BAGUA_CY}
            r={R_CORE}
            fill="#090a0f"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.5"
          />

          {/* 阳半圆白鱼 (右侧顺时针) */}
          <path
            d={`M ${BAGUA_CX} ${BAGUA_CY - R_CORE} A ${R_CORE} ${R_CORE} 0 0 1 ${BAGUA_CX} ${BAGUA_CY + R_CORE} A ${R_CORE / 2} ${R_CORE / 2} 0 0 1 ${BAGUA_CX} ${BAGUA_CY} A ${R_CORE / 2} ${R_CORE / 2} 0 0 0 ${BAGUA_CX} ${BAGUA_CY - R_CORE} Z`}
            fill="url(#taiji-white)"
          />

          {/* 阴半圆黑鱼 (左侧逆时针) */}
          <path
            d={`M ${BAGUA_CX} ${BAGUA_CY - R_CORE} A ${R_CORE} ${R_CORE} 0 0 0 ${BAGUA_CX} ${BAGUA_CY + R_CORE} A ${R_CORE / 2} ${R_CORE / 2} 0 0 1 ${BAGUA_CX} ${BAGUA_CY} A ${R_CORE / 2} ${R_CORE / 2} 0 0 0 ${BAGUA_CX} ${BAGUA_CY - R_CORE} Z`}
            fill="url(#taiji-black)"
          />

          {/* 阳中阴眼 (上方黑眼) */}
          <circle cx={BAGUA_CX} cy={BAGUA_CY - R_CORE / 2} r="5.5" fill="#090a0f" />
          <circle cx={BAGUA_CX} cy={BAGUA_CY - R_CORE / 2} r="2" fill="#ffffff" opacity="0.6" />

          {/* 阴中阳眼 (下方白眼) */}
          <circle cx={BAGUA_CX} cy={BAGUA_CY + R_CORE / 2} r="5.5" fill="#ffffff" />
          <circle cx={BAGUA_CX} cy={BAGUA_CY + R_CORE / 2} r="2" fill="#090a0f" opacity="0.6" />
        </g>

        {/* ============================================================== */}
        {/* E. 受测者数据点 (精确落在对应卦象扇区内，穿插于三爻线层级间)   */}
        {/* ============================================================== */}
        <g>
          {subjectPositions.map(({ sub, x, y, colorToken }) => {
            const isHovered = hoveredSubject?.id === sub.id;
            const r = isHovered ? 6.5 : 4.5;
            const isHighLeverage = (sub.ive ?? 0.5) >= 0.7;

            return (
              <g
                key={`bagua-sub-${sub.id}`}
                className="cursor-pointer"
                onClick={() => onOpenReport(sub.id)}
                onMouseEnter={() => {
                  setHoveredSubject(sub);
                  setAnchorPos({ x, y });
                }}
                onMouseLeave={() => {
                  setHoveredSubject(null);
                  setAnchorPos(null);
                }}
              >
                {/* 扩充点击热区 */}
                <circle cx={x} cy={y} r="14" fill="transparent" />

                {/* 高杠杆外光环 */}
                {isHighLeverage && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 3.5}
                    fill="none"
                    stroke={colorToken.borderColor}
                    strokeWidth="1.2"
                    opacity="0.8"
                    strokeDasharray="2 2"
                  />
                )}

                {/* 主实体星辰 */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={colorToken.backgroundColor}
                  stroke={isHovered ? "#ffffff" : colorToken.borderColor}
                  strokeWidth={isHovered ? 2.2 : 1.4}
                  className="transition-transform duration-150"
                  style={{
                    filter: isHovered ? "drop-shadow(0 0 6px #ffffff)" : undefined,
                  }}
                />

                {/* 星辰白炽光心 */}
                <circle cx={x} cy={y} r="1.2" fill="#ffffff" opacity="0.9" />
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* F. 受测者浮动气泡卡片 (统一标准规范组件)                       */}
        {/* ============================================================== */}
        {hoveredSubject && anchorPos && (
          <SubjectHoverCard
            subject={hoveredSubject}
            anchorPos={anchorPos}
            canvasWidth={880}
            canvasHeight={560}
          />
        )}
      </svg>
    </div>
  );
}
