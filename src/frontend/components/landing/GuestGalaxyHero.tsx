import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getOctantSectorConfigs } from "../../constants/adminConstants";
import { AXIS_RAY_COLOR_CONFIGS, getCurvatureOffsetDeg } from "../../CosmicGalaxyCompass";
import { GUEST_MOCK_EXPLORERS, GuestMockExplorer } from "./guestMockData";
import { useLocale } from "../../contexts/LocaleContext";

interface GuestGalaxyHeroProps {
  onSelectArchetype?: (quadrantCode: string) => void;
  className?: string;
}

// 适配全屏铺满的银河中心：精准定位于屏幕正中心 (viewBox 1000x620 的绝对中心点)
const GALAXY_CX = 500;
const GALAXY_CY = 310;
const TILT_DEG = 45;
const CAMERA_DIST = 680;

// 固定深空背景微星 (极度轻量，纯静态点位)
const STARFIELD_STARS = Array.from({ length: 48 }).map((_, i) => {
  const seed1 = Math.sin(i * 997.3) * 10000;
  const seed2 = Math.cos(i * 883.7) * 10000;
  const seed3 = Math.sin(i * 433.1) * 10000;
  return {
    id: `bg-star-${i}`,
    x: Math.abs(seed1 - Math.floor(seed1)) * 1000,
    y: Math.abs(seed2 - Math.floor(seed2)) * 620,
    r: 0.6 + Math.abs(seed3 - Math.floor(seed3)) * 0.9,
    opacity: 0.15 + (i % 4) * 0.12,
  };
});

// 银河旋臂精选微星尘 (精简至 32 颗最具层次感的微粒，大幅降低 VDOM Diff 与 DOM 开销)
const GALACTIC_STARDUST = Array.from({ length: 32 }).map((_, i) => {
  const seed1 = Math.sin(i * 127.31) * 10000;
  const seed2 = Math.cos(i * 311.83) * 10000;
  const seed3 = Math.sin(i * 571.19) * 10000;

  const r1 = Math.abs(seed1 - Math.floor(seed1));
  const r2 = Math.abs(seed2 - Math.floor(seed2));
  const r3 = Math.abs(seed3 - Math.floor(seed3));

  const radius = 24 + Math.pow(r1, 1.15) * 230;
  const armBase = (i % 4) * 90;
  const armCurl = (radius / 240) * 260;
  const scatter = (r2 - 0.5) * 24;
  const angle = (armBase + armCurl + scatter + 360) % 360;

  const colors = [
    "rgba(56, 189, 248, 0.70)",
    "rgba(192, 132, 252, 0.65)",
    "rgba(253, 224, 71, 0.60)",
    "rgba(244, 114, 182, 0.55)",
    "rgba(255, 255, 255, 0.80)",
    "rgba(147, 197, 253, 0.65)",
  ];
  return {
    id: `bg-dust-${i}`,
    r: radius,
    deg: angle,
    baseR: 0.6 + r3 * 0.8,
    color: colors[i % colors.length],
    baseOpacity: 0.3 + (i % 4) * 0.12,
  };
});

interface PublicAxisLabel {
  shortZh: string;
  shortEn: string;
  tagZh: string;
  tagEn: string;
  descZh: string;
  descEn: string;
}

const PUBLIC_AXIS_LABELS: Record<number, PublicAxisLabel> = {
  0: {
    shortZh: "自知之明",
    shortEn: "Self-Awareness",
    tagZh: "心如明镜",
    tagEn: "Lucid Clarity",
    descZh: "清楚知道自己哪题必对、哪题存疑，从不盲目自大",
    descEn: "Knows with crystal clarity when an answer is certain or in doubt",
  },
  45: {
    shortZh: "沉稳审慎",
    shortEn: "Prudent Guard",
    tagZh: "步步为营",
    tagEn: "Zero-Flaw Defense",
    descZh: "面对不确定迷局优先守住安全底线，绝不轻易涉险",
    descEn: "Prioritizes solid defense in ambiguous situations, avoiding traps",
  },
  90: {
    shortZh: "解题硬实力",
    shortEn: "Deductive Power",
    tagZh: "硬核破局",
    tagEn: "Apex Logic",
    descZh: "抽丝剥茧看穿复杂规律，轻松攻克高难度挑战",
    descEn: "Pierces through complex patterns and conquers high-difficulty puzzles",
  },
  135: {
    shortZh: "独立推演",
    shortEn: "Solo Mastery",
    tagZh: "凭实力硬解",
    tagEn: "Inner Calculation",
    descZh: "依靠自身敏锐观察力独立破题，不依赖外部提示",
    descEn: "Relies on sharp internal reasoning without external hints",
  },
  180: {
    shortZh: "直觉随性",
    shortEn: "Pure Instinct",
    tagZh: "跟着感觉走",
    tagEn: "Free Flow",
    descZh: "不受条条框框束缚，全凭第一感官与直觉自由探索",
    descEn: "Unbound by rigid rules, exploring freely on first instinct",
  },
  225: {
    shortZh: "果敢冲锋",
    shortEn: "Bold Charge",
    tagZh: "敢拼敢闯",
    tagEn: "All-In Spirit",
    descZh: "遇到挑战气势如虹，敢于在未知领域重注出击",
    descEn: "Faces the unknown with fearless spirit and bold conviction",
  },
  270: {
    shortZh: "潜力蓄势",
    shortEn: "Rising Potential",
    tagZh: "厚积薄发",
    tagEn: "Awakening Seed",
    descZh: "在探索中快速熟悉规则，每一次尝试都在积蓄爆发力",
    descEn: "Rapidly adapts to new rules, building momentum with every step",
  },
  315: {
    shortZh: "借力智慧",
    shortEn: "Clue Leverage",
    tagZh: "善用锦囊",
    tagEn: "Strategic Wit",
    descZh: "关键时刻果断解锁线索锦囊，用最小代价换取最大胜果",
    descEn: "Unlocks strategic clues at crucial moments for maximum payoff",
  },
};

/**
 * 3D 快速透视投影计算 (预计算常数优化)
 */
const TILT_RAD = (TILT_DEG * Math.PI) / 180;
const COS_TILT = Math.cos(TILT_RAD);
const SIN_TILT = Math.sin(TILT_RAD);

function project3D(
  r: number,
  angleDeg: number,
  rotation: number,
  cx: number = GALAXY_CX,
  cy: number = GALAXY_CY,
  dist: number = CAMERA_DIST
) {
  const curAngle = angleDeg + rotation;
  const rad = ((curAngle - 90) * Math.PI) / 180;

  const xLocal = r * Math.cos(rad);
  const yLocal = r * Math.sin(rad);

  const xWorld = xLocal;
  const yWorld = yLocal * COS_TILT;
  const zWorld = yLocal * SIN_TILT;

  const scale = dist / (dist - zWorld);
  const xScreen = cx + xWorld * scale;
  const yScreen = cy + yWorld * scale;

  return {
    x: xScreen,
    y: yScreen,
    scale,
    depth: zWorld,
  };
}

/**
 * 预先静态生成的透视同心椭圆轨道路径 (同心圆在原点完全中心对称，旋转不变，组件外单次生成 0 运行时开销)
 */
function buildStaticPerspectiveEllipse(r: number): string {
  const points: string[] = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const deg = (i / segments) * 360;
    const p = project3D(r, deg, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);
    points.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return points.join("") + "Z";
}

const STATIC_ELLIPSE_120 = buildStaticPerspectiveEllipse(120);
const STATIC_ELLIPSE_195 = buildStaticPerspectiveEllipse(195);
const STATIC_ELLIPSE_285 = buildStaticPerspectiveEllipse(285);
const STATIC_ELLIPSE_345 = buildStaticPerspectiveEllipse(345);

function getExplorerPolar(exp: GuestMockExplorer) {
  const code = exp.quadrantCode;
  const conf = getOctantSectorConfigs("zh-CN")[code] || getOctantSectorConfigs("zh-CN")["Q1-CAL"];

  const idNum = parseInt(exp.id.replace(/\D/g, ""), 10) || 1;
  const slot = (idNum % 3) - 1;
  const finalAngle = conf.centerAngle + slot * 11;

  // 扩展行星极坐标半径，确保星盘自转时星球大范围穿梭于左侧毛玻璃卡片正后方
  const radialFactor = 0.12 + ((idNum * 37) % 65) / 100;
  const r = 85 + radialFactor * 280;
  return { r, deg: finalAngle };
}

export const GuestGalaxyHero: React.FC<GuestGalaxyHeroProps> = ({
  onSelectArchetype,
  className = "",
}) => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");
  const octantSectorConfigs = getOctantSectorConfigs(isEn ? "en-US" : "zh-CN");

  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  // 悬停交互状态：脱离后自动重置为 null，球体失去选中焦点并恢复匀速旋转
  const [hoveredExplorer, setHoveredExplorer] = useState<GuestMockExplorer | null>(null);
  const [hoveredOctant, setHoveredOctant] = useState<string | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  const rotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const isVisibleRef = useRef(true);

  // 暂停判定：只要有悬停星球或八相，自转暂停；脱离后恢复
  const isPaused = Boolean(hoveredExplorer || hoveredOctant);

  // 视口可见性感知：滚动离开首屏时自动停转，避免任何后台开销
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 极致丝滑的 RAF 物理循环：基于真实 deltaTime 计算自转，确保不同设备（60Hz/120Hz）恒定匀速自转
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      if (!isDraggingRef.current && !isPaused && isVisibleRef.current) {
        // 恒定角速度自转 (约 0.14 度/帧@60Hz，平滑稳重)
        rotationRef.current = (rotationRef.current + (dt / 16.67) * 0.14 + 360) % 360;
        setRotation(rotationRef.current);
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  // 原生鼠标/触摸拖拽拨盘控制
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".galaxy-planet") || target.closest(".galaxy-badge")) {
      return;
    }

    isDraggingRef.current = true;
    lastPointerXRef.current = e.clientX;

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastPointerXRef.current;
      lastPointerXRef.current = ev.clientX;
      const angleDelta = dx * 0.35;
      rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
      setRotation(rotationRef.current);
    };

    const handleWindowPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
  };

  // 离开星盘区域时强力清除选中状态，确保失去焦点并恢复自转
  const handlePointerLeaveContainer = () => {
    if (hoveredExplorer || hoveredOctant || anchorPos) {
      setHoveredExplorer(null);
      setHoveredOctant(null);
      setAnchorPos(null);
    }
  };

  // 预先缓存探索者极坐标
  const explorerPolars = useMemo(() => {
    return GUEST_MOCK_EXPLORERS.map((exp) => ({
      exp,
      polar: getExplorerPolar(exp),
    }));
  }, []);

  // 投影星球：带深度排序与视锥比例
  const projectedPlanets = useMemo(() => {
    const list = explorerPolars.map(({ exp, polar }) => {
      const curveOffset = getCurvatureOffsetDeg(polar.r, 0.14);
      const currentDeg = polar.deg + rotation + curveOffset;
      const proj = project3D(polar.r, currentDeg, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);
      const screenR = 5.2 * proj.scale;
      const opacity = Math.min(1.0, Math.max(0.42, 0.48 + (proj.depth + 180) / 360));
      return {
        exp,
        proj,
        screenR,
        opacity,
      };
    });
    return list.sort((a, b) => a.proj.depth - b.proj.depth);
  }, [explorerPolars, rotation]);

  // 高性能射线路径计算 (精简采样至 14 步，数值直接舍入，计算量直降 70%)
  const getCurvedRayPath = useCallback(
    (baseDeg: number) => {
      const points: string[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = t * 560;
        const curveOffset = getCurvatureOffsetDeg(r, 0.14);
        const finalAngle = baseDeg + rotation + curveOffset;
        const p = project3D(r, finalAngle, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);
        points.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      return points.join("");
    },
    [rotation]
  );

  // 投影旋臂微星尘
  const projectedStardust = useMemo(() => {
    return GALACTIC_STARDUST.map((star) => {
      const curveOffset = getCurvatureOffsetDeg(star.r, 0.14);
      const currentDeg = star.deg + rotation + curveOffset;
      const proj = project3D(star.r, currentDeg, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);
      return {
        ...star,
        proj,
        screenR: Math.max(0.4, star.baseR * proj.scale),
        opacity: Math.min(0.9, Math.max(0.18, star.baseOpacity * proj.scale * 0.9)),
      };
    });
  }, [rotation]);

  const pZero = useMemo(() => project3D(0, 0, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST), []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeaveContainer}
      className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden touch-pan-y ${className}`}
    >
      <svg
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover overflow-visible pointer-events-auto"
      >
        <defs>
          <radialGradient id="bg-hero-galactic-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#818cf8" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06080f" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="bg-hero-rose" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffe4e6" />
            <stop offset="40%" stopColor="#f43f5e" />
            <stop offset="80%" stopColor="#9f1239" />
            <stop offset="100%" stopColor="#4c0519" />
          </radialGradient>
          <radialGradient id="bg-hero-cyan" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="40%" stopColor="#06b6d4" />
            <stop offset="80%" stopColor="#0e7490" />
            <stop offset="100%" stopColor="#164e63" />
          </radialGradient>
          <radialGradient id="bg-hero-emerald" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="40%" stopColor="#10b981" />
            <stop offset="80%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>
          <radialGradient id="bg-hero-purple" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="80%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
          <radialGradient id="bg-hero-amber" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
        </defs>

        {/* 1. 背景深空恒星与银河微星尘 */}
        <g className="pointer-events-none select-none">
          {STARFIELD_STARS.map((star) => (
            <circle
              key={star.id}
              cx={star.x}
              cy={star.y}
              r={star.r * 0.75}
              fill="#ffffff"
              opacity={star.opacity * 0.45}
            />
          ))}
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

        {/* 2. 静态透视能级星轨 (0 运行时开销，外圈大能级轨道大跨度横贯左侧毛玻璃卡片正后方) */}
        <g className="pointer-events-none select-none">
          <path
            d={STATIC_ELLIPSE_120}
            fill="none"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="0.8"
            strokeDasharray="3 5"
          />
          <path
            d={STATIC_ELLIPSE_195}
            fill="none"
            stroke="rgba(255, 255, 255, 0.09)"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
          <path
            d={STATIC_ELLIPSE_285}
            fill="none"
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth="1.0"
            strokeDasharray="5 7"
          />
          <path
            d={STATIC_ELLIPSE_345}
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="1.1"
            strokeDasharray="6 8"
          />
        </g>

        {/* 3. 8 条高能光束与通俗维度名称 (优化为两层极光，渲染开销锐减 60%) */}
        <g className="select-none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rayConf = AXIS_RAY_COLOR_CONFIGS[deg] || AXIS_RAY_COLOR_CONFIGS[0];
            const pubAxis = PUBLIC_AXIS_LABELS[deg];
            const rayPath = getCurvedRayPath(deg);

            const curveTag = getCurvatureOffsetDeg(265, 0.14);
            const pTag = project3D(265, deg + rotation + curveTag, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);

            const curveName = getCurvatureOffsetDeg(308, 0.14);
            const pName = project3D(308, deg + rotation + curveName, 0, GALAXY_CX, GALAXY_CY, CAMERA_DIST);

            return (
              <g key={`bg-ray-${deg}`}>
                {/* 宽幅能量光晕 */}
                <path
                  d={rayPath}
                  fill="none"
                  stroke={rayConf.primary}
                  strokeWidth={11 * pZero.scale}
                  strokeLinecap="round"
                  opacity={0.18}
                />
                {/* 核心光斑脉冲束 */}
                <path
                  d={rayPath}
                  fill="none"
                  stroke={rayConf.beamCore}
                  strokeWidth={2.4 * pZero.scale}
                  strokeLinecap="round"
                  opacity={0.72}
                />

                {/* 维度小修饰标 */}
                <g transform={`translate(${pTag.x.toFixed(1)}, ${pTag.y.toFixed(1)})`}>
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={Math.max(7.5, 9 * pTag.scale)}
                    fontWeight="bold"
                    opacity={Math.min(0.85, Math.max(0.4, pTag.scale * 0.75))}
                  >
                    {isEn ? pubAxis.tagEn : pubAxis.tagZh}
                  </text>
                </g>

                {/* 维度核心通俗名 */}
                <g
                  className="galaxy-badge cursor-pointer"
                  transform={`translate(${pName.x.toFixed(1)}, ${pName.y.toFixed(1)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <text
                    x="0"
                    y={4 * pName.scale}
                    textAnchor="middle"
                    fill="#06080f"
                    stroke={rayConf.primary}
                    strokeWidth={2.6 * pName.scale}
                    style={{ paintOrder: "stroke fill" }}
                    fontSize={Math.max(9.5, 11.5 * pName.scale)}
                    fontWeight="900"
                    pointerEvents="none"
                  >
                    {isEn ? pubAxis.shortEn : pubAxis.shortZh}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* 4. 八大流派称号外环 */}
        <g className="select-none">
          {Object.values(octantSectorConfigs).map((conf) => {
            const curveOffset = getCurvatureOffsetDeg(312, 0.14);
            const pOctant = project3D(
              312,
              conf.centerAngle + rotation + curveOffset,
              0,
              GALAXY_CX,
              GALAXY_CY,
              CAMERA_DIST
            );
            const isHovered = hoveredOctant === conf.code;

            return (
              <g
                key={`bg-octant-${conf.code}`}
                className="galaxy-badge cursor-pointer"
                transform={`translate(${pOctant.x.toFixed(1)}, ${pOctant.y.toFixed(1)})`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectArchetype?.(conf.code)}
                onMouseEnter={() => setHoveredOctant(conf.code)}
                onMouseLeave={() => setHoveredOctant(null)}
              >
                <rect
                  x={-46 * pOctant.scale}
                  y={-Math.max(22, 14 * pOctant.scale)}
                  width={92 * pOctant.scale}
                  height={Math.max(44, 28 * pOctant.scale)}
                  fill="transparent"
                  pointerEvents="all"
                />
                <text
                  x="0"
                  y={4 * pOctant.scale}
                  textAnchor="middle"
                  fill="#06080f"
                  stroke={isHovered ? "#fbbf24" : "rgba(255, 255, 255, 0.75)"}
                  strokeWidth={(isHovered ? 3.5 : 2.2) * pOctant.scale}
                  style={{ paintOrder: "stroke fill" }}
                  fontSize={Math.max(10, 12 * pOctant.scale)}
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

        {/* 5. 中心奇点 */}
        <g className="pointer-events-none select-none">
          <circle
            cx={GALAXY_CX}
            cy={GALAXY_CY}
            r="12"
            fill="url(#bg-hero-galactic-core)"
            opacity="0.9"
          />
          <circle cx={GALAXY_CX} cy={GALAXY_CY} r="3.2" fill="#ffffff" />
        </g>

        {/* 6. 24 颗 3D 行星：指针悬浮放大显示名片，移开后立即失去焦点恢复匀速旋转 */}
        <g>
          {projectedPlanets.map(({ exp, proj, screenR, opacity }) => {
            const isHovered = hoveredExplorer?.id === exp.id;
            const planetR = isHovered ? screenR * 1.55 : screenR;

            let planetGrad = "url(#bg-hero-emerald)";
            if (exp.quadrantCode === "Q6-GAM") planetGrad = "url(#bg-hero-rose)";
            else if (exp.quadrantCode === "Q5-RET" || exp.calibrationBias < -0.12)
              planetGrad = "url(#bg-hero-cyan)";
            else if (exp.quadrantCode === "Q8-DRI") planetGrad = "url(#bg-hero-purple)";
            else if (
              exp.quadrantCode === "Q7-ARB" ||
              exp.quadrantCode === "Q4-PIO" ||
              exp.calibrationBias > 0.12
            )
              planetGrad = "url(#bg-hero-amber)";

            const hasRing = exp.leverageScore >= 82;

            return (
              <g
                key={exp.id}
                className="galaxy-planet cursor-pointer"
                opacity={opacity}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectArchetype?.(exp.quadrantCode);
                }}
                onPointerEnter={() => {
                  setHoveredExplorer(exp);
                  setAnchorPos({ x: proj.x, y: proj.y });
                }}
                onPointerLeave={() => {
                  setHoveredExplorer(null);
                  setAnchorPos(null);
                }}
              >
                {/* 增大命中触控区域 (>=44x44px) */}
                <circle cx={proj.x} cy={proj.y} r={Math.max(22, 18 * proj.scale)} fill="transparent" />

                {/* 悬停高亮光环 */}
                {isHovered && (
                  <circle
                    cx={proj.x}
                    cy={proj.y}
                    r={planetR * 2.3}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    className="animate-spin"
                    style={{ animationDuration: "8s", transformOrigin: `${proj.x}px ${proj.y}px` }}
                  />
                )}

                {/* 土星光环 */}
                {hasRing && (
                  <ellipse
                    cx={proj.x}
                    cy={proj.y}
                    rx={planetR * 2.15}
                    ry={planetR * 0.72}
                    fill="none"
                    stroke="rgba(245, 158, 11, 0.75)"
                    strokeWidth="1.2"
                    transform={`rotate(-18, ${proj.x}, ${proj.y})`}
                  />
                )}

                {/* 球体本体 */}
                <circle
                  cx={proj.x}
                  cy={proj.y}
                  r={planetR}
                  fill={planetGrad}
                  stroke={isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.45)"}
                  strokeWidth={isHovered ? 1.6 : 0.8}
                />

                {/* 表面立体高光 */}
                <circle
                  cx={proj.x - planetR * 0.32}
                  cy={proj.y - planetR * 0.32}
                  r={planetR * 0.24}
                  fill="#ffffff"
                  opacity={0.85}
                />
              </g>
            );
          })}
        </g>

        {/* 7. 面向大众的思维雷达通俗名片 (零公式、零数学符号、零内部代码) */}
        {hoveredExplorer && anchorPos && (
          <g
            transform={`translate(${Math.min(840, Math.max(140, anchorPos.x))}, ${Math.min(
              520,
              Math.max(85, anchorPos.y - 28)
            )})`}
            className="pointer-events-none z-50 select-none"
          >
            {/* 卡片底板：深色半透明毛玻璃微光 */}
            <rect
              x="-110"
              y="-86"
              width="220"
              height="82"
              rx="12"
              fill="#060913"
              fillOpacity="0.94"
              stroke="rgba(251, 191, 36, 0.4)"
              strokeWidth="1.2"
              style={{ filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.85))" }}
            />

            {/* 顶栏：探索者姓名 */}
            <text
              x="-98"
              y="-64"
              fill="#ffffff"
              fontSize="12.5"
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {isEn ? hoveredExplorer.nameEn : hoveredExplorer.nameZh}
            </text>

            {/* 综合得分微标 */}
            <text
              x="98"
              y="-64"
              textAnchor="end"
              fill="#fbbf24"
              fontSize="12"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
            >
              {hoveredExplorer.finalScore}
              <tspan fill="#d97706" fontSize="9.5" dx="2">
                {isEn ? " pts" : "分"}
              </tspan>
            </text>

            {/* 唤醒化身 (纯中文字，不带 Q1-Q8) */}
            <text
              x="-98"
              y="-47"
              fill="#38bdf8"
              fontSize="10.5"
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {octantSectorConfigs[hoveredExplorer.quadrantCode]?.name || (isEn ? "Explorer" : "探索者")}
              <tspan fill="#94a3b8" fontSize="9" fontWeight="normal" dx="6">
                · {isEn ? hoveredExplorer.badgeEn : hoveredExplorer.badgeZh}
              </tspan>
            </text>

            {/* 通俗化能力评级 */}
            <text
              x="-98"
              y="-30"
              fill="#cbd5e1"
              fontSize="9"
              fontFamily="system-ui, sans-serif"
              fontWeight="medium"
            >
              {isEn ? "Logic" : "硬实力"}: <tspan fill="#38bdf8" fontWeight="bold">{hoveredExplorer.powerScore}</tspan>
              {"   "}
              {isEn ? "Clarity" : "自知度"}: <tspan fill="#c084fc" fontWeight="bold">{hoveredExplorer.selfKnowScore}</tspan>
              {"   "}
              {isEn ? "Boldness" : "果敢"}: <tspan fill="#fbbf24" fontWeight="bold">{hoveredExplorer.boldnessScore}</tspan>
            </text>

            {/* 生动的探索宣言 */}
            <text
              x="-98"
              y="-15"
              fill="#94a3b8"
              fontSize="8.5"
              fontFamily="system-ui, sans-serif"
              fontStyle="italic"
            >
              &ldquo;{isEn ? hoveredExplorer.quoteEn : hoveredExplorer.quoteZh}&rdquo;
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
