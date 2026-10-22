import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Compass,
  MousePointerClick,
} from "lucide-react";
import { SCROLL_SECTOR_CONFIGS, SCROLL_SECTOR_CONFIGS_EN } from "../../SphericalDataBand";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";
import { getMythicArchetype } from "../share/mythicArchetypes";
import { getArcaneArchetype } from "../share/arcaneArchetypes";
import { GUEST_MOCK_EXPLORERS } from "./guestMockData";
import { useLocale } from "../../contexts/LocaleContext";

interface ArchetypeStickyScrollBandProps {
  selectedCodeFromHero?: string | null;
  onStartTest: () => void;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 650;
const CX = CANVAS_WIDTH / 2;
const SECTOR_WIDTH = 760;

// 8 根贯天彻地的全息光帷界线
const BOUNDARY_VEILS = [
  { angle: 22.5, primary: "#a855f7", beamCore: "#c084fc" },
  { angle: 67.5, primary: "#f43f5e", beamCore: "#fb7185" },
  { angle: 112.5, primary: "#06b6d4", beamCore: "#38bdf8" },
  { angle: 157.5, primary: "#f59e0b", beamCore: "#fbbf24" },
  { angle: 202.5, primary: "#a855f7", beamCore: "#c084fc" },
  { angle: 247.5, primary: "#f43f5e", beamCore: "#fb7185" },
  { angle: 292.5, primary: "#06b6d4", beamCore: "#38bdf8" },
  { angle: 337.5, primary: "#f59e0b", beamCore: "#fbbf24" },
];

const SCROLL_BG_STARS = Array.from({ length: 72 }).map((_, i) => {
  const s1 = Math.sin(i * 373.17) * 10000;
  const s2 = Math.cos(i * 591.31) * 10000;
  return {
    id: `band-star-${i}`,
    x: Math.abs(s1 - Math.floor(s1)) * CANVAS_WIDTH,
    y: Math.abs(s2 - Math.floor(s2)) * CANVAS_HEIGHT,
    r: 0.6 + (i % 3) * 0.5,
    opacity: 0.15 + (i % 4) * 0.15,
  };
});

const RAIL_Y_LEVELS = [175, 330, 485];

export const ArchetypeStickyScrollBand: React.FC<ArchetypeStickyScrollBandProps> = ({
  selectedCodeFromHero,
  onStartTest,
}) => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");
  const scrollSectorConfigs = isEn ? SCROLL_SECTOR_CONFIGS_EN : SCROLL_SECTOR_CONFIGS;

  const stickyTrackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [activeSectorIndex, setActiveSectorIndex] = useState<number>(0);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const targetRotationRef = useRef(0);
  const rotationRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  // 步进切换到指定象区 (0 ~ 7)
  const snapToSector = useCallback(
    (newIndex: number, scrollWindowToo: boolean = false) => {
      const safeIndex = ((newIndex % 8) + 8) % 8;
      setActiveSectorIndex(safeIndex);

      const conf = scrollSectorConfigs[safeIndex];
      if (conf) {
        const targetBase = -conf.angle;
        let diff = targetBase - rotationRef.current;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        targetRotationRef.current = rotationRef.current + diff;
      }

      // 如果用户在桌面端点击了底部圆点，且正处于 Sticky 轨道内，则同步滚动条位置以免滚动时跳回
      if (
        scrollWindowToo &&
        typeof window !== "undefined" &&
        window.innerWidth >= 1024 &&
        stickyTrackRef.current
      ) {
        const rect = stickyTrackRef.current.getBoundingClientRect();
        const trackTopDoc = window.scrollY + rect.top;
        const scrollableDist = Math.max(1, rect.height - window.innerHeight);
        const targetProgress = safeIndex / 7;
        window.scrollTo({
          top: trackTopDoc + targetProgress * scrollableDist,
          behavior: "smooth",
        });
      }
    },
    [scrollSectorConfigs]
  );

  // 当从首屏点击某个流派时，自动定位到该流派并平滑滚入画卷
  useEffect(() => {
    if (!selectedCodeFromHero) return;
    const idx = scrollSectorConfigs.findIndex((c) => c.code === selectedCodeFromHero);
    if (idx >= 0) {
      snapToSector(idx, true);
    }
  }, [selectedCodeFromHero, scrollSectorConfigs, snapToSector]);

  // 阻尼弹簧过渡循环
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      if (!isDraggingRef.current) {
        const diff = targetRotationRef.current - rotationRef.current;
        if (Math.abs(diff) > 0.04) {
          const step = diff * (1 - Math.exp(-0.032 * dt));
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

  // 核心：监听纵向滚动位置，将 Sticky 容器内的纵向行程 (0 -> 1) 转化为画卷横向角度 (0° -> -315°)
  useEffect(() => {
    const handleWindowScroll = () => {
      const trackEl = stickyTrackRef.current;
      if (!trackEl || isDraggingRef.current) return;

      // 仅在桌面端大屏 (lg: >= 1024px) 启用纵向转横向滚动映射
      if (window.innerWidth < 1024) return;

      const rect = trackEl.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) return;

      // 当 Sticky 容器顶部到达视口顶部 (rect.top <= 0) 且底部尚未离开视口底部时
      const rawProgress = -rect.top / scrollableDistance;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));
      setScrollProgress(clampedProgress);

      if (rawProgress >= -0.05 && rawProgress <= 1.05) {
        // 0 -> 1 对应从第 0 象区 (0°) 横向推进到第 7 象区 (-315°)
        const continuousAngle = -clampedProgress * 315;
        targetRotationRef.current = continuousAngle;

        const nearestIdx = Math.min(7, Math.max(0, Math.round(clampedProgress * 7)));
        setActiveSectorIndex(nearestIdx);
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll();
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, []);

  // 计算角度对应的画布横坐标 X
  const getScreenX = useCallback(
    (angleDeg: number) => {
      const diff = (((angleDeg + currentRotation + 180) % 360) + 360) % 360 - 180;
      return CX + (diff / 45) * SECTOR_WIDTH;
    },
    [currentRotation]
  );

  // 支持鼠标/触摸直接左右拖拽画卷
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    isDraggingRef.current = true;
    lastPointerXRef.current = e.clientX;

    const handleWindowPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastPointerXRef.current;
      lastPointerXRef.current = ev.clientX;

      const degDelta = (dx / SECTOR_WIDTH) * 45;
      rotationRef.current += degDelta;
      targetRotationRef.current = rotationRef.current;
      setCurrentRotation(rotationRef.current);
    };

    const handleWindowPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);

      const curRot = ((-rotationRef.current % 360) + 360) % 360;
      let closestIdx = 0;
      let minDiff = 999;
      scrollSectorConfigs.forEach((conf, idx) => {
        let diff = Math.abs(curRot - conf.angle);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      snapToSector(closestIdx, false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  // 将 24 颗 Mock 探索者星宿投影到画卷天轨上作为氛围背景星
  const projectedMockStars = useMemo(() => {
    return GUEST_MOCK_EXPLORERS.map((exp, idx) => {
      const conf =
        scrollSectorConfigs.find((c) => c.code === exp.quadrantCode) ||
        scrollSectorConfigs[0];
      const slotOffset = ((idx % 3) - 1) * 12;
      const starAngle = conf.angle + slotOffset;
      const x = getScreenX(starAngle);

      const normMetric = Math.max(
        0.1,
        Math.min(0.9, (exp.powerScore / 100) * 0.5 + (exp.selfKnowScore / 100) * 0.5)
      );
      const y = 470 - normMetric * 280;

      const distFromCenter = Math.abs(x - CX);
      const isVisible = distFromCenter <= CANVAS_WIDTH / 2 + 80;
      const focusFactor = Math.max(0.15, 1 - distFromCenter / (CANVAS_WIDTH * 0.65));

      return {
        exp,
        x,
        y,
        color: conf.primaryColor,
        isVisible,
        focusFactor,
      };
    }).filter((item) => item.isVisible);
  }, [scrollSectorConfigs, getScreenX]);

  const activeConf = scrollSectorConfigs[activeSectorIndex] || scrollSectorConfigs[0];
  const activeDef = getArchetypeDefinition(activeConf.code, isEn ? "en-US" : "zh-CN");
  const activeMythic = getMythicArchetype(activeConf.code);
  const activeArcane = getArcaneArchetype(activeConf.code);

  const totemSubtitle = isEn
    ? activeArcane.orderTitle
    : `${activeMythic.mythicTotem} · ${activeMythic.totemTitle}`;

  return (
    <section
      id="archetypes"
      ref={stickyTrackRef}
      className="relative lg:h-[380vh] border-t border-white/[0.08]"
    >
      {/* Sticky 视口锁定容器：桌面端向下滚动时锁定在屏幕中央，转化为横向画卷漫游 */}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        className="lg:sticky lg:top-0 w-full min-h-screen lg:h-screen flex flex-col justify-between overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ background: "#050811" }}
      >
        {/* 1. 背景全景无缝画卷 SVG 舞台 (100% 铺满视口) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
          {SCROLL_BG_STARS.map((s) => (
            <circle
              key={s.id}
              cx={`${(s.x / CANVAS_WIDTH) * 100}%`}
              cy={`${(s.y / CANVAS_HEIGHT) * 100}%`}
              r={s.r}
              fill="#ffffff"
              opacity={s.opacity}
            />
          ))}
        </svg>

        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        >
          <defs>
            <linearGradient id="landing-scroll-vignette" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#04060d" stopOpacity="0.92" />
              <stop offset="18%" stopColor="#040817" stopOpacity="0.2" />
              <stop offset="82%" stopColor="#040817" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#04060d" stopOpacity="0.95" />
            </linearGradient>

            {scrollSectorConfigs.map((conf) => (
              <radialGradient
                key={`landing-aurora-${conf.code}`}
                id={`landing-aurora-${conf.code}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={conf.primaryColor} stopOpacity="0.34" />
                <stop offset="45%" stopColor={conf.primaryColor} stopOpacity="0.14" />
                <stop offset="85%" stopColor={conf.primaryColor} stopOpacity="0.03" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            ))}

            <pattern
              id="landing-scroll-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="40"
                y2="0"
                stroke="rgba(255,255,255,0.018)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="40"
                stroke="rgba(255,255,255,0.018)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="url(#landing-scroll-grid)"
          />

          {/* A. 8 大象区极光能量柱与巨幅图腾水印 */}
          <g>
            {scrollSectorConfigs.map((conf) => {
              const centerX = getScreenX(conf.angle);
              if (Math.abs(centerX - CX) > CANVAS_WIDTH * 1.1) return null;

              const isCenter = activeConf.code === conf.code;
              const distRatio = Math.abs(centerX - CX) / (CANVAS_WIDTH * 0.6);
              const focusOpacity = Math.max(0.18, 1 - distRatio * 0.68);
              const mythic = getMythicArchetype(conf.code);

              return (
                <g key={`landing-sector-${conf.code}`} opacity={focusOpacity}>
                  <ellipse
                    cx={centerX}
                    cy={CANVAS_HEIGHT / 2}
                    rx={SECTOR_WIDTH * 0.52}
                    ry={CANVAS_HEIGHT * 0.55}
                    fill={`url(#landing-aurora-${conf.code})`}
                    opacity={isCenter ? 1.0 : 0.45}
                  />

                  {/* 巨幅图腾全息水印 */}
                  <text
                    x={centerX}
                    y={CANVAS_HEIGHT / 2 + 75}
                    textAnchor="middle"
                    fill={conf.primaryColor}
                    opacity={isCenter ? 0.11 : 0.04}
                    fontSize="210"
                    fontWeight="900"
                    style={{ filter: `drop-shadow(0 0 40px ${conf.primaryColor})` }}
                  >
                    {conf.baguaChar}
                  </text>

                  {/* 顶部神兽/学派领地铭牌（完全不显示 Q1-CAL 代号） */}
                  <g transform={`translate(${centerX}, 115)`}>
                    <rect
                      x="-90"
                      y="-14"
                      width="180"
                      height="26"
                      rx="13"
                      fill="#030712"
                      fillOpacity="0.85"
                      stroke={isCenter ? conf.primaryColor : "rgba(255,255,255,0.16)"}
                      strokeWidth={isCenter ? "1.5" : "1.0"}
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill={isCenter ? conf.primaryColor : "rgba(255,255,255,0.7)"}
                      fontSize="11"
                      fontWeight="bold"
                      letterSpacing="1.5"
                    >
                      {isEn ? conf.baguaName : `${mythic.mythicTotem} · ${conf.baguaName}`}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* B. 8 根贯天彻地全息分界光帷 */}
          <g>
            {BOUNDARY_VEILS.map((veil) => {
              const x = getScreenX(veil.angle);
              if (Math.abs(x - CX) > CANVAS_WIDTH * 1.1) return null;
              const distRatio = Math.abs(x - CX) / (CANVAS_WIDTH * 0.6);
              const opacity = Math.max(0.12, 0.8 - distRatio * 0.6);

              return (
                <g key={`landing-veil-${veil.angle}`} opacity={opacity}>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={CANVAS_HEIGHT}
                    stroke={veil.primary}
                    strokeWidth="5"
                    strokeOpacity="0.2"
                  />
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={CANVAS_HEIGHT}
                    stroke={veil.beamCore}
                    strokeWidth="1.6"
                    strokeOpacity="0.8"
                  />
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={CANVAS_HEIGHT}
                    stroke="#ffffff"
                    strokeWidth="0.7"
                    strokeOpacity="0.9"
                  />
                </g>
              );
            })}
          </g>

          {/* C. 三道横贯全屏的金色天轨 */}
          <g>
            {scrollSectorConfigs.map((conf) => {
              const centerX = getScreenX(conf.angle);
              if (Math.abs(centerX - CX) > CANVAS_WIDTH * 1.1) return null;
              const isCenter = activeConf.code === conf.code;
              const halfW = SECTOR_WIDTH / 2 - 24;

              return (
                <g key={`landing-rails-${conf.code}`}>
                  {conf.lines.map((isYang, levelIdx) => {
                    const y = RAIL_Y_LEVELS[levelIdx];
                    if (isYang) {
                      return (
                        <line
                          key={`r-y-${conf.code}-${levelIdx}`}
                          x1={centerX - halfW}
                          y1={y}
                          x2={centerX + halfW}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.2 : 2.0}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.65 : 0.3}
                        />
                      );
                    }
                    return (
                      <g key={`r-n-${conf.code}-${levelIdx}`}>
                        <line
                          x1={centerX - halfW}
                          y1={y}
                          x2={centerX - 42}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.2 : 2.0}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.65 : 0.3}
                        />
                        <line
                          x1={centerX + 42}
                          y1={y}
                          x2={centerX + halfW}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.2 : 2.0}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.65 : 0.3}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* D. 浮游于天轨之间的探索者星群 */}
          <g>
            {projectedMockStars.map(({ exp, x, y, color, focusFactor }) => (
              <g key={`band-mock-${exp.id}`} opacity={focusFactor * 0.75}>
                <circle cx={x} cy={y} r={5} fill={color} opacity="0.35" />
                <circle cx={x} cy={y} r={2.8} fill="#ffffff" />
              </g>
            ))}
          </g>

          <rect
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="url(#landing-scroll-vignette)"
          />
        </svg>

        {/* 2. 顶部画卷标题与滚动进度提示 */}
        <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-20 pb-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? "PANORAMIC COGNITIVE SCROLL · 8 ARCHETYPES"
                  : "全景认知长卷 · 八大心智化身图鉴"}
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white mt-1">
              {isEn
                ? "Which Totem Mirrors Your True Decision Style?"
                : "哪一尊心智化身，是你思维深处的本命写照？"}
            </h2>
          </div>

          {/* 交互指引提示 */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-xs text-slate-300">
            <MousePointerClick className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isEn
                ? "Scroll down or drag horizontally to roam all 8 archetypes"
                : "向下滚动页面或左右拖拽画卷，依次漫游八大化身"}
            </span>
            <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30">
              {activeSectorIndex + 1} / 8
            </span>
          </div>
        </div>

        {/* 3. 正中央：当前聚焦化身的高定泥金/奥术主展陈卡 */}
        <div className="relative z-20 flex-1 flex items-center justify-center px-4 sm:px-8 py-2">
          <div
            className="w-full max-w-4xl rounded-3xl p-6 sm:p-8 lg:p-10 bg-slate-950/80 backdrop-blur-xl border shadow-2xl transition-all duration-300 relative overflow-hidden"
            style={{
              borderColor: `${activeConf.primaryColor}66`,
              boxShadow: `0 25px 70px -15px ${activeConf.primaryColor}33`,
            }}
          >
            {/* 卡片右上角东方朱砂印章 / 西方秘法徽印 */}
            <div
              className="hidden sm:flex absolute right-7 top-7 w-16 h-16 rounded-2xl border-2 items-center justify-center p-1.5 shadow-lg transform rotate-6 select-none pointer-events-none"
              style={{
                backgroundColor: isEn ? "rgba(88, 28, 135, 0.35)" : "rgba(185, 28, 28, 0.85)",
                borderColor: isEn ? activeConf.primaryColor : "#fef08a",
              }}
            >
              <div className="text-xs font-black font-serif text-amber-100 text-center leading-tight">
                {isEn ? (
                  activeArcane.sealText
                ) : (
                  <>
                    {activeMythic.sealText.slice(0, 2)}
                    <br />
                    {activeMythic.sealText.slice(2, 4)}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* 左侧：神兽/化身名讳、金句与深度赋能解读 */}
              <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold"
                  style={{
                    backgroundColor: `${activeConf.primaryColor}18`,
                    borderColor: `${activeConf.primaryColor}55`,
                    color: activeConf.secondaryColor,
                  }}
                >
                  <span>{isEn ? activeArcane.crestSymbol : activeMythic.baguaSymbol}</span>
                  <span>{totemSubtitle}</span>
                </div>

                <div>
                  <h3
                    className="text-3xl sm:text-5xl font-black tracking-tight"
                    style={{
                      color: "#ffffff",
                      textShadow: `0 0 28px ${activeConf.primaryColor}66`,
                    }}
                  >
                    {activeDef.role_title}
                  </h3>
                  <p
                    className="text-sm sm:text-base font-bold mt-2"
                    style={{ color: activeConf.secondaryColor }}
                  >
                    “{activeDef.praise_tagline}”
                  </p>
                </div>

                {/* 核心优势标签 */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  {activeDef.strength_tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.05] border border-white/10 text-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* 通俗温暖的赋能解读 */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-4">
                  {activeDef.empowering_feedback}
                </p>

                <div className="pt-2 flex items-center justify-center lg:justify-start gap-3">
                  <button
                    type="button"
                    onClick={onStartTest}
                    className="px-6 py-3 rounded-2xl font-extrabold text-xs sm:text-sm text-slate-950 shadow-lg flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer"
                    style={{
                      backgroundColor: activeConf.secondaryColor,
                      boxShadow: `0 10px 30px -5px ${activeConf.primaryColor}66`,
                    }}
                  >
                    <Compass className="w-4 h-4" />
                    <span>
                      {isEn
                        ? "Test If You Match This Archetype"
                        : `测测你是不是「${activeDef.role_title}」`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 右侧：4 大专属天赋特技 (2x2 Grid) */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeDef.skills.slice(0, 4).map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-black/55 border border-white/10 hover:border-white/25 transition-all space-y-1.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{skill.icon}</span>
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          {skill.name.replace(/\s*\([^)]*\)/g, "")}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                        style={{
                          backgroundColor: `${activeConf.primaryColor}15`,
                          borderColor: `${activeConf.primaryColor}40`,
                          color: activeConf.secondaryColor,
                        }}
                      >
                        {skill.type}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {skill.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 底部画卷操控导航舱 (支持一键点击切换 8 大流派 + 滚动进度条) */}
        <div className="relative z-20 max-w-5xl w-full mx-auto px-4 sm:px-8 pb-6 pt-2">
          <div className="p-2.5 sm:px-4 sm:py-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => snapToSector(activeSectorIndex - 1, true)}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white transition-all cursor-pointer shrink-0"
                title={isEn ? "Previous Archetype" : "上一尊化身"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 8 大化身直达胶囊 */}
              <div className="flex-1 flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {scrollSectorConfigs.map((conf, idx) => {
                  const isActive = idx === activeSectorIndex;
                  const def = getArchetypeDefinition(conf.code, isEn ? "en-US" : "zh-CN");
                  return (
                    <button
                      key={conf.code}
                      type="button"
                      onClick={() => snapToSector(idx, true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                        isActive
                          ? "text-slate-950 shadow-md scale-[1.03]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border-white/10"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: conf.secondaryColor,
                              borderColor: conf.primaryColor,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: isActive ? "#050811" : conf.primaryColor,
                        }}
                      />
                      <span>{def.role_title}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => snapToSector(activeSectorIndex + 1, true)}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white transition-all cursor-pointer shrink-0"
                title={isEn ? "Next Archetype" : "下一尊化身"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 纵向转横向滚动进度指示条 (遵循 modern-web-guidance aria-hidden 规范) */}
            <div
              aria-hidden="true"
              className="hidden lg:block w-full h-1 rounded-full bg-white/[0.06] overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${Math.max(8, scrollProgress * 100)}%`,
                  backgroundColor: activeConf.primaryColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
