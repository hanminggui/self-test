import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import SubjectHoverCard from "./components/admin/SubjectHoverCard";
import {
  SubjectPoint,
  AxisDetailInfo,
  computeMultivariateColor,
} from "./Admin";
import { getOctantSectorConfigs, getAxisDetailedInfo, OCTANT_SECTOR_CONFIGS } from "./constants/adminConstants";
import { useLocale } from "./contexts/LocaleContext";

interface CosmicGalaxyCompassProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  isRotating?: boolean;
  onToggleRotating?: () => void;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export const GALAXY_CX = 440;
export const GALAXY_CY = 230; // 上移星图中心位置 (原 280 -> 230)

// 固定种子生成深空星尘粒子 (64 颗恒星背景，固定不闪烁变形)
const STARFIELD_STARS = Array.from({ length: 64 }).map((_, i) => {
  const seed1 = Math.sin(i * 997.3) * 10000;
  const seed2 = Math.cos(i * 883.7) * 10000;
  const seed3 = Math.sin(i * 433.1) * 10000;
  return {
    id: `star-${i}`,
    x: Math.abs(seed1 - Math.floor(seed1)) * 880,
    y: Math.abs(seed2 - Math.floor(seed2)) * 560,
    r: 0.5 + Math.abs(seed3 - Math.floor(seed3)) * 1.0,
    opacity: 0.12 + (i % 5) * 0.12,
    duration: 3 + (i % 4) * 2,
  };
});

// 银河吸积盘微星尘群：随星系 3D 盘面旋转，呈现淡淡的一小点颜色 (天青、柔紫、暖金、微粉、冰蓝与纯白)
// 围绕着核心外缘 (R: 56~120) 与中盘吸积带 (R: 120~246) 自然聚拢，如同真实银河可见光
const GALACTIC_STARDUST = Array.from({ length: 72 }).map((_, i) => {
  const seed1 = Math.sin(i * 127.31) * 10000;
  const seed2 = Math.cos(i * 311.83) * 10000;
  const seed3 = Math.sin(i * 571.19) * 10000;

  const r1 = Math.abs(seed1 - Math.floor(seed1));
  const r2 = Math.abs(seed2 - Math.floor(seed2));
  const r3 = Math.abs(seed3 - Math.floor(seed3));

  // 极径分布：沿旋臂从 16px 自然延伸到 235px
  const radius = 16 + Math.pow(r1, 1.15) * 219;
  // 4 条对数螺旋旋臂基底相位 (0°, 90°, 180°, 270°)
  const armBase = (i % 4) * 90;
  // 旋臂随半径外旋的角度 (约 260°) + 适度随机散射 (+- 14度)
  const armCurl = (radius / 235) * 260;
  const scatter = (r2 - 0.5) * 28;
  const angle = (armBase + armCurl + scatter + 360) % 360;

  // 6 种微星光谱色：淡淡的一小点颜色
  const colors = [
    "rgba(56, 189, 248, 0.70)",  // 淡淡的天青
    "rgba(192, 132, 252, 0.65)", // 淡淡的柔紫
    "rgba(253, 224, 71, 0.60)",  // 淡淡的暖星金
    "rgba(244, 114, 182, 0.55)", // 淡淡的星云粉
    "rgba(255, 255, 255, 0.80)", // 晶莹纯白
    "rgba(147, 197, 253, 0.65)", // 淡淡的冰蓝
  ];
  const color = colors[i % colors.length];

  return {
    id: `dust-${i}`,
    r: radius,
    deg: angle,
    baseR: 0.55 + r3 * 0.95, // 0.55px ~ 1.50px 淡淡的一小点
    color,
    baseOpacity: 0.28 + (i % 5) * 0.11,
  };
});

/**
 * 4 条主轴（8 个半轴方向）定向高能电磁辐射能谱色彩配置
 * 四条射线理论颜色各不相同：
 * - 0° & 180°: 元认知效率轴 (M_ratio) -> 量子电磁紫 (Violet)
 * - 45° & 225°: 决策倾角轴 (Calibration Bias) -> 高能电离绯红 (Crimson)
 * - 90° & 270°: 相变突破度轴 (D*) -> 宇宙电磁天青蓝 (Cyan)
 * - 135° & 315°: 信息觅食杠杆轴 (IVE) -> 日冕辐射琥珀金 (Amber / Gold)
 */
export interface AxisRayColorConfig {
  coreWhite: string;
  primary: string;
  beamGlow: string;
  beamCore: string;
  wavepacketDash: string; // 电磁波节/波包脉动虚线纹理
}

export const AXIS_RAY_COLOR_CONFIGS: Record<number, AxisRayColorConfig> = {
  // 轴 1 (M_ratio 轴): 量子电磁紫
  0: {
    coreWhite: "#f3e8ff",
    primary: "#c084fc",
    beamGlow: "rgba(192, 132, 252, 0.75)",
    beamCore: "#a855f7",
    wavepacketDash: "6 12",
  },
  180: {
    coreWhite: "#f3e8ff",
    primary: "#c084fc",
    beamGlow: "rgba(168, 85, 247, 0.75)",
    beamCore: "#9333ea",
    wavepacketDash: "6 12",
  },

  // 轴 2 (Bias 轴): 高能电离绯红
  45: {
    coreWhite: "#ffe4e6",
    primary: "#fb7185",
    beamGlow: "rgba(251, 113, 133, 0.75)",
    beamCore: "#f43f5e",
    wavepacketDash: "10 16",
  },
  225: {
    coreWhite: "#ffe4e6",
    primary: "#fb7185",
    beamGlow: "rgba(244, 63, 94, 0.75)",
    beamCore: "#e11d48",
    wavepacketDash: "10 16",
  },

  // 轴 3 (D* 轴): 宇宙电磁天青蓝
  90: {
    coreWhite: "#e0f2fe",
    primary: "#38bdf8",
    beamGlow: "rgba(56, 189, 248, 0.75)",
    beamCore: "#0284c7",
    wavepacketDash: "8 14",
  },
  270: {
    coreWhite: "#e0f2fe",
    primary: "#38bdf8",
    beamGlow: "rgba(14, 165, 233, 0.75)",
    beamCore: "#0369a1",
    wavepacketDash: "8 14",
  },

  // 轴 4 (IVE 轴): 日冕辐射琥珀金
  135: {
    coreWhite: "#fef3c7",
    primary: "#fbbf24",
    beamGlow: "rgba(251, 191, 36, 0.75)",
    beamCore: "#f59e0b",
    wavepacketDash: "7 13",
  },
  315: {
    coreWhite: "#fef3c7",
    primary: "#fbbf24",
    beamGlow: "rgba(245, 158, 11, 0.75)",
    beamCore: "#d97706",
    wavepacketDash: "7 13",
  },
};

/**
 * 8 个象区相邻两根高能射线的能谱色彩对 (按旋转相邻关系提取)
 * 用于象区名称字体颜色能谱取值及空心外发光效果
 */
export const OCTANT_RAY_COLOR_PAIRS: Record<
  string,
  { color1: string; color2: string; glow1: string; glow2: string }
> = {
  "Q1-CAL": {
    color1: "#c084fc", // 0° M 轴 (量子紫)
    color2: "#fb7185", // 45° Bias 轴 (电离绯红)
    glow1: "rgba(192, 132, 252, 0.7)",
    glow2: "rgba(251, 113, 133, 0.7)",
  },
  "Q4-PIO": {
    color1: "#fb7185", // 45° Bias 轴 (电离绯红)
    color2: "#38bdf8", // 90° D* 轴 (天青蓝)
    glow1: "rgba(251, 113, 133, 0.7)",
    glow2: "rgba(56, 189, 248, 0.7)",
  },
  "Q3-SEN": {
    color1: "#38bdf8", // 90° D* 轴 (天青蓝)
    color2: "#fbbf24", // 135° IVE 轴 (琥珀金)
    glow1: "rgba(56, 189, 248, 0.7)",
    glow2: "rgba(251, 191, 36, 0.7)",
  },
  "Q5-RET": {
    color1: "#fbbf24", // 135° IVE 轴 (琥珀金)
    color2: "#c084fc", // 180° M 轴 (量子紫)
    glow1: "rgba(251, 191, 36, 0.7)",
    glow2: "rgba(192, 132, 252, 0.7)",
  },
  "Q6-GAM": {
    color1: "#c084fc", // 180° M 轴 (量子紫)
    color2: "#fb7185", // 225° Bias 轴 (电离绯红)
    glow1: "rgba(192, 132, 252, 0.7)",
    glow2: "rgba(251, 113, 133, 0.7)",
  },
  "Q8-DRI": {
    color1: "#fb7185", // 225° Bias 轴 (电离绯红)
    color2: "#38bdf8", // 270° D* 轴 (天青蓝)
    glow1: "rgba(251, 113, 133, 0.7)",
    glow2: "rgba(56, 189, 248, 0.7)",
  },
  "Q2-EVO": {
    color1: "#38bdf8", // 270° D* 轴 (天青蓝)
    color2: "#fbbf24", // 315° IVE 轴 (琥珀金)
    glow1: "rgba(56, 189, 248, 0.7)",
    glow2: "rgba(251, 191, 36, 0.7)",
  },
  "Q7-ARB": {
    color1: "#fbbf24", // 315° IVE 轴 (琥珀金)
    color2: "#c084fc", // 0° M 轴 (量子紫)
    glow1: "rgba(251, 191, 36, 0.7)",
    glow2: "rgba(192, 132, 252, 0.7)",
  },
};

/**
 * 3D 斜上方 45 度透视投影数学引擎
 * 将极坐标 (r, angleDeg) 经过盘面自转 rotation 投影到 45° 斜视摄像机屏幕坐标
 */
function project3D(
  r: number,
  angleDeg: number,
  rotation: number,
  cx: number = GALAXY_CX,
  cy: number = GALAXY_CY,
  tiltDeg: number = 45,
  dist: number = 680
) {
  const curAngle = angleDeg + rotation;
  const rad = ((curAngle - 90) * Math.PI) / 180;
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const cosTilt = Math.cos(tiltRad); // 0.7071
  const sinTilt = Math.sin(tiltRad); // 0.7071

  const xLocal = r * Math.cos(rad);
  const yLocal = r * Math.sin(rad);

  const xWorld = xLocal;
  const yWorld = yLocal * cosTilt;
  const zWorld = yLocal * sinTilt; // 深度：正向靠前（近），负向靠后（远）

  // 透视缩放比 (近大远小)
  const scale = dist / (dist - zWorld);
  const xScreen = cx + xWorld * scale;
  const yScreen = cy + yWorld * scale;

  return {
    x: xScreen,
    y: yScreen,
    scale,
    depth: zWorld,
    xWorld,
    yWorld,
    zWorld,
  };
}

/**
 * 计算受测者在盘面上的基础极坐标 (极径 r 与 极角 deg)
 */
function getSubjectPolar(sub: SubjectPoint) {
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
  return { r, deg: finalAngle };
}

/**
 * 计算星盘在极径 r 处的引力滞后与角动量向心弯曲偏移角 (度)
 * 全程导数连续光滑，彻底消除硬截断导致的折角/转角瑕疵
 * 根据旋转速度计算射线展示出的扭曲度，拖拽时随向心力变化 8 个区域随射线弯曲变成同等级形变
 */
export function getCurvatureOffsetDeg(r: number, angularVelocity: number): number {
  if (r <= 0) return 0;
  const speedSign = Math.sign(angularVelocity || 1);
  const speedAbs = Math.abs(angularVelocity);

  // 基础巡航引力微弯 (约 7.5°) + 拖拽/高速时向心力平滑动态弯曲 (平滑最大至 ~30°)
  const dynamicBend = Math.min(22, speedAbs * 6.5);
  const totalBend = 7.5 + dynamicBend;

  // 使用无截断平滑 S 型饱和函数：在 r=0 处值为 0 且一阶导为 0；随 r 增大平滑单调展开并柔和饱和至渐近线
  // 杜绝任何 Math.min 硬折点！
  const u = r / 280;
  const smoothRadial = (2.2 * Math.pow(u, 1.35)) / (1 + 0.38 * Math.pow(u, 1.35));

  // 负号为向旋转后方滞后
  return -speedSign * totalBend * smoothRadial;
}

/**
 * 4D 认知流形全息星系组件 (Cosmic Manifold Galaxy)
 * - 最外侧无边界星空展示
 * - 斜上方 45 度视角查看
 * - 近大远小透视缩放
 * - 每个人为一颗 3D 球体行星 (高杠杆配备土星光环)
 * - 4 条高能射线随中心旋转并伴随引力向心弯曲
 * - 射线端点文字紧凑包裹，字形吞光黑洞剪影，外部高能发光衬托轮廓
 * - 8 个区域随射线弯曲保持同等级形变
 */
export default function CosmicGalaxyCompass({
  subjects,
  onOpenReport,
  octantStatsMap,
  isRotating: externalIsRotating,
  onToggleRotating,
  onHoverStatusChange,
  onActiveSectorChange,
}: CosmicGalaxyCompassProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";
  const octantSectorConfigs = getOctantSectorConfigs(locale);
  const axisDetailedInfo = getAxisDetailedInfo(locale);

  const containerRef = useRef<HTMLDivElement>(null);

  // 动画与手势状态
  const [rotation, setRotation] = useState(0);
  const [velocity, setVelocity] = useState(0.16);
  const [internalIsRotating, setInternalIsRotating] = useState(true);
  const isRotating = externalIsRotating !== undefined ? externalIsRotating : internalIsRotating;

  // 悬浮状态
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [hoveredOctant, setHoveredOctant] = useState<string | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<AxisDetailInfo | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  // 同步悬停状态给父组件 (供右侧面板动态展示)
  useEffect(() => {
    if (!onHoverStatusChange) return;
    if (hoveredOctant) {
      const conf = octantSectorConfigs[hoveredOctant];
      onHoverStatusChange(isEn ? `[${conf?.name}]: ${conf?.desc}` : `【${conf?.name}】: ${conf?.desc}`);
    } else if (hoveredAxis) {
      onHoverStatusChange(isEn ? `[${hoveredAxis.shortName}]: ${hoveredAxis.dimension}` : `【${hoveredAxis.shortName}】: ${hoveredAxis.dimension}`);
    } else {
      onHoverStatusChange(null);
    }
  }, [hoveredOctant, hoveredAxis, onHoverStatusChange, octantSectorConfigs, isEn]);

  // 动能物理引擎 Ref
  const rotationRef = useRef(0);
  const lastRenderedRotRef = useRef(-999);
  const lastRenderedVelRef = useRef(-999);
  const angularVelocityRef = useRef(0.16);
  const isInteractingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const wheelTimeoutRef = useRef<number | null>(null);

  // 物理惯性动能循环 (单源 RAF 驱动，60fps 统一分发自转与速度更新)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      const isPausedByHover = Boolean(hoveredSubject || hoveredOctant || hoveredAxis);

      if (!isInteractingRef.current && isRotating && !isPausedByHover) {
        if (Math.abs(angularVelocityRef.current) > 0.18) {
          angularVelocityRef.current *= 0.95; // 惯性阻尼
        } else {
          angularVelocityRef.current = 0.16 * Math.sign(angularVelocityRef.current || 1); // 匀速巡航速度
        }

        rotationRef.current = (rotationRef.current + angularVelocityRef.current + 360) % 360;
      }

      // 仅在角度或速度发生实质变化时提交 React 渲染
      const curRot = rotationRef.current;
      const curVel = angularVelocityRef.current;
      if (
        Math.abs(curRot - lastRenderedRotRef.current) > 0.001 ||
        Math.abs(curVel - lastRenderedVelRef.current) > 0.01
      ) {
        lastRenderedRotRef.current = curRot;
        lastRenderedVelRef.current = curVel;
        setRotation(curRot);
        setVelocity(curVel);
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [isRotating, hoveredSubject, hoveredOctant, hoveredAxis]);

  // 原生触控板双指手势 (wheel) 监听：横滑或纵滑平滑旋转 (仅更新 ref，由 RAF 批量消费)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const angleDelta = dominantDelta * 0.28;

      rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
      angularVelocityRef.current = Math.max(-10, Math.min(10, angleDelta * 0.45));
      isInteractingRef.current = true;

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
      }, 140);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 鼠标原生拖拽拨盘 (仅在 PointerMove 中累加角位移，由 RAF 统一渲染，消除拖拽卡顿)
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".galaxy-planet") ||
      target.closest(".galaxy-tooltip") ||
      target.closest(".galaxy-badge")
    ) {
      return;
    }

    isInteractingRef.current = true;
    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    angularVelocityRef.current = 0;

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastPointerXRef.current;
      const now = performance.now();
      const dt = now - lastPointerTimeRef.current;

      const angleDelta = dx * 0.45;
      if (dt > 0) {
        angularVelocityRef.current = Math.max(-12, Math.min(12, (angleDelta / dt) * 16));
      }

      lastPointerXRef.current = ev.clientX;
      lastPointerTimeRef.current = now;

      // 仅更新角度数值，不触发高频 setRotation！
      rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
    };

    const handleWindowPointerUp = () => {
      isInteractingRef.current = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  };

  // 预先缓存所有受测者星球的极坐标
  const subjectPolars = useMemo(() => {
    return subjects.map((sub) => ({
      sub,
      polar: getSubjectPolar(sub),
    }));
  }, [subjects]);

  // 计算当前帧所有星球的 3D 屏幕投影并按深度排序 (8 个区域随射线弯曲同等级形变)
  const projectedPlanets = useMemo(() => {
    const list = subjectPolars.map(({ sub, polar }) => {
      const curveOffset = getCurvatureOffsetDeg(polar.r, velocity);
      const currentDeg = polar.deg + rotation + curveOffset;
      const proj = project3D(polar.r, currentDeg, 0, GALAXY_CX, GALAXY_CY, 45, 680);
      const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

      const screenR = 4.8 * proj.scale;
      const opacity = Math.min(1.0, Math.max(0.4, 0.45 + (proj.depth + 180) / 360));

      return {
        sub,
        proj,
        screenR,
        opacity,
        colorToken,
      };
    });

    // 深度排序：depth 小的在远处，先渲染；depth 大的在近处，后渲染
    return list.sort((a, b) => a.proj.depth - b.proj.depth);
  }, [subjectPolars, rotation, velocity]);

  // 生成随自转旋转及速度引力弯曲的高能射线路径 (从中心原点直射深空 R=440，密集 32 步采样平滑无折角，快速数值舍入零 GC 开销)
  const getCurvedRayPath = useCallback(
    (baseDeg: number) => {
      const points: string[] = [];
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = t * 440;
        const curveOffset = getCurvatureOffsetDeg(r, velocity);
        const finalAngle = baseDeg + rotation + curveOffset;
        const p = project3D(r, finalAngle, 0, GALAXY_CX, GALAXY_CY, 45, 680);
        const px = Math.round(p.x * 10) / 10;
        const py = Math.round(p.y * 10) / 10;
        points.push(i === 0 ? `M${px} ${py}` : `L${px} ${py}`);
      }
      return points.join("");
    },
    [rotation, velocity]
  );

  // 计算当前帧银河吸积盘微星尘的 3D 投影坐标 (随引力弯曲同等级形变)
  const projectedStardust = useMemo(() => {
    return GALACTIC_STARDUST.map((star) => {
      const curveOffset = getCurvatureOffsetDeg(star.r, velocity);
      const currentDeg = star.deg + rotation + curveOffset;
      const proj = project3D(star.r, currentDeg, 0, GALAXY_CX, GALAXY_CY, 45, 680);
      return {
        ...star,
        proj,
        screenR: Math.max(0.4, star.baseR * proj.scale),
        opacity: Math.min(1.0, Math.max(0.18, star.baseOpacity * proj.scale * 0.9)),
      };
    });
  }, [rotation, velocity]);

  // 生成同心透视椭圆路径 (采样 36 个点平滑连线)
  const getPerspectiveEllipsePath = (r: number) => {
    const points: string[] = [];
    for (let i = 0; i <= 36; i++) {
      const deg = (i / 36) * 360;
      const p = project3D(r, deg, 0, GALAXY_CX, GALAXY_CY, 45, 680);
      points.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    return points.join(" ") + " Z";
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none overflow-hidden select-none"
      style={{
        background: "transparent",
      }}
    >
      <svg viewBox="0 0 880 560" className="w-full h-full max-h-full max-w-full aspect-[880/560] object-contain overflow-visible pointer-events-auto">
          <defs>
            {/* 1. 恒星引力核心光晕 */}
            <radialGradient id="galactic-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#090a0f" stopOpacity="0" />
            </radialGradient>

            {/* 2. 8 个象区相邻高能射线双色能谱融合渐变 (用于象区名称空心发光描边) */}
            {Object.entries(OCTANT_RAY_COLOR_PAIRS).map(([code, pair]) => (
              <linearGradient key={`octant-grad-${code}`} id={`octant-grad-${code}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={pair.color1} />
                <stop offset="100%" stopColor={pair.color2} />
              </linearGradient>
            ))}

            {/* 3. 星球 3D 立体球体材质渐变 (左上光源) */}
            <radialGradient id="planet-rose" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#ffe4e6" />
              <stop offset="40%" stopColor="#f43f5e" />
              <stop offset="80%" stopColor="#9f1239" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>

            <radialGradient id="planet-cyan" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#cffafe" />
              <stop offset="40%" stopColor="#06b6d4" />
              <stop offset="80%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#164e63" />
            </radialGradient>

            <radialGradient id="planet-emerald" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="80%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            <radialGradient id="planet-purple" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#f3e8ff" />
              <stop offset="40%" stopColor="#a855f7" />
              <stop offset="80%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#3b0764" />
            </radialGradient>

            <radialGradient id="planet-amber" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* A. 银河可见微星尘与深空背景 (淡淡的一小点颜色，围绕星盘聚拢)  */}
          {/* ============================================================== */}
          <g className="pointer-events-none select-none">
            {/* 1. 远深空背景恒星点 (极淡微星背景) */}
            {STARFIELD_STARS.map((star) => (
              <circle
                key={star.id}
                cx={star.x}
                cy={star.y}
                r={star.r * 0.7}
                fill="#ffffff"
                opacity={star.opacity * 0.55}
              />
            ))}

            {/* 2. 银河星盘微星光点群：淡淡的一小点颜色，围绕着银河吸积带自然聚集 */}
            {projectedStardust.map((star) => (
              <circle
                key={star.id}
                cx={star.proj.x.toFixed(1)}
                cy={star.proj.y.toFixed(1)}
                r={star.screenR}
                fill={star.color}
                opacity={star.opacity}
              />
            ))}
          </g>

          {/* ============================================================== */}
          {/* B. 45° 透视能级轨道 (已去除最外侧圆线，呈现无边界深空)          */}
          {/* ============================================================== */}
          <g className="pointer-events-none select-none">
            {/* 被动防御环 R=115 (极淡虚线指引) */}
            <path
              d={getPerspectiveEllipsePath(115)}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
            />
            {/* 核心自洽环 R=180 (极淡虚线指引) */}
            <path
              d={getPerspectiveEllipsePath(180)}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="0.8"
              strokeDasharray="4 6"
            />
          </g>

          {/* ============================================================== */}
          {/* C. 4 条高能定向电磁辐射射线 (随自转旋转并伴随引力弯曲，向心力动态形变) */}
          {/* 四个射线的颜色理论上各不相同：紫(M) / 红(Bias) / 蓝(D*) / 金(IVE)  */}
          {/* ============================================================== */}
          <g className="select-none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rayConf = AXIS_RAY_COLOR_CONFIGS[deg] || AXIS_RAY_COLOR_CONFIGS[0];
              const axisInfo = axisDetailedInfo[deg];

              // 关键性能优化：每方向仅计算一次 32 步投影曲线，5 层光晕流束直接复用
              const rayPath = getCurvedRayPath(deg);

              // 1. 中心交叉原点坐标 (在 r=0 处四线恒等交叉交汇，绝对不留空)
              const pZero = project3D(0, 0, 0, GALAXY_CX, GALAXY_CY, 45, 680);

              // 2. 标定刻度位置 R=250 (随旋转与引力弯曲同动)
              const curveTick = getCurvatureOffsetDeg(250, velocity);
              const pTick = project3D(250, deg + rotation + curveTick, 0, GALAXY_CX, GALAXY_CY, 45, 680);

              // 3. 刻度数值位置 R=262
              const curveNum = getCurvatureOffsetDeg(262, velocity);
              const pNum = project3D(262, deg + rotation + curveNum, 0, GALAXY_CX, GALAXY_CY, 45, 680);

              // 4. 轴线两端文字徽章位置 R=292
              const curveName = getCurvatureOffsetDeg(292, velocity);
              const pName = project3D(292, deg + rotation + curveName, 0, GALAXY_CX, GALAXY_CY, 45, 680);

              // 标定刻度切向微线角度
              const tickAngleRad = (((deg + rotation + curveTick) - 90) * Math.PI) / 180;
              const perpX = -Math.sin(tickAngleRad) * 4.5 * pTick.scale;
              const perpY = Math.cos(tickAngleRad) * 4.5 * pTick.scale * 0.7071;

              return (
                <g key={`galaxy-axis-${deg}`}>
                  {/* 层次 1: 广域外圈弥散电磁辐射光晕 (复用 rayPath，零丢帧) */}
                  <path
                    d={rayPath}
                    fill="none"
                    stroke={rayConf.primary}
                    strokeWidth={22 * pZero.scale}
                    strokeLinecap="round"
                    opacity={0.08}
                  />

                  {/* 层次 2: 次级聚束高能辐射辉光 */}
                  <path
                    d={rayPath}
                    fill="none"
                    stroke={rayConf.primary}
                    strokeWidth={10 * pZero.scale}
                    strokeLinecap="round"
                    opacity={0.24}
                  />

                  {/* 层次 3: 准直高能辐射粒子弯曲束流 */}
                  <path
                    d={rayPath}
                    fill="none"
                    stroke={rayConf.beamCore}
                    strokeWidth={3.8 * pZero.scale}
                    strokeLinecap="round"
                    opacity={0.72}
                  />

                  {/* 层次 4: 定向电磁波包节律脉冲 */}
                  <path
                    d={rayPath}
                    fill="none"
                    stroke={rayConf.primary}
                    strokeWidth={1.8 * pZero.scale}
                    strokeDasharray={rayConf.wavepacketDash}
                    strokeLinecap="round"
                    opacity={0.88}
                  />

                  {/* 层次 5: 白炽高能中心超导芯 */}
                  <path
                    d={rayPath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.0 * pZero.scale}
                    strokeLinecap="round"
                    opacity={0.96}
                  />

                  {/* 标定刻度点 (R=250 精密刻度横线) */}
                  <line
                    x1={pTick.x - perpX}
                    y1={pTick.y - perpY}
                    x2={pTick.x + perpX}
                    y2={pTick.y + perpY}
                    stroke={rayConf.primary}
                    strokeWidth={1.5 * pTick.scale}
                    opacity={0.85}
                  />
                  <circle
                    cx={pTick.x}
                    cy={pTick.y}
                    r={2.0 * pTick.scale}
                    fill={rayConf.primary}
                    opacity={0.9}
                  />

                  {/* 刻度数值展示 */}
                  <g transform={`translate(${pNum.x.toFixed(1)}, ${pNum.y.toFixed(1)})`}>
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={Math.max(7.5, 9 * pNum.scale)}
                      fontFamily="monospace"
                      fontWeight="bold"
                      letterSpacing="0.3"
                      opacity={Math.min(1, Math.max(0.45, pNum.scale * 0.85))}
                    >
                      {axisInfo.value}
                    </text>
                  </g>

                  {/* 轴线两端文字：字心严格限制为宇宙背景色 #090a0f，外部分光晕为射线光色 */}
                  <g
                    className="galaxy-badge cursor-pointer"
                    transform={`translate(${pName.x.toFixed(1)}, ${pName.y.toFixed(1)})`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                      setHoveredAxis(axisInfo);
                      setHoveredOctant(null);
                      setHoveredSubject(null);
                      setAnchorPos({ x: pName.x, y: pName.y });
                    }}
                    onMouseLeave={() => {
                      setHoveredAxis(null);
                    }}
                  >
                    {/* 透明交互感应热区 */}
                    <rect
                      x={-28 * pName.scale}
                      y={-10 * pName.scale}
                      width={56 * pName.scale}
                      height={20 * pName.scale}
                      fill="transparent"
                      pointerEvents="all"
                    />

                    {/* 1. 外部分光晕层：射线高能专属色纯矢量多层描边 (无 textShadow，彻底消除运动抖动) */}
                    <text
                      x="0"
                      y={3.8 * pName.scale}
                      textAnchor="middle"
                      fill="none"
                      stroke={rayConf.primary}
                      strokeWidth={2.6 * pName.scale}
                      strokeLinejoin="round"
                      opacity={0.92}
                      fontSize={Math.max(8.5, 10.5 * pName.scale)}
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      letterSpacing="0.4"
                      pointerEvents="none"
                    >
                      {axisInfo.shortName}
                    </text>

                    {/* 2. 顶层字心：严格限制为宇宙背景色 #090a0f (实体黑字，被射线外部分纯矢量光晕勾勒轮廓) */}
                    <text
                      x="0"
                      y={3.8 * pName.scale}
                      textAnchor="middle"
                      fill="#090a0f"
                      fontSize={Math.max(8.5, 10.5 * pName.scale)}
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      letterSpacing="0.4"
                      pointerEvents="none"
                    >
                      {axisInfo.shortName}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* ============================================================== */}
          {/* D. 8 个相室画像名称 (字体颜色固定为宇宙背景色，半透明白光外包围晕染，无抖动纯矢量) */}
          {/* ============================================================== */}
          <g className="select-none">
            {Object.values(octantSectorConfigs).map((conf) => {
              // 位于各相室中心角，半径 R=296，随旋转与向心力引力弯曲同等级形变
              const curveOffset = getCurvatureOffsetDeg(296, velocity);
              const pOctant = project3D(296, conf.centerAngle + rotation + curveOffset, 0, GALAXY_CX, GALAXY_CY, 45, 680);
              const isHovered = hoveredOctant === conf.code;

              return (
                <g
                  key={`galaxy-octant-badge-${conf.code}`}
                  className="galaxy-badge cursor-pointer"
                  transform={`translate(${pOctant.x.toFixed(1)}, ${pOctant.y.toFixed(1)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    setHoveredOctant(conf.code);
                    setHoveredAxis(null);
                    setHoveredSubject(null);
                    setAnchorPos({ x: pOctant.x, y: pOctant.y });
                    if (onActiveSectorChange) onActiveSectorChange(conf.code);
                  }}
                  onMouseLeave={() => {
                    setHoveredOctant(null);
                  }}
                >
                  {/* 透明交互热区 (无外边框) */}
                  <rect
                    x={-42 * pOctant.scale}
                    y={-14 * pOctant.scale}
                    width={84 * pOctant.scale}
                    height={28 * pOctant.scale}
                    fill="transparent"
                    pointerEvents="all"
                  />

                  {/* 1. 半透明白光外包围晕染：外层柔和白光纯矢量描边 (无 textShadow 滤镜，零抖动) */}
                  <text
                    x="0"
                    y={4 * pOctant.scale}
                    textAnchor="middle"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.40)"
                    strokeWidth={(isHovered ? 3.6 : 2.6) * pOctant.scale}
                    strokeLinejoin="round"
                    fontSize={Math.max(9.5, 12 * pOctant.scale)}
                    fontWeight="900"
                    letterSpacing="1.2"
                    pointerEvents="none"
                  >
                    {conf.name}
                  </text>

                  {/* 2. 半透明白光外包围晕染：内层清晰聚束白光轮廓 */}
                  <text
                    x="0"
                    y={4 * pOctant.scale}
                    textAnchor="middle"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.85)"
                    strokeWidth={1.2 * pOctant.scale}
                    strokeLinejoin="round"
                    fontSize={Math.max(9.5, 12 * pOctant.scale)}
                    fontWeight="900"
                    letterSpacing="1.2"
                    pointerEvents="none"
                  >
                    {conf.name}
                  </text>

                  {/* 3. 区域字体颜色：固定为宇宙背景色 #090a0f (实体黑字，被半透明白光外包围衬出) */}
                  <text
                    x="0"
                    y={4 * pOctant.scale}
                    textAnchor="middle"
                    fill="#090a0f"
                    fontSize={Math.max(9.5, 12 * pOctant.scale)}
                    fontWeight="900"
                    letterSpacing="1.2"
                    pointerEvents="none"
                  >
                    {conf.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ============================================================== */}
          {/* E. 中心四线交叉原点与相变奇点 (四色射线在此交汇相交，绝不留空)    */}
          {/* ============================================================== */}
          <g className="pointer-events-none select-none">
            {/* 核心微晕 (不遮挡线条，透出射线交汇的白炽能量光) */}
            <circle cx={GALAXY_CX} cy={GALAXY_CY} r="9" fill="url(#galactic-core-glow)" opacity="0.85" />
            {/* 4 条高能射线相交之极密白炽奇点 (静态超密核，无跳动动画) */}
            <circle cx={GALAXY_CX} cy={GALAXY_CY} r="2.8" fill="#ffffff" />
          </g>

          {/* ============================================================== */}
          {/* F. 受测者 3D 星球渲染 (近大远小、立体球体渐变、土星环、Z-Sort)  */}
          {/* ============================================================== */}
          <g>
            {projectedPlanets.map(({ sub, proj, screenR, opacity }) => {
              const isHovered = hoveredSubject?.id === sub.id;
              const planetR = isHovered ? screenR * 1.45 : screenR;
              // 根据画像类型或偏差选择行星材质渐变
              let planetGrad = "url(#planet-emerald)";
              if (sub.quadrant_code === "Q6-GAM") planetGrad = "url(#planet-rose)";
              else if (sub.quadrant_code === "Q5-RET" || sub.calibration_bias < -0.12) planetGrad = "url(#planet-cyan)";
              else if (sub.quadrant_code === "Q8-DRI") planetGrad = "url(#planet-purple)";
              else if (sub.quadrant_code === "Q7-ARB" || sub.quadrant_code === "Q4-PIO" || sub.calibration_bias > 0.12)
                planetGrad = "url(#planet-amber)";

              const isHighLeverage = (sub.ive ?? 0.5) >= 0.7;

              return (
                <g
                  key={`galaxy-planet-${sub.id}`}
                  className="galaxy-planet cursor-pointer"
                  opacity={opacity}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReport(sub.id);
                  }}
                  onMouseEnter={() => {
                    setHoveredSubject(sub);
                    setHoveredOctant(null);
                    setHoveredAxis(null);
                    setAnchorPos({ x: proj.x, y: proj.y });
                  }}
                  onMouseLeave={() => {
                    setHoveredSubject(null);
                    setAnchorPos(null);
                  }}
                >
                  {/* 16px 扩充透明点击热区 (杜绝脱靶) */}
                  <circle cx={proj.x} cy={proj.y} r={16 * proj.scale} fill="transparent" />

                  {/* 好友/引荐网络高亮光环与自我标记 (GitHub Issue #20) */}
                  {sub.is_friend && (
                    <circle
                      cx={proj.x}
                      cy={proj.y}
                      r={planetR * 1.6}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}
                  {sub.is_self && (
                    <circle
                      cx={proj.x}
                      cy={proj.y}
                      r={planetR * 1.8}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                  )}

                  {/* 高选/当前受测者行星导航环 */}
                  {(isHovered || sub.is_current) && (
                    <circle
                      cx={proj.x}
                      cy={proj.y}
                      r={planetR * 2.2}
                      fill="none"
                      stroke={sub.is_current ? "#f59e0b" : "#ffffff"}
                      strokeWidth="1.5"
                      className={sub.is_current ? "animate-ping" : ""}
                    />
                  )}

                  {/* 高杠杆土星环光带 (IVE >= 0.70) */}
                  {isHighLeverage && (
                    <ellipse
                      cx={proj.x}
                      cy={proj.y}
                      rx={planetR * 2.1}
                      ry={planetR * 0.7}
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.75)"
                      strokeWidth="1.2"
                      transform={`rotate(-18, ${proj.x}, ${proj.y})`}
                    />
                  )}

                  {/* 3D 立体行星球体 / 好友社交头像 */}
                  {sub.is_friend && sub.avatar_url ? (
                    <g>
                      <clipPath id={`galaxy-avatar-clip-${sub.id}`}>
                        <circle cx={proj.x} cy={proj.y} r={planetR * 1.05} />
                      </clipPath>
                      <circle
                        cx={proj.x}
                        cy={proj.y}
                        r={planetR * 1.15}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={0.8}
                      />
                      <image
                        href={sub.avatar_url}
                        x={proj.x - planetR * 1.05}
                        y={proj.y - planetR * 1.05}
                        width={planetR * 2.1}
                        height={planetR * 2.1}
                        clipPath={`url(#galaxy-avatar-clip-${sub.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  ) : (
                    <>
                      <circle
                        cx={proj.x}
                        cy={proj.y}
                        r={planetR}
                        fill={planetGrad}
                        stroke={sub.is_friend ? "#10b981" : "rgba(255, 255, 255, 0.4)"}
                        strokeWidth={sub.is_friend ? 1.5 : 0.8}
                      />
                      {/* 行星高光微反射点 */}
                      <circle
                        cx={proj.x - planetR * 0.32}
                        cy={proj.y - planetR * 0.32}
                        r={planetR * 0.24}
                        fill="#ffffff"
                        opacity={0.85}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>
          {/* ============================================================== */}
          {/* G. 通用受测者悬浮预览卡片 (与其它视图完全统一规范)            */}
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
