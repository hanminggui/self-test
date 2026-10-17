import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Sliders, Pause, Play, Compass, ExternalLink } from "lucide-react";
import {
  SubjectPoint,
  OCTANT_SECTOR_CONFIGS,
  OCTANT_DETAILED_INFO,
  AXIS_DETAILED_INFO,
  AxisDetailInfo,
  computeMultivariateColor,
} from "./Admin";

interface CosmicGalaxyCompassProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
}

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
const GALACTIC_STARDUST = Array.from({ length: 140 }).map((_, i) => {
  const seed1 = Math.sin(i * 127.31) * 10000;
  const seed2 = Math.cos(i * 311.83) * 10000;
  const seed3 = Math.sin(i * 571.19) * 10000;

  const r1 = Math.abs(seed1 - Math.floor(seed1));
  const r2 = Math.abs(seed2 - Math.floor(seed2));
  const r3 = Math.abs(seed3 - Math.floor(seed3));

  // 极径分布：偏向核心外缘与吸积盘 (R: 56 ~ 246)
  const radius = 56 + Math.pow(r1, 1.35) * 190;
  const angle = r2 * 360;

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
 * 3D 斜上方 45 度透视投影数学引擎
 * 将极坐标 (r, angleDeg) 经过盘面自转 rotation 投影到 45° 斜视摄像机屏幕坐标
 */
function project3D(
  r: number,
  angleDeg: number,
  rotation: number,
  cx: number = 440,
  cy: number = 280,
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
 * 4D 认知流形全息星系组件 (Cosmic Manifold Galaxy)
 * - 最外侧无边界星空展示
 * - 斜上方 45 度视角查看
 * - 近大远小透视缩放
 * - 每个人为一颗 3D 球体行星 (高杠杆配备土星光环)
 * - 4 条主轴无色实线，跳过中央真空区
 * - 外侧刻度展示数字，再外侧展示轴线简单名称
 * - 鼠标悬浮展示画像与轴线明细卡片
 * - 原生 60fps 动能手势引擎，兼容鼠标拖拽与触控板双指滑动
 */
export default function CosmicGalaxyCompass({
  subjects,
  onOpenReport,
  octantStatsMap,
}: CosmicGalaxyCompassProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 动画与手势状态 (使用轻量 React State 驱动 3D 投影帧更新)
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(true);

  // 悬浮状态
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [hoveredOctant, setHoveredOctant] = useState<string | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<AxisDetailInfo | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  // 动能物理引擎 Ref
  const rotationRef = useRef(0);
  const angularVelocityRef = useRef(0.04);
  const isInteractingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const wheelTimeoutRef = useRef<number | null>(null);

  // 物理惯性动能循环 (RAF)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      const isPausedByHover = Boolean(hoveredSubject || hoveredOctant || hoveredAxis);

      if (!isInteractingRef.current && isRotating && !isPausedByHover) {
        if (Math.abs(angularVelocityRef.current) > 0.05) {
          angularVelocityRef.current *= 0.94; // 惯性阻尼
        } else {
          angularVelocityRef.current = 0.04 * Math.sign(angularVelocityRef.current || 1); // 匀速巡航
        }

        rotationRef.current = (rotationRef.current + angularVelocityRef.current + 360) % 360;
        setRotation(rotationRef.current);
      }

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [isRotating, hoveredSubject, hoveredOctant, hoveredAxis]);

  // 原生触控板双指手势 (wheel) 监听：横滑或纵滑平滑旋转
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // 阻止页面滚动
      const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const angleDelta = dominantDelta * 0.28;

      rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
      setRotation(rotationRef.current);

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

  // 鼠标原生拖拽拨盘
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

      rotationRef.current = (rotationRef.current + angleDelta + 360) % 360;
      setRotation(rotationRef.current);
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

  // 计算当前帧所有星球的 3D 屏幕投影并按深度排序 (Z-Sort: 远的先画，近的后画)
  const projectedPlanets = useMemo(() => {
    const list = subjectPolars.map(({ sub, polar }) => {
      const proj = project3D(polar.r, polar.deg, rotation, 440, 280, 45, 680);
      const isHovered = hoveredSubject?.id === sub.id;
      const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

      // 近大远小：基础半径 4.8px，随透视 scale 缩放
      const baseR = isHovered ? 7.5 : 5.0;
      const screenR = baseR * proj.scale;
      // 深度光泽透明度
      const opacity = Math.min(1.0, Math.max(0.4, 0.45 + (proj.depth + 180) / 360));

      return {
        sub,
        proj,
        screenR,
        opacity,
        isHovered,
        colorToken,
      };
    });

    // 深度排序：depth 小的在远处，先渲染；depth 大的在近处，后渲染
    return list.sort((a, b) => a.proj.depth - b.proj.depth);
  }, [subjectPolars, rotation, hoveredSubject]);

  // 计算当前帧银河吸积盘微星尘的 3D 投影坐标 (随星盘自转，产生真实银河微星尘流光)
  const projectedStardust = useMemo(() => {
    return GALACTIC_STARDUST.map((star) => {
      const proj = project3D(star.r, star.deg, rotation, 440, 280, 45, 680);
      return {
        ...star,
        proj,
        screenR: Math.max(0.4, star.baseR * proj.scale),
        opacity: Math.min(1.0, Math.max(0.18, star.baseOpacity * proj.scale * 0.9)),
      };
    });
  }, [rotation]);

  // 生成同心透视椭圆路径 (采样 36 个点平滑连线)
  const getPerspectiveEllipsePath = (r: number) => {
    const points: string[] = [];
    for (let i = 0; i <= 36; i++) {
      const deg = (i / 36) * 360;
      const p = project3D(r, deg, 0, 440, 280, 45, 680);
      points.push(`${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    return points.join(" ") + " Z";
  };

  return (
    <div className="relative w-full overflow-hidden select-none py-2">
      {/* 顶部自转控制与状态微条 */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 pb-2 px-2 border-b border-white/5 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px] sm:text-xs">
            {hoveredOctant
              ? `【${OCTANT_SECTOR_CONFIGS[hoveredOctant]?.name}】: ${OCTANT_SECTOR_CONFIGS[hoveredOctant]?.desc}`
              : hoveredAxis
              ? `【${hoveredAxis.shortName}】: ${hoveredAxis.dimension}`
              : "斜上方 45° 星系全景 · 每个受测者为一颗认知星球 · 支持触控板双指/鼠标平滑转盘"}
          </span>
        </div>

        <button
          onClick={() => setIsRotating(!isRotating)}
          className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/10 hover:border-white/20 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer backdrop-blur"
          title={isRotating ? "点击暂停星系自转" : "点击启动星系自转"}
        >
          {isRotating ? (
            <>
              <Pause className="w-3 h-3 text-amber-400" />
              <span>自转巡航中</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-emerald-400" />
              <span>星系已定格</span>
            </>
          )}
        </button>
      </div>

      {/* 无边界深空视口容器 (彻底去除生硬矩形边框与淡光底色) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative w-full aspect-[880/560] max-h-[700px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        style={{
          background: "transparent",
        }}
        title="支持触控板双指滑动旋转，或按住鼠标左键手势拨动星系"
      >
        <svg viewBox="0 0 880 560" className="w-full h-full overflow-visible pointer-events-auto">
          <defs>
            {/* 1. 恒星引力核心光晕 */}
            <radialGradient id="galactic-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#090a0f" stopOpacity="0" />
            </radialGradient>

            {/* 2. 宇宙射线高能模糊滤镜 (打造模糊发光的宇宙射线光晕与光束) */}
            <filter id="cosmic-ray-blur-wide" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4.0" />
            </filter>
            <filter id="cosmic-ray-blur-mid" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" />
            </filter>

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
          {/* C. 4 条主轴线 (宇宙射线样式：带模糊色彩光晕，跳过中央真空区)     */}
          {/* ============================================================== */}
          <g className="select-none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              // 起点位于中央真空区边缘 R=52，终点延伸至 R=250
              const pInner = project3D(52, deg, rotation, 440, 280, 45, 680);
              const pOuter = project3D(250, deg, rotation, 440, 280, 45, 680);

              const axisInfo = AXIS_DETAILED_INFO[deg];
              // 刻度数值位置 (紧贴射线外端 R=258)
              const pNum = project3D(258, deg, rotation, 440, 280, 45, 680);
              // 轴线简单名称位置 (再外侧 R=298，留出 40px 间距，绝不挤撞)
              const pName = project3D(298, deg, rotation, 440, 280, 45, 680);

              // 动态生成沿当前射线方向的能量渐变 ID
              const gradIdGlow = `cosmic-ray-glow-${deg}`;
              const gradIdCore = `cosmic-ray-core-${deg}`;

              return (
                <g key={`galaxy-axis-${deg}`}>
                  <defs>
                    {/* 射线外层弥散光晕渐变 (天青 -> 苍紫 -> 散逸) */}
                    <linearGradient
                      id={gradIdGlow}
                      x1={pInner.x}
                      y1={pInner.y}
                      x2={pOuter.x}
                      y2={pOuter.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                      <stop offset="35%" stopColor="#818cf8" stopOpacity="0.70" />
                      <stop offset="70%" stopColor="#a855f7" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                    </linearGradient>

                    {/* 射线中层高能聚焦束渐变 (白炽核 -> 高能青紫 -> 柔和边缘) */}
                    <linearGradient
                      id={gradIdCore}
                      x1={pInner.x}
                      y1={pInner.y}
                      x2={pOuter.x}
                      y2={pOuter.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="25%" stopColor="#67e8f9" stopOpacity="0.85" />
                      <stop offset="65%" stopColor="#818cf8" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* 1. 外层宽幅模糊彩色射线晕 (比较模糊的宇宙射线彩色光芒) */}
                  <line
                    x1={pInner.x}
                    y1={pInner.y}
                    x2={pOuter.x}
                    y2={pOuter.y}
                    stroke={`url(#${gradIdGlow})`}
                    strokeWidth={8 * pInner.scale}
                    strokeLinecap="round"
                    filter="url(#cosmic-ray-blur-wide)"
                    opacity={0.7}
                  />

                  {/* 2. 中层粒子束流彩色模糊光线 */}
                  <line
                    x1={pInner.x}
                    y1={pInner.y}
                    x2={pOuter.x}
                    y2={pOuter.y}
                    stroke={`url(#${gradIdCore})`}
                    strokeWidth={3 * pInner.scale}
                    strokeLinecap="round"
                    filter="url(#cosmic-ray-blur-mid)"
                    opacity={0.85}
                  />

                  {/* 3. 内层高能白炽粒子中心流 */}
                  <line
                    x1={pInner.x}
                    y1={pInner.y}
                    x2={pOuter.x}
                    y2={pOuter.y}
                    stroke="rgba(255, 255, 255, 0.85)"
                    strokeWidth={1.0 * pInner.scale}
                    strokeLinecap="round"
                    opacity={0.75}
                  />

                  {/* 射线末端微光能量节点 */}
                  <circle
                    cx={pOuter.x}
                    cy={pOuter.y}
                    r={2.2 * pOuter.scale}
                    fill="#38bdf8"
                    opacity={0.7}
                    filter="url(#cosmic-ray-blur-mid)"
                  />
                  <circle
                    cx={pOuter.x}
                    cy={pOuter.y}
                    r={1.0 * pOuter.scale}
                    fill="#ffffff"
                    opacity={0.9}
                  />

                  {/* 最外侧刻度展示纯数字 (随透视近大远小) */}
                  <g transform={`translate(${pNum.x.toFixed(1)}, ${pNum.y.toFixed(1)})`}>
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize={Math.max(7.5, 9 * pNum.scale)}
                      fontFamily="monospace"
                      fontWeight="bold"
                      letterSpacing="0.3"
                      opacity={Math.min(1, Math.max(0.4, pNum.scale * 0.8))}
                    >
                      {axisInfo.value}
                    </text>
                  </g>

                  {/* 再外侧展示轴线简单名称 (支持指针悬浮展示明细) */}
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
                    <rect
                      x={-30 * pName.scale}
                      y={-8.5 * pName.scale}
                      width={60 * pName.scale}
                      height={17 * pName.scale}
                      rx={8.5 * pName.scale}
                      fill="rgba(15, 23, 42, 0.92)"
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="0.8"
                      pointerEvents="all"
                    />
                    <text
                      x="0"
                      y={3.2 * pName.scale}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={Math.max(8, 9.5 * pName.scale)}
                      fontWeight="bold"
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
          {/* D. 8 个相室画像名称 (仅展示名称，彻底移除数量统计)            */}
          {/* ============================================================== */}
          <g className="select-none">
            {Object.values(OCTANT_SECTOR_CONFIGS).map((conf) => {
              // 位于各相室中心角，半径 R=296 与轴线名称交替错开 22.5°
              const pOctant = project3D(296, conf.centerAngle, rotation, 440, 280, 45, 680);

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
                  }}
                  onMouseLeave={() => {
                    setHoveredOctant(null);
                  }}
                >
                  {/* 画像胶囊底框 */}
                  <rect
                    x={-36 * pOctant.scale}
                    y={-9.5 * pOctant.scale}
                    width={72 * pOctant.scale}
                    height={19 * pOctant.scale}
                    rx={9.5 * pOctant.scale}
                    fill="rgba(15, 23, 42, 0.94)"
                    stroke="rgba(255, 255, 255, 0.22)"
                    strokeWidth="0.9"
                    pointerEvents="all"
                  />
                  {/* 仅展示画像名称 */}
                  <text
                    x="0"
                    y={3.5 * pOctant.scale}
                    textAnchor="middle"
                    fill={conf.primaryColor}
                    fontSize={Math.max(8.5, 10.5 * pOctant.scale)}
                    fontWeight="bold"
                    letterSpacing="0.5"
                    pointerEvents="none"
                  >
                    {conf.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ============================================================== */}
          {/* E. 中央真空平衡带与恒星相变奇点                               */}
          {/* ============================================================== */}
          <g className="pointer-events-none select-none">
            {/* 中央真空区 R=52 (椭圆护盾边界) */}
            <path
              d={getPerspectiveEllipsePath(52)}
              fill="rgba(2, 6, 23, 0.6)"
              stroke="rgba(148, 163, 184, 0.28)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* 核心相变白星引力源 */}
            <circle cx="440" cy="280" r="16" fill="url(#galactic-core-glow)" />
            <circle cx="440" cy="280" r="3" fill="#ffffff" className="animate-pulse" />
          </g>

          {/* ============================================================== */}
          {/* F. 受测者 3D 星球渲染 (近大远小、立体球体渐变、土星环、Z-Sort)  */}
          {/* ============================================================== */}
          <g>
            {projectedPlanets.map(({ sub, proj, screenR, opacity, isHovered }) => {
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

                  {/* 高选/当前受测者行星导航环 */}
                  {(isHovered || sub.is_current) && (
                    <circle
                      cx={proj.x}
                      cy={proj.y}
                      r={screenR * 2.2}
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
                      rx={screenR * 2.1}
                      ry={screenR * 0.7}
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.75)"
                      strokeWidth="1.2"
                      transform={`rotate(-18, ${proj.x}, ${proj.y})`}
                    />
                  )}

                  {/* 3D 立体行星球体 */}
                  <circle
                    cx={proj.x}
                    cy={proj.y}
                    r={screenR}
                    fill={planetGrad}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth={0.8}
                  />

                  {/* 行星高光微反射点 */}
                  <circle
                    cx={proj.x - screenR * 0.32}
                    cy={proj.y - screenR * 0.32}
                    r={screenR * 0.24}
                    fill="#ffffff"
                    opacity={0.85}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* ============================================================== */}
        {/* Tooltip 1: 星球悬浮卡片 (4D 坐标、临床真值、点击调阅报告)      */}
        {/* ============================================================== */}
        {hoveredSubject && anchorPos && (
          <div
            className="galaxy-tooltip absolute pointer-events-auto glass-panel rounded-2xl p-4 border border-indigo-500/50 text-xs shadow-2xl z-50 space-y-2.5 w-72 md:w-80 backdrop-blur-xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              ...(anchorPos.x > 440
                ? { right: `calc(${100 - (anchorPos.x / 880) * 100}% + 14px)` }
                : { left: `calc(${(anchorPos.x / 880) * 100}% + 14px)` }),
              ...(anchorPos.y > 280
                ? { bottom: `calc(${100 - (anchorPos.y / 560) * 100}% + 14px)` }
                : { top: `calc(${(anchorPos.y / 560) * 100}% + 14px)` }),
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

            {/* 4D 坐标数值 */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block text-[10px]">相变突破度 D*</span>
                <span className="font-mono text-cyan-300 font-bold">{(hoveredSubject.d_star ?? 0.5).toFixed(3)}</span>
                <span className="text-[9px] ml-1 text-slate-500">
                  {(hoveredSubject.d_star ?? 0.5) >= 0.6 ? "≥0.6 拓扑" : "<0.6 基底"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">元认知 M_ratio</span>
                <span className="font-mono text-purple-300 font-bold">{hoveredSubject.m_ratio}</span>
                <span className="text-[9px] ml-1 text-slate-500">
                  {hoveredSubject.m_ratio >= 0.8 ? "≥0.8 自洽" : "<0.8 衰减"}
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
                  {(hoveredSubject.ive ?? 0.5) >= 0.7 ? "高杠杆" : "自力"}
                </span>
              </div>
            </div>

            {/* 临床真值简评 */}
            {hoveredSubject.clinical_summary && (
              <div className="text-[10px] text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5 leading-relaxed">
                <span className="text-amber-400 font-semibold mr-1">[临床真值]</span>
                {hoveredSubject.clinical_summary}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
              <span>最终得分: <strong className="text-yellow-400 font-mono text-xs">{hoveredSubject.final_score}</strong></span>
            </div>

            <button
              onClick={() => onOpenReport(hoveredSubject.id)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center justify-between cursor-pointer transition-all shadow-md hover:shadow-indigo-500/20"
            >
              <span>调阅该受测者画像报告</span>
              <span>打开预览 →</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tooltip 2: 画像明细卡片 (核心定义、特征、分级体系、群体统计)   */}
        {/* ============================================================== */}
        {hoveredOctant && OCTANT_DETAILED_INFO[hoveredOctant] && anchorPos && (
          <div
            className="galaxy-tooltip absolute pointer-events-auto glass-panel rounded-2xl p-4 border border-cyan-500/50 text-xs shadow-2xl z-50 space-y-3 w-80 md:w-96 backdrop-blur-xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              ...(anchorPos.x > 440
                ? { right: `calc(${100 - (anchorPos.x / 880) * 100}% + 14px)` }
                : { left: `calc(${(anchorPos.x / 880) * 100}% + 14px)` }),
              ...(anchorPos.y > 280
                ? { bottom: `calc(${100 - (anchorPos.y / 560) * 100}% + 14px)` }
                : { top: `calc(${(anchorPos.y / 560) * 100}% + 14px)` }),
            }}
          >
            {/* 头部标题与所属相区 */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: OCTANT_SECTOR_CONFIGS[hoveredOctant].primaryColor }}
                />
                <span className="font-bold text-white text-sm">
                  【{OCTANT_DETAILED_INFO[hoveredOctant].name}】
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                  {hoveredOctant}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {OCTANT_SECTOR_CONFIGS[hoveredOctant].quadrantName}
              </span>
            </div>

            {/* 群体统计数据条 */}
            {octantStatsMap[hoveredOctant] && (
              <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-white/5 text-center">
                <div>
                  <div className="text-[9px] text-slate-400">参测人数</div>
                  <div className="text-xs font-bold font-mono text-white">
                    {octantStatsMap[hoveredOctant].count} 人
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">群体占比</div>
                  <div className="text-xs font-bold font-mono text-cyan-400">
                    {octantStatsMap[hoveredOctant].percentage}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">平均 D*</div>
                  <div className="text-xs font-bold font-mono text-amber-400">
                    {octantStatsMap[hoveredOctant].avgDStar}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">平均 M_ratio</div>
                  <div className="text-xs font-bold font-mono text-purple-400">
                    {octantStatsMap[hoveredOctant].avgMRatio}
                  </div>
                </div>
              </div>
            )}

            {/* 画像认知流形定义 */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> 画像核心定义
              </div>
              <div className="text-[11px] text-slate-200 bg-white/[0.03] p-2 rounded-lg border border-white/5 leading-relaxed">
                {OCTANT_DETAILED_INFO[hoveredOctant].definition}
              </div>
            </div>

            {/* 核心相变特征 */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                相空间指标特征
              </div>
              <div className="text-[10px] text-slate-300 font-mono bg-slate-900/60 p-2 rounded-lg border border-white/5 leading-relaxed">
                {OCTANT_DETAILED_INFO[hoveredOctant].features}
              </div>
            </div>

            {/* 流形分级体系 */}
            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                流形能级分阶
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="text-amber-300 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">
                  {OCTANT_DETAILED_INFO[hoveredOctant].tiers.awakened}
                </div>
                <div className="text-cyan-300 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/20">
                  {OCTANT_DETAILED_INFO[hoveredOctant].tiers.core}
                </div>
                <div className="text-slate-400 bg-slate-900/40 px-2 py-0.5 rounded border border-white/5">
                  {OCTANT_DETAILED_INFO[hoveredOctant].tiers.passive}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Tooltip 3: 轴线明细卡片 (维度定义、行为特征、相变临界基准)     */}
        {/* ============================================================== */}
        {hoveredAxis && anchorPos && (
          <div
            className="galaxy-tooltip absolute pointer-events-auto glass-panel rounded-2xl p-4 border border-purple-500/50 text-xs shadow-2xl z-50 space-y-3 w-80 md:w-96 backdrop-blur-xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              ...(anchorPos.x > 440
                ? { right: `calc(${100 - (anchorPos.x / 880) * 100}% + 14px)` }
                : { left: `calc(${(anchorPos.x / 880) * 100}% + 14px)` }),
              ...(anchorPos.y > 280
                ? { bottom: `calc(${100 - (anchorPos.y / 560) * 100}% + 14px)` }
                : { top: `calc(${(anchorPos.y / 560) * 100}% + 14px)` }),
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  【{hoveredAxis.shortName}】
                  <span className="text-xs font-mono text-purple-300">刻度 {hoveredAxis.value}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{hoveredAxis.axisName}</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                {hoveredAxis.deg}° 端点
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block">认知测量维度</span>
              <span className="text-xs font-mono font-bold text-slate-200">{hoveredAxis.dimension}</span>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3 h-3 text-purple-400" /> 指标测量定义
              </div>
              <div className="text-[11px] text-slate-200 bg-white/[0.03] p-2 rounded-lg border border-white/5 leading-relaxed">
                {hoveredAxis.definition}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                认知流形行为特征
              </div>
              <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-white/5 leading-relaxed">
                {hoveredAxis.features}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">相变临界基准</span>
              <span className="font-mono text-indigo-300 font-semibold">{hoveredAxis.thresholdNote}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
