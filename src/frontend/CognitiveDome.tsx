import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SubjectHoverCard from "./components/admin/SubjectHoverCard";
import {
  SubjectPoint,
  OCTANT_SECTOR_CONFIGS,
  computeMultivariateColor,
} from "./Admin";

interface CognitiveDomeProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

const DOME_CX = 440;
const DOME_CY = 310;
const R_DOME = 260;
const PITCH_RAD = (22 * Math.PI) / 180; // 航天黄金仰俯角 22°
const DIST = 950; // 透视视距

const OCTANT_ORDER = [
  "Q1-CAL",
  "Q4-PIO",
  "Q3-SEN",
  "Q5-RET",
  "Q6-GAM",
  "Q8-DRI",
  "Q2-EVO",
  "Q7-ARB",
];

// 8 个象区对应的周易三爻定义 [初爻(上/窄), 二爻(中), 上爻(下/宽)]
const DOME_SECTOR_LINES: Record<string, [boolean, boolean, boolean]> = {
  "Q1-CAL": [true, true, true],   // 乾 ☰
  "Q4-PIO": [true, true, false],  // 兑 ☱
  "Q3-SEN": [true, false, true],  // 离 ☲
  "Q5-RET": [true, false, false], // 震 ☳
  "Q6-GAM": [false, false, false],// 坤 ☷
  "Q8-DRI": [false, false, true], // 艮 ☶
  "Q2-EVO": [false, true, false], // 坎 ☵
  "Q7-ARB": [false, true, true],  // 巽 ☴
};

// 8 条经线分界射线（夹角边界）配置
// 每个扇区 strictly 位于两条相邻边界经线的夹角内部！正中绝无贯穿线！
// 0°~45° (Q1-CAL), 45°~90° (Q4-PIO), 90°~135° (Q3-SEN), 135°~180° (Q5-RET)
// 180°~225° (Q6-GAM), 225°~270° (Q8-DRI), 270°~315° (Q2-EVO), 315°~360° (Q7-ARB)
interface BoundaryRayConfig {
  angle: number;
  primary: string;
  beamCore: string;
}

const BOUNDARY_RAYS: BoundaryRayConfig[] = [
  { angle: 0, primary: "#10b981", beamCore: "#34d399" },    // 0°/360°: 分割 Q7 与 Q1 (自洽主轴，翠绿)
  { angle: 45, primary: "#f59e0b", beamCore: "#fbbf24" },   // 45°: 分割 Q1 与 Q4 (琥珀金)
  { angle: 90, primary: "#38bdf8", beamCore: "#7dd3fc" },   // 90°: 分割 Q4 与 Q3 (突破主轴，天青)
  { angle: 135, primary: "#0d9488", beamCore: "#2dd4bf" },  // 135°: 分割 Q3 与 Q5 (深青)
  { angle: 180, primary: "#f43f5e", beamCore: "#fb7185" },  // 180°: 分割 Q5 与 Q6 (衰减主轴，绯红)
  { angle: 225, primary: "#a855f7", beamCore: "#c084fc" },  // 225°: 分割 Q6 与 Q8 (紫)
  { angle: 270, primary: "#6366f1", beamCore: "#818cf8" },  // 270°: 分割 Q8 与 Q2 (基底主轴，靛蓝)
  { angle: 315, primary: "#eab308", beamCore: "#fde047" },  // 315°: 分割 Q2 与 Q7 (金色)
];

// 固定星空恒星背景
const DOME_STARS = Array.from({ length: 48 }).map((_, i) => {
  const s1 = Math.sin(i * 373.17) * 10000;
  const s2 = Math.cos(i * 591.31) * 10000;
  return {
    id: `dome-star-${i}`,
    x: Math.abs(s1 - Math.floor(s1)) * 880,
    y: Math.abs(s2 - Math.floor(s2)) * 480,
    r: 0.6 + (i % 3) * 0.45,
    opacity: 0.12 + (i % 4) * 0.12,
  };
});

export default function CognitiveDome({
  subjects,
  onOpenReport,
  octantStatsMap,
  onHoverStatusChange,
  onActiveSectorChange,
}: CognitiveDomeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 当前主聚焦点扇区：0 ~ 7 (默认 0 即 Q1-CAL 居中正对视线)
  const [activeSectorIndex, setActiveSectorIndex] = useState<number>(0);
  const [currentRotation, setCurrentRotation] = useState<number>(-22.5); // 初始使 Q1-CAL (22.5°) 旋转到正面 0° 视线
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  // 物理交互与惯性阻尼 ref
  const isInteractingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const targetRotationRef = useRef(-22.5);
  const rotationRef = useRef(-22.5);
  const animFrameIdRef = useRef<number | null>(null);
  const wheelTimeoutRef = useRef<number | null>(null);

  // 通知外部当前聚焦的主扇区
  useEffect(() => {
    const curCode = OCTANT_ORDER[activeSectorIndex];
    if (onActiveSectorChange && curCode) {
      onActiveSectorChange(curCode);
    }
  }, [activeSectorIndex, onActiveSectorChange]);

  // 扇区步进吸附逻辑：切换到指定扇区 (每步 45°)
  const snapToSector = useCallback((newIndex: number) => {
    const safeIndex = ((newIndex % 8) + 8) % 8;
    setActiveSectorIndex(safeIndex);

    const octantCode = OCTANT_ORDER[safeIndex];
    const conf = OCTANT_SECTOR_CONFIGS[octantCode];
    if (conf) {
      // 目标旋转角：使该扇区中心角恰好对准正面 0° 视线中轴
      targetRotationRef.current = -conf.centerAngle;
    }
  }, []);

  // 物理平滑过渡循环 (阻尼弹簧逼近)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      if (!isInteractingRef.current) {
        let diff = targetRotationRef.current - rotationRef.current;
        // 角度环绕最短路径
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        if (Math.abs(diff) > 0.05) {
          const step = diff * (1 - Math.exp(-0.012 * dt));
          rotationRef.current += step;
          setCurrentRotation(rotationRef.current);
        } else if (rotationRef.current !== targetRotationRef.current) {
          rotationRef.current = targetRotationRef.current;
          setCurrentRotation(targetRotationRef.current);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  /**
   * 认知半球天幕核心 3D 透视投影数学模型
   * @param phiDeg 纬度天顶距 (phi: 12°为顶弧极点，86°为底沿赤道 base rim)
   * @param lonDeg 经度角 (0°~360°)
   * @param rOffset 径向偏移
   */
  const projectDome = useCallback(
    (phiDeg: number, lonDeg: number, rOffset: number = 0) => {
      const phi = (phiDeg * Math.PI) / 180;
      let relLon = (lonDeg + currentRotation + 360) % 360;
      if (relLon > 180) relLon -= 360;
      const psi = (relLon * Math.PI) / 180;

      const r = R_DOME + rOffset;
      // 3D 半球坐标：极点朝上，底沿向下展开
      const x3d = r * Math.sin(phi) * Math.sin(psi);
      const y3d = r * Math.cos(phi);
      const z3d = r * Math.sin(phi) * Math.cos(psi);

      // 航天级 Pitch 俯视旋转
      const cosP = Math.cos(PITCH_RAD);
      const sinP = Math.sin(PITCH_RAD);
      const x1 = x3d;
      const y1 = y3d * cosP - z3d * sinP;
      const z1 = y3d * sinP + z3d * cosP;

      // 透视投影
      const scale = DIST / (DIST - z1);
      const xScreen = DOME_CX + x1 * scale;
      const yScreen = DOME_CY - y1 * scale;

      const cosPsi = Math.cos(psi);
      // 正面半球视野判定：cosPsi > -0.05 对应 180° 正面立体画卷
      const isFront = cosPsi > -0.05;

      return {
        x: xScreen,
        y: yScreen,
        scale,
        depth: z1,
        isFront,
        cosPsi,
        relLon,
      };
    },
    [currentRotation]
  );

  // 鼠标原生拖拽控制
  const handlePointerDown = (e: React.PointerEvent) => {
    isInteractingRef.current = true;
    lastPointerXRef.current = e.clientX;

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastPointerXRef.current;
      lastPointerXRef.current = ev.clientX;

      rotationRef.current = (rotationRef.current + dx * 0.45 + 360) % 360;
      setCurrentRotation(rotationRef.current);
    };

    const handleWindowPointerUp = () => {
      isInteractingRef.current = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);

      // 松手瞬间：自动计算最接近的扇区并步进吸附
      const curRot = ((-rotationRef.current % 360) + 360) % 360;
      let closestIdx = 0;
      let minDiff = 999;
      OCTANT_ORDER.forEach((code, idx) => {
        const conf = OCTANT_SECTOR_CONFIGS[code];
        let diff = Math.abs(curRot - conf.centerAngle);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      snapToSector(closestIdx);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  // 触控板滑动监听
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      rotationRef.current = (rotationRef.current - delta * 0.38 + 360) % 360;
      setCurrentRotation(rotationRef.current);
      isInteractingRef.current = true;

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
        const curRot = ((-rotationRef.current % 360) + 360) % 360;
        let closestIdx = 0;
        let minDiff = 999;
        OCTANT_ORDER.forEach((code, idx) => {
          const conf = OCTANT_SECTOR_CONFIGS[code];
          let diff = Math.abs(curRot - conf.centerAngle);
          if (diff > 180) diff = 360 - diff;
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });
        snapToSector(closestIdx);
      }, 150);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [snapToSector]);

  // 半球天幕主背景外轮廓 Path (从左地平线经底沿弧至右地平线，再沿顶弧自然收拢)
  const domeCanopyPath = useMemo(() => {
    const pts: string[] = [];
    // 1. 底沿弧线：从 relLon = -90° 到 +90° (phi = 86°)
    for (let d = -90; d <= 90; d += 6) {
      const p = projectDome(86, d - currentRotation);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    // 2. 右侧地平线向上延伸至顶端弧
    for (let phi = 86; phi >= 12; phi -= 6) {
      const p = projectDome(phi, 90 - currentRotation);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    // 3. 顶端自然收拢弧 (极点干净开阔，不再有巨大突兀圆圈)
    for (let d = 90; d >= -90; d -= 15) {
      const p = projectDome(12, d - currentRotation);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    // 4. 左侧地平线向下收回底沿
    for (let phi = 12; phi <= 86; phi += 6) {
      const p = projectDome(phi, -90 - currentRotation);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return `M ${pts.join(" L ")} Z`;
  }, [projectDome, currentRotation]);

  // 生成扇面曲面感应热区 Path (完全对应两条边界经线所围合的扇面空间)
  const getSectorSurfacePath = useCallback(
    (centerAngle: number) => {
      const startDeg = centerAngle - 22.5; // 左边界经线
      const endDeg = centerAngle + 22.5;   // 右边界经线
      const pts: string[] = [];

      // 1. 底沿弧 (宽广基底)
      for (let d = startDeg; d <= endDeg; d += 4.5) {
        const p = projectDome(86, d);
        pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      // 2. 右边界经线上收
      for (let phi = 86; phi >= 12; phi -= 8) {
        const p = projectDome(phi, endDeg);
        pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      // 3. 顶端窄收弧
      for (let d = endDeg; d >= startDeg; d -= 4.5) {
        const p = projectDome(12, d);
        pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      // 4. 左边界经线下展
      for (let phi = 12; phi <= 86; phi += 8) {
        const p = projectDome(phi, startDeg);
        pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      }
      return `M ${pts.join(" L ")} Z`;
    },
    [projectDome]
  );

  // 计算受测者星辰在认知半球天幕上的落点与投影
  // 严格容纳于所属扇区的两条边界经线夹角内部！
  const projectedStars = useMemo(() => {
    return subjects
      .map((sub) => {
        const code = sub.quadrant_code || "Q1-CAL";
        const conf = OCTANT_SECTOR_CONFIGS[code] || OCTANT_SECTOR_CONFIGS["Q1-CAL"];

        // 经度：所属扇区中心角 + 微抖动 (严格限制在 +- 16° 内，完全位于夹角中，绝不碰触边界线)
        let jitter = 0;
        if (code === "Q6-GAM") jitter = (sub.calibration_bias - 0.25) * 24;
        else if (code === "Q1-CAL") jitter = (((sub.m_ratio ?? 1) - 1) - ((sub.d_star ?? 0.7) - 0.7)) * 14;
        else jitter = (sub.calibration_bias - 0.1) * 18;

        const lon = conf.centerAngle + Math.max(-16, Math.min(16, jitter));

        // 纬度天顶距：高突破/高自洽汇聚于顶端 (phi 24°)，低分/探索散布于底沿 (phi 80°)
        const dStar = sub.d_star ?? 0.5;
        const mRatio = sub.m_ratio ?? 0.8;
        const normMetric = Math.max(0.05, Math.min(0.95, (dStar / 1.0) * 0.55 + (mRatio / 2.0) * 0.45));
        const phi = 24 + (1 - normMetric) * 58;

        const proj = projectDome(phi, lon, 6);
        const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

        return {
          sub,
          proj,
          colorToken,
          isHighLeverage: (sub.ive ?? 0.5) >= 0.7,
        };
      })
      .filter((item) => item.proj.isFront); // 仅渲染正面半球
  }, [subjects, projectDome]);

  const activeOctantCode = OCTANT_ORDER[activeSectorIndex];
  const activeConf = OCTANT_SECTOR_CONFIGS[activeOctantCode];
  const activeStats = octantStatsMap[activeOctantCode] || {
    count: 0,
    percentage: "0%",
    avgDStar: "--",
    avgMRatio: "--",
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative w-full h-full flex flex-col items-center justify-between cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
      style={{ background: "transparent" }}
    >
      {/* 恒星深空背景粒子 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
        {DOME_STARS.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#ffffff"
            opacity={s.opacity}
          />
        ))}
      </svg>

      {/* 认知半球天幕主 SVG 舞台 */}
      <svg
        viewBox="0 0 880 560"
        className="w-full h-full max-h-full max-w-full aspect-[880/560] object-contain overflow-visible z-10"
      >
        <defs>
          {/* 天幕穹顶深空渐变 */}
          <radialGradient id="dome-canopy-body" cx="50%" cy="20%" r="85%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#0f172a" stopOpacity="0.88" />
            <stop offset="85%" stopColor="#050814" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>

          {/* 边缘大气辉光渐变 */}
          <linearGradient id="dome-edge-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* A. 认知半球天幕穹顶实体轮廓与立体阴影                          */}
        {/* ============================================================== */}
        <g className="select-none">
          {/* 1. 天幕主体实体 */}
          <path
            d={domeCanopyPath}
            fill="url(#dome-canopy-body)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
          />

          {/* 2. 底沿拱形宽广边框 (上窄下宽画卷的宽广底边) */}
          <path
            d={domeCanopyPath.split(" L ").slice(0, 32).join(" L ")}
            fill="none"
            stroke="url(#dome-edge-glow)"
            strokeWidth="2.2"
            opacity="0.85"
          />
        </g>

        {/* ============================================================== */}
        {/* B. 8 扇区曲面背景感应块 (点击吸附切面，上窄下宽立体画卷)      */}
        {/* ============================================================== */}
        <g className="select-none">
          {OCTANT_ORDER.map((code) => {
            const conf = OCTANT_SECTOR_CONFIGS[code];
            const isCenter = activeOctantCode === code;
            const isHover = hoveredSector === code;
            const surfaceD = getSectorSurfacePath(conf.centerAngle);

            return (
              <path
                key={`dome-surface-${code}`}
                d={surfaceD}
                fill={
                  isCenter
                    ? conf.glowColor
                    : isHover
                      ? "rgba(255, 255, 255, 0.08)"
                      : "transparent"
                }
                className="transition-colors duration-150 cursor-pointer"
                onClick={() => {
                  const idx = OCTANT_ORDER.indexOf(code);
                  if (idx >= 0) snapToSector(idx);
                }}
                onMouseEnter={() => {
                  setHoveredSector(code);
                  if (onHoverStatusChange) {
                    onHoverStatusChange(`【${conf.name}】: ${conf.desc}`);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredSector(null);
                  if (onHoverStatusChange) onHoverStatusChange(null);
                }}
              />
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* C. 8 条边界经线高能辐射射线 (作为扇区左右分界线，夹角定义扇区)  */}
        {/* 严格位于扇区边界 (0°, 45°, 90°...)，扇区正中绝无割裂中线！      */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {BOUNDARY_RAYS.map((ray) => {
            const pApex = projectDome(12, ray.angle);
            const pBase = projectDome(86, ray.angle);

            // 采样经线弧路径
            const rayPts: string[] = [];
            for (let phi = 12; phi <= 86; phi += 7.5) {
              const p = projectDome(phi, ray.angle);
              if (p.isFront) {
                rayPts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
              }
            }

            if (rayPts.length < 2) return null;
            const rayPathD = `M ${rayPts.join(" L ")}`;
            const midVis = (pApex.cosPsi + pBase.cosPsi) / 2;
            const rayOpacity = Math.max(0.12, Math.min(1.0, (midVis + 0.1) * 1.1));

            return (
              <g key={`dome-boundary-ray-${ray.angle}`} opacity={rayOpacity}>
                {/* 经线弥散微晕 */}
                <path
                  d={rayPathD}
                  fill="none"
                  stroke={ray.primary}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  opacity="0.22"
                />
                {/* 经线高能流束核心 */}
                <path
                  d={rayPathD}
                  fill="none"
                  stroke={ray.beamCore}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.80"
                />
                {/* 经线白炽芯 */}
                <path
                  d={rayPathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                {/* 底沿交汇能量微珠 */}
                {pBase.isFront && (
                  <circle
                    cx={pBase.x}
                    cy={pBase.y}
                    r={2.2 * pBase.scale}
                    fill={ray.primary}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* D. 扇区三层周易爻线阶梯 (上窄下宽立体画卷：初爻窄短，上爻宽长)  */}
        {/* 容纳于扇区夹角内部 [-18°, +18°]，不刺穿边界线，阴爻居中留白断开 */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {OCTANT_ORDER.map((code) => {
            const conf = OCTANT_SECTOR_CONFIGS[code];
            const lines = DOME_SECTOR_LINES[code] || [true, true, true];
            const isCenter = activeOctantCode === code;

            // 三层爻的纬度位置 (初爻: 36° 上层窄, 二爻: 58° 中层, 上爻: 80° 下层宽)
            const levelPhis = [36, 58, 80];

            return (
              <g key={`dome-trigram-${code}`}>
                {lines.map((isYang, levelIdx) => {
                  const phi = levelPhis[levelIdx];
                  const cAngle = conf.centerAngle;

                  if (isYang) {
                    // 阳爻：单一长横弧线，跨越本扇区 [-18°, +18°]，两端留出安全空隙
                    const pts: string[] = [];
                    for (let d = -18; d <= 18; d += 4.5) {
                      const p = projectDome(phi, cAngle + d);
                      if (p.isFront) pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
                    }
                    if (pts.length < 2) return null;

                    const centerP = projectDome(phi, cAngle);
                    const opacity = Math.max(0.15, Math.min(1.0, centerP.cosPsi * 1.15));

                    return (
                      <path
                        key={`yao-${code}-${levelIdx}`}
                        d={`M ${pts.join(" L ")}`}
                        fill="none"
                        stroke={isCenter ? conf.primaryColor : "rgba(255, 255, 255, 0.88)"}
                        strokeWidth={(isCenter ? 3.4 : 2.8) * centerP.scale}
                        strokeLinecap="round"
                        opacity={opacity}
                        className="transition-colors duration-150"
                      />
                    );
                  } else {
                    // 阴爻：两截弧线，中间明确断开留白 [-4.5°, 4.5°]，两段各在夹角内
                    const ptsLeft: string[] = [];
                    for (let d = -18; d <= -4.5; d += 4.5) {
                      const p = projectDome(phi, cAngle + d);
                      if (p.isFront) ptsLeft.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
                    }

                    const ptsRight: string[] = [];
                    for (let d = 4.5; d <= 18; d += 4.5) {
                      const p = projectDome(phi, cAngle + d);
                      if (p.isFront) ptsRight.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
                    }

                    const centerP = projectDome(phi, cAngle);
                    const opacity = Math.max(0.15, Math.min(1.0, centerP.cosPsi * 1.15));

                    return (
                      <g key={`yao-${code}-${levelIdx}`} opacity={opacity}>
                        {ptsLeft.length >= 2 && (
                          <path
                            d={`M ${ptsLeft.join(" L ")}`}
                            fill="none"
                            stroke={isCenter ? conf.primaryColor : "rgba(255, 255, 255, 0.72)"}
                            strokeWidth={(isCenter ? 3.4 : 2.8) * centerP.scale}
                            strokeLinecap="round"
                            className="transition-colors duration-150"
                          />
                        )}
                        {ptsRight.length >= 2 && (
                          <path
                            d={`M ${ptsRight.join(" L ")}`}
                            fill="none"
                            stroke={isCenter ? conf.primaryColor : "rgba(255, 255, 255, 0.72)"}
                            strokeWidth={(isCenter ? 3.4 : 2.8) * centerP.scale}
                            strokeLinecap="round"
                            className="transition-colors duration-150"
                          />
                        )}
                      </g>
                    );
                  }
                })}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* E. 扇区名称与坐标标牌 (浮于底沿外侧，正中主角清晰展出)        */}
        {/* ============================================================== */}
        <g className="select-none">
          {OCTANT_ORDER.map((code) => {
            const conf = OCTANT_SECTOR_CONFIGS[code];
            const pLabel = projectDome(91, conf.centerAngle);
            if (!pLabel.isFront || pLabel.cosPsi < 0.1) return null;

            const isCenter = activeOctantCode === code;
            const opacity = Math.max(0.2, Math.min(1.0, pLabel.cosPsi * 1.25));

            return (
              <g
                key={`dome-label-${code}`}
                transform={`translate(${pLabel.x.toFixed(1)}, ${pLabel.y.toFixed(1)})`}
                opacity={opacity}
                className="cursor-pointer"
                onClick={() => {
                  const idx = OCTANT_ORDER.indexOf(code);
                  if (idx >= 0) snapToSector(idx);
                }}
              >
                {/* 象区主标 */}
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  fill="none"
                  stroke={isCenter ? conf.primaryColor : "rgba(255, 255, 255, 0.85)"}
                  strokeWidth={isCenter ? "2.6" : "2.0"}
                  strokeLinejoin="round"
                  fontSize={isCenter ? "12" : "10.5"}
                  fontWeight="900"
                  letterSpacing="1.0"
                >
                  {conf.name}
                </text>
                <text
                  x="0"
                  y="-2"
                  textAnchor="middle"
                  fill="#090a0f"
                  fontSize={isCenter ? "12" : "10.5"}
                  fontWeight="900"
                  letterSpacing="1.0"
                >
                  {conf.name}
                </text>

                {/* 象区副标 (仅正中及近邻扇区展现) */}
                {pLabel.cosPsi > 0.45 && (
                  <text
                    x="0"
                    y="10.5"
                    textAnchor="middle"
                    fill={isCenter ? conf.primaryColor : "rgba(148, 163, 184, 0.70)"}
                    fontSize={isCenter ? "8.5" : "7.5"}
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {conf.subTitle}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 顶部天顶自然收束：已移除突兀的“相变奇点 · 觉醒极”文字和光晕大球，天穹开阔纯净 */}

        {/* ============================================================== */}
        {/* F. 受测者数据点 (精确附着于半球天幕上，近大远小立体缩放)       */}
        {/* ============================================================== */}
        <g>
          {projectedStars.map(({ sub, proj, colorToken, isHighLeverage }) => {
            const isHovered = hoveredSubject?.id === sub.id;
            const r = (isHovered ? 6.5 : 4.0) * proj.scale;
            const starOpacity = Math.max(0.25, Math.min(1.0, (proj.cosPsi + 0.15) * 1.2));

            return (
              <g
                key={`dome-star-${sub.id}`}
                className="cursor-pointer"
                opacity={starOpacity}
                onClick={() => onOpenReport(sub.id)}
                onMouseEnter={() => {
                  setHoveredSubject(sub);
                  setAnchorPos({ x: proj.x, y: proj.y });
                }}
                onMouseLeave={() => {
                  setHoveredSubject(null);
                  setAnchorPos(null);
                }}
              >
                {/* 扩充点击响应面 */}
                <circle cx={proj.x} cy={proj.y} r={14 * proj.scale} fill="transparent" />

                {/* 高杠杆外光环 */}
                {isHighLeverage && (
                  <circle
                    cx={proj.x}
                    cy={proj.y}
                    r={r + 3.2}
                    fill="none"
                    stroke={colorToken.borderColor}
                    strokeWidth="1.2"
                    opacity="0.8"
                    strokeDasharray="2 2"
                  />
                )}

                {/* 实体星辰 */}
                <circle
                  cx={proj.x}
                  cy={proj.y}
                  r={r}
                  fill={colorToken.backgroundColor}
                  stroke={isHovered ? "#ffffff" : colorToken.borderColor}
                  strokeWidth={isHovered ? 2.2 : 1.3}
                  className="transition-transform duration-100"
                  style={{
                    filter: isHovered ? "drop-shadow(0 0 6px #ffffff)" : undefined,
                  }}
                />

                {/* 白炽星核 */}
                <circle cx={proj.x} cy={proj.y} r={1.1 * proj.scale} fill="#ffffff" opacity="0.9" />
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* G. 受测者浮动气泡卡片 (统一标准规范组件)                       */}
        {/* ============================================================== */}
        {hoveredSubject && anchorPos && (
          <SubjectHoverCard
            subject={hoveredSubject}
            anchorPos={anchorPos}
            canvasWidth={880}
            canvasHeight={520}
          />
        )}
      </svg>

      {/* ============================================================== */}
      {/* H. 底部天幕导航控制台与当前聚焦象区看板                        */}
      {/* ============================================================== */}
      <div className="w-full max-w-2xl px-4 py-2 z-20 flex items-center justify-between gap-3 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl mb-1 text-xs">
        {/* 左切换按钮 */}
        <button
          onClick={() => snapToSector(activeSectorIndex - 1)}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="切换至上一个象区 (逆时针 45°)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 正中主象区看板 */}
        <div className="flex-1 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: activeConf.primaryColor }}
            />
            <span className="font-bold text-slate-100 text-xs truncate">
              {activeConf.name}
            </span>
            <span className="font-mono text-[10px] text-slate-400 border border-white/10 px-1.5 py-0.2 rounded bg-white/5 shrink-0">
              {activeConf.code}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline truncate">
              · {activeConf.desc}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
            <span className="text-slate-400">
              样本: <strong className="text-slate-200">{activeStats.count}</strong>
              <span className="text-slate-500"> ({activeStats.percentage})</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400">D* {activeStats.avgDStar}</span>
            <span className="text-purple-400">M {activeStats.avgMRatio}</span>
          </div>
        </div>

        {/* 8 象区步进微圆点指示器 */}
        <div className="hidden md:flex items-center gap-1 shrink-0 px-1">
          {OCTANT_ORDER.map((code, idx) => {
            const isActive = idx === activeSectorIndex;
            return (
              <button
                key={`step-dot-${code}`}
                onClick={() => snapToSector(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  isActive ? "w-3 bg-indigo-400 shadow-sm shadow-indigo-500" : "bg-slate-700 hover:bg-slate-500"
                }`}
                title={`跳转到 ${OCTANT_SECTOR_CONFIGS[code].name}`}
              />
            );
          })}
        </div>

        {/* 右切换按钮 */}
        <button
          onClick={() => snapToSector(activeSectorIndex + 1)}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="切换至下一个象区 (顺时针 45°)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
