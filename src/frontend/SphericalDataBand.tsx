import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SubjectHoverCard from "./components/admin/SubjectHoverCard";
import {
  SubjectPoint,
  computeMultivariateColor,
} from "./Admin";
import { useLocale } from "./contexts/LocaleContext";

interface SphericalDataBandProps {
  subjects: SubjectPoint[];
  onOpenReport: (sessionId: string) => void;
  octantStatsMap: Record<
    string,
    { count: number; percentage: string; avgDStar: string; avgMRatio: string; avgScore: number }
  >;
  onHoverStatusChange?: (statusText: string | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

// 全景无缝认知画卷 (Panoramic Cognitive Scroll) 核心画布尺寸与比例
// 高度 100% 顶天立地铺满内容区，宽度左右无缝连续旋转流动
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 650;
const CX = CANVAS_WIDTH / 2; // 600
const SECTOR_WIDTH = 760; // 单个象区画卷跨度 (宽达 760px，正中主画卷饱满壮阔，两侧连绵无缝流转)

// 8 大象区全景画卷配置 (包含东方周易八卦巨幅图腾、哲学界限与专属极光光谱)
export interface ScrollSectorConfig {
  code: string;
  angle: number; // 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
  name: string;
  subTitle: string;
  baguaChar: string; // ☰ ☱ ☲ ☳ ☷ ☶ ☵ ☴
  baguaName: string; // 乾 兑 离 震 坤 艮 坎 巽
  territory: string; // 领地哲学界限
  lines: [boolean, boolean, boolean]; // [初爻(上天轨), 二爻(中人轨), 上爻(下地轨)]
  primaryColor: string;
  secondaryColor: string;
  auroraFrom: string;
  auroraTo: string;
  desc: string;
}

export const SCROLL_SECTOR_CONFIGS: ScrollSectorConfig[] = [
  {
    code: "Q1-CAL",
    angle: 0,
    name: "人形外挂",
    subTitle: "知行绝对自洽 · 2.0+",
    baguaChar: "☰",
    baguaName: "乾为天",
    territory: "纯阳无极 · 知行合一自洽界",
    lines: [true, true, true], // 乾 ☰: 三阳爻 (纯阳至刚，乾三连)
    primaryColor: "#10b981",
    secondaryColor: "#34d399",
    auroraFrom: "rgba(16, 185, 129, 0.28)",
    auroraTo: "rgba(5, 150, 105, 0.02)",
    desc: "高一元突破 · 二阶知行完全自洽",
  },
  {
    code: "Q4-PIO",
    angle: 45,
    name: "飞龙在天",
    subTitle: "果敢自信破局 · 审慎侧",
    baguaChar: "☱",
    baguaName: "兑为泽",
    territory: "和悦刚决 · 果敢进攻破局界",
    lines: [false, true, true], // 兑 ☱: 上阴、中阳、下阳 (兑上缺)
    primaryColor: "#f59e0b",
    secondaryColor: "#fbbf24",
    auroraFrom: "rgba(245, 158, 11, 0.28)",
    auroraTo: "rgba(217, 119, 6, 0.02)",
    desc: "高一元底蕴 · 果敢进攻破局",
  },
  {
    code: "Q3-SEN",
    angle: 90,
    name: "定海神针",
    subTitle: "深厚审慎守舵 · 1.0",
    baguaChar: "☲",
    baguaName: "离为火",
    territory: "光明笃定 · 坚石防守御风界",
    lines: [true, false, true], // 离 ☲: 上阳、中阴、下阳 (离中虚)
    primaryColor: "#38bdf8",
    secondaryColor: "#7dd3fc",
    auroraFrom: "rgba(56, 189, 248, 0.28)",
    auroraTo: "rgba(2, 132, 199, 0.02)",
    desc: "高一元底蕴 · 审慎万无一失",
  },
  {
    code: "Q5-RET",
    angle: 135,
    name: "大音希声",
    subTitle: "知弱守拙避险 · 0.0",
    baguaChar: "☳",
    baguaName: "震为雷",
    territory: "潜龙在渊 · 知弱避险固本界",
    lines: [false, false, true], // 震 ☳: 上阴、中阴、下阳 (震仰盂)
    primaryColor: "#0d9488",
    secondaryColor: "#2dd4bf",
    auroraFrom: "rgba(13, 148, 136, 0.28)",
    auroraTo: "rgba(15, 118, 110, 0.02)",
    desc: "探索期 · 知己不足克制避险",
  },
  {
    code: "Q6-GAM",
    angle: 180,
    name: "无畏先锋",
    subTitle: "达克盲赌冲锋 · 探索极",
    baguaChar: "☷",
    baguaName: "坤为地",
    territory: "厚德含弘 · 破釜沉舟盲赌界",
    lines: [false, false, false], // 坤 ☷: 三阴爻 (纯阴柔顺，坤六断)
    primaryColor: "#f43f5e",
    secondaryColor: "#fb7185",
    auroraFrom: "rgba(244, 63, 94, 0.28)",
    auroraTo: "rgba(225, 29, 72, 0.02)",
    desc: "探索期 · 勇猛敢拼无知盲赌",
  },
  {
    code: "Q8-DRI",
    angle: 225,
    name: "暮光星灵",
    subTitle: "逍遥灵动漫游 · 盲赌侧",
    baguaChar: "☶",
    baguaName: "艮为山",
    territory: "动静不失 · 超然直觉漫游界",
    lines: [true, false, false], // 艮 ☶: 上阳、中阴、下阴 (艮覆碗)
    primaryColor: "#a855f7",
    secondaryColor: "#c084fc",
    auroraFrom: "rgba(168, 85, 247, 0.28)",
    auroraTo: "rgba(126, 34, 206, 0.02)",
    desc: "探索期 · 超脱规则纯粹直觉",
  },
  {
    code: "Q2-EVO",
    angle: 270,
    name: "灵窍天开",
    subTitle: "心开一窍悟道 · 0.0",
    baguaChar: "☵",
    baguaName: "坎为水",
    territory: "润物潜行 · 敏锐自省求真界",
    lines: [false, true, false], // 坎 ☵: 上阴、中阳、下阴 (坎中满)
    primaryColor: "#06b6d4",
    secondaryColor: "#22d3ee",
    auroraFrom: "rgba(6, 182, 212, 0.28)",
    auroraTo: "rgba(8, 145, 178, 0.02)",
    desc: "探索期 · 敏锐求真自省进化",
  },
  {
    code: "Q7-ARB",
    angle: 315,
    name: "诸葛在世",
    subTitle: "草船借箭套利 · 1.0",
    baguaChar: "☴",
    baguaName: "巽为风",
    territory: "进退从容 · 顺势套利借力界",
    lines: [true, true, false], // 巽 ☴: 上阳、中阳、下阴 (巽下断)
    primaryColor: "#eab308",
    secondaryColor: "#fde047",
    auroraFrom: "rgba(234, 179, 8, 0.28)",
    auroraTo: "rgba(202, 138, 4, 0.02)",
    desc: "探索期 · 算尽期望借力打力",
  },
];

export const SCROLL_SECTOR_CONFIGS_EN: ScrollSectorConfig[] = [
  {
    code: "Q1-CAL",
    angle: 0,
    name: "The Grand Archmage",
    subTitle: "Unerring Decree · 2.0+",
    baguaChar: "🜁",
    baguaName: "House of the Archmage",
    territory: "Aetheric Sphere of Sovereign Alignment",
    lines: [true, true, true],
    primaryColor: "#10b981",
    secondaryColor: "#34d399",
    auroraFrom: "rgba(16, 185, 129, 0.28)",
    auroraTo: "rgba(5, 150, 105, 0.02)",
    desc: "High First-Order Breakthrough · Flawless Second-Order Self-Knowledge",
  },
  {
    code: "Q4-PIO",
    angle: 45,
    name: "The Solar Conqueror",
    subTitle: "Bold Vanguard Decree · Prudent Aspect",
    baguaChar: "🜂",
    baguaName: "House of the Conqueror",
    territory: "Solar Citadel of Audacious Conviction",
    lines: [false, true, true],
    primaryColor: "#f59e0b",
    secondaryColor: "#fbbf24",
    auroraFrom: "rgba(245, 158, 11, 0.28)",
    auroraTo: "rgba(217, 119, 6, 0.02)",
    desc: "High Competence Foundation · Overwhelming Breakthrough",
  },
  {
    code: "Q3-SEN",
    angle: 90,
    name: "The Aegis Paladin",
    subTitle: "Steadfast Citadel Bastion · 1.0",
    baguaChar: "🜃",
    baguaName: "House of the Paladin",
    territory: "Adamant Realm of Prudent Bastion",
    lines: [true, false, true],
    primaryColor: "#38bdf8",
    secondaryColor: "#7dd3fc",
    auroraFrom: "rgba(56, 189, 248, 0.28)",
    auroraTo: "rgba(2, 132, 199, 0.02)",
    desc: "High Competence Foundation · Zero-Error Defense",
  },
  {
    code: "Q5-RET",
    angle: 135,
    name: "The Veiled Oracle",
    subTitle: "Cloistered Sanctuary Wisdom · 0.0",
    baguaChar: "☽",
    baguaName: "House of the Oracle",
    territory: "Veiled Mists of Mindful Retreat",
    lines: [false, false, true],
    primaryColor: "#0d9488",
    secondaryColor: "#2dd4bf",
    auroraFrom: "rgba(13, 148, 136, 0.28)",
    auroraTo: "rgba(15, 118, 110, 0.02)",
    desc: "Exploratory Stage · Acute Blind Spot Protection",
  },
  {
    code: "Q6-GAM",
    angle: 180,
    name: "The Stormborne Maverick",
    subTitle: "Dunning-Kruger Frontier Charge",
    baguaChar: "⚡",
    baguaName: "House of the Maverick",
    territory: "Stormy Seas of Reckless Valor",
    lines: [false, false, false],
    primaryColor: "#f43f5e",
    secondaryColor: "#fb7185",
    auroraFrom: "rgba(244, 63, 94, 0.28)",
    auroraTo: "rgba(225, 29, 72, 0.02)",
    desc: "Exploratory Stage · Fearless Impulse Without Braking",
  },
  {
    code: "Q8-DRI",
    angle: 225,
    name: "The Astral Wanderer",
    subTitle: "Ethereal Serendipity Drift",
    baguaChar: "✨",
    baguaName: "House of the Wanderer",
    territory: "Astral Expanse of Untamed Intuition",
    lines: [true, false, false],
    primaryColor: "#a855f7",
    secondaryColor: "#c084fc",
    auroraFrom: "rgba(168, 85, 247, 0.28)",
    auroraTo: "rgba(126, 34, 206, 0.02)",
    desc: "Exploratory Stage · Non-Linear Serendipitous Flow",
  },
  {
    code: "Q2-EVO",
    angle: 270,
    name: "The Mystic Alchemist",
    subTitle: "Philosopher's Awakening · 0.0",
    baguaChar: "🜄",
    baguaName: "House of the Alchemist",
    territory: "Hermetic Crucible of Transmutation",
    lines: [false, true, false],
    primaryColor: "#06b6d4",
    secondaryColor: "#22d3ee",
    auroraFrom: "rgba(6, 182, 212, 0.28)",
    auroraTo: "rgba(8, 145, 178, 0.02)",
    desc: "Exploratory Stage · Rapid Metacognitive Learning",
  },
  {
    code: "Q7-ARB",
    angle: 315,
    name: "The Fate Weaver",
    subTitle: "Tipping the Scales · 1.0",
    baguaChar: "⚖",
    baguaName: "House of the Fate Weaver",
    territory: "Spun Threads of Expected Value",
    lines: [true, true, false],
    primaryColor: "#eab308",
    secondaryColor: "#fde047",
    auroraFrom: "rgba(234, 179, 8, 0.28)",
    auroraTo: "rgba(202, 138, 4, 0.02)",
    desc: "Exploratory Stage · Strategic Information Leverage",
  },
];

export function getScrollSectorConfigs(locale?: string): ScrollSectorConfig[] {
  return locale === "en-US" ? SCROLL_SECTOR_CONFIGS_EN : SCROLL_SECTOR_CONFIGS;
}

// 8 根贯天彻地的全息光帷界标 (两象区交界经纬天线)
// 位于各展区交界经度角：22.5°, 67.5°, 112.5°, 157.5°, 202.5°, 247.5°, 292.5°, 337.5°
interface BoundaryVeilConfig {
  angle: number;
  primary: string;
  beamCore: string;
}

const BOUNDARY_VEILS: BoundaryVeilConfig[] = [
  { angle: 22.5, primary: "#a855f7", beamCore: "#c084fc" }, // 分割 Q1 与 Q4 (紫)
  { angle: 67.5, primary: "#f43f5e", beamCore: "#fb7185" },  // 分割 Q4 与 Q3 (绯红)
  { angle: 112.5, primary: "#06b6d4", beamCore: "#38bdf8" }, // 分割 Q3 与 Q5 (天青)
  { angle: 157.5, primary: "#f59e0b", beamCore: "#fbbf24" }, // 分割 Q5 与 Q6 (金)
  { angle: 202.5, primary: "#a855f7", beamCore: "#c084fc" }, // 分割 Q6 与 Q8 (紫)
  { angle: 247.5, primary: "#f43f5e", beamCore: "#fb7185" }, // 分割 Q8 与 Q2 (绯红)
  { angle: 292.5, primary: "#06b6d4", beamCore: "#38bdf8" }, // 分割 Q2 与 Q7 (天青)
  { angle: 337.5, primary: "#f59e0b", beamCore: "#fbbf24" }, // 分割 Q7 与 Q1 (金)
];

// 深空背景漫步星尘粒子 (覆盖全画卷)
const SCROLL_BG_STARS = Array.from({ length: 72 }).map((_, i) => {
  const s1 = Math.sin(i * 373.17) * 10000;
  const s2 = Math.cos(i * 591.31) * 10000;
  return {
    id: `scroll-star-${i}`,
    x: Math.abs(s1 - Math.floor(s1)) * CANVAS_WIDTH,
    y: Math.abs(s2 - Math.floor(s2)) * CANVAS_HEIGHT,
    r: 0.6 + (i % 3) * 0.5,
    opacity: 0.15 + (i % 4) * 0.15,
  };
});

export default function SphericalDataBand({
  subjects,
  onOpenReport,
  octantStatsMap,
  onHoverStatusChange,
  onActiveSectorChange,
}: SphericalDataBandProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";
  const scrollSectorConfigs = getScrollSectorConfigs(locale);

  const containerRef = useRef<HTMLDivElement>(null);

  // 当前对准中央主角视线的象区：0 ~ 7 (初始 0 即 Q1-CAL 居中)
  const [activeSectorIndex, setActiveSectorIndex] = useState<number>(0);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [hoveredSubject, setHoveredSubject] = useState<SubjectPoint | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);

  // 物理交互与阻尼平滑系统
  const isInteractingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const targetRotationRef = useRef(0);
  const rotationRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const wheelTimeoutRef = useRef<number | null>(null);

  // 通知外部当前聚焦的主象区
  useEffect(() => {
    const curConf = scrollSectorConfigs[activeSectorIndex];
    if (onActiveSectorChange && curConf) {
      onActiveSectorChange(curConf.code);
    }
  }, [activeSectorIndex, onActiveSectorChange, scrollSectorConfigs]);

  // 象区步进吸附逻辑：切换到指定象区 (每步 45°，极速连滑无顿挫)
  const snapToSector = useCallback((newIndex: number) => {
    const safeIndex = ((newIndex % 8) + 8) % 8;
    setActiveSectorIndex(safeIndex);

    const conf = scrollSectorConfigs[safeIndex];
    if (conf) {
      // 计算距离当前 rotationRef 最近的连续目标角 (避免跳变并保证最短连滑)
      const targetBase = -conf.angle;
      let diff = targetBase - rotationRef.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      targetRotationRef.current = rotationRef.current + diff;
    }
  }, [scrollSectorConfigs]);

  // 物理平滑过渡循环 (阻尼弹簧逼近，支持左右无限无缝连续滚动)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      if (!isInteractingRef.current) {
        const diff = targetRotationRef.current - rotationRef.current;

        if (Math.abs(diff) > 0.05) {
          // 阻尼速率提高至 0.042 (~180ms 迅速干脆到位，消除滞后卡顿感)
          const step = diff * (1 - Math.exp(-0.042 * dt));
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

  // 计算指定角度在当前屏幕画卷上的绝对横坐标 X (支持无限无缝环形映射)
  const getScreenX = useCallback(
    (angleDeg: number) => {
      let diff = ((angleDeg + currentRotation + 180) % 360 + 360) % 360 - 180;
      return CX + (diff / 45) * SECTOR_WIDTH;
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

      // 拖拽平滑映射：每拖拽 SECTOR_WIDTH 像素转动 45°
      const degDelta = (dx / SECTOR_WIDTH) * 45;
      rotationRef.current = (rotationRef.current + degDelta + 360) % 360;
      setCurrentRotation(rotationRef.current);
    };

    const handleWindowPointerUp = () => {
      isInteractingRef.current = false;
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);

      // 松手瞬间：计算最接近的象区并步进吸附
      const curRot = ((-rotationRef.current % 360) + 360) % 360;
      let closestIdx = 0;
      let minDiff = 999;
      SCROLL_SECTOR_CONFIGS.forEach((conf, idx) => {
        let diff = Math.abs(curRot - conf.angle);
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

  // 触控板滑动监听 (支持横向手势超丝滑流动)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const degDelta = (delta / SECTOR_WIDTH) * 38;
      rotationRef.current = (rotationRef.current - degDelta + 360) % 360;
      setCurrentRotation(rotationRef.current);
      isInteractingRef.current = true;

      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
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
        snapToSector(closestIdx);
      }, 70);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [snapToSector, scrollSectorConfigs]);

  // 计算受测者在全景画卷上的二维坐标 (天轨纵深与横向偏向分布)
  const projectedStars = useMemo(() => {
    return subjects
      .map((sub) => {
        const code = sub.quadrant_code || "Q1-CAL";
        const conf = scrollSectorConfigs.find((c) => c.code === code) || scrollSectorConfigs[0];

        // 横向角度：象区中心角 + 认知偏向微扰动 (留在象区画幅内部，左右保留充足安全余量)
        let jitter = 0;
        if (code === "Q6-GAM") jitter = (sub.calibration_bias - 0.25) * 22;
        else if (code === "Q1-CAL") jitter = (((sub.m_ratio ?? 1) - 1) - ((sub.d_star ?? 0.7) - 0.7)) * 14;
        else jitter = (sub.calibration_bias - 0.1) * 16;

        const starAngle = conf.angle + Math.max(-16.5, Math.min(16.5, jitter));
        const x = getScreenX(starAngle);

        // 纵向天轨坐标：高突破与高自洽位于天轨上层 (Y=190)，起步探索位于地轨下层 (Y=490)
        const dStar = sub.d_star ?? 0.5;
        const mRatio = sub.m_ratio ?? 0.8;
        const normMetric = Math.max(0.05, Math.min(0.95, (dStar / 1.0) * 0.55 + (mRatio / 2.0) * 0.45));
        // Y 轴范围：180 (天顶) 到 490 (地渊)
        const y = 490 - normMetric * 310;

        const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

        // 视口距离衰减与聚光度
        const distFromCenter = Math.abs(x - CX);
        const isVisible = distFromCenter <= CANVAS_WIDTH / 2 + 100;
        const focusFactor = Math.max(0.2, 1 - distFromCenter / (CANVAS_WIDTH * 0.7));

        return {
          sub,
          x,
          y,
          colorToken,
          isHighLeverage: (sub.ive ?? 0.5) >= 0.7,
          isVisible,
          focusFactor,
        };
      })
      .filter((item) => item.isVisible);
  }, [subjects, getScreenX]);

  const activeConf = SCROLL_SECTOR_CONFIGS[activeSectorIndex];
  const activeStats = octantStatsMap[activeConf.code] || {
    count: 0,
    percentage: "0%",
    avgDStar: "--",
    avgMRatio: "--",
  };

  // 三道横贯全景画卷的金色周易天轨 Y 坐标 (顶天立地黄金分层)
  // 初爻天轨 (Y=175: 高阶突破态)
  // 二爻人轨 (Y=330: 自省中位态)
  // 上爻地轨 (Y=485: 基底起步态)
  const RAIL_Y_LEVELS = [175, 330, 485];

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative w-full h-full select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing"
      style={{ background: "#050811" }}
    >
      {/* 浩瀚深空背景微星 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
        {SCROLL_BG_STARS.map((s) => (
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

      {/* ============================================================== */}
      {/* 全景无缝认知画卷主 SVG 舞台 (100% 顶天立地铺满内容区)           */}
      {/* ============================================================== */}
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full z-10 overflow-visible"
      >
        <defs>
          {/* 画卷全局天顶与地渊深度暗角渐变 */}
          <linearGradient id="scroll-sky-vignette" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#02040a" stopOpacity="0.85" />
            <stop offset="12%" stopColor="#040817" stopOpacity="0.1" />
            <stop offset="85%" stopColor="#040817" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#02040a" stopOpacity="0.9" />
          </linearGradient>

          {/* 各象区自顶贯底极光能量流柱渐变模板 */}
          {SCROLL_SECTOR_CONFIGS.map((conf) => (
            <radialGradient
              key={`aurora-grad-${conf.code}`}
              id={`aurora-grad-${conf.code}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor={conf.primaryColor} stopOpacity="0.32" />
              <stop offset="40%" stopColor={conf.primaryColor} stopOpacity="0.14" />
              <stop offset="80%" stopColor={conf.primaryColor} stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          ))}

          {/* 细密全息微网格 */}
          <pattern id="scroll-hologrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* 1. 画卷通体微网格底纹 (顶天立地) */}
        <rect
          x="0"
          y="0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="url(#scroll-hologrid)"
          className="pointer-events-none select-none"
        />

        {/* ============================================================== */}
        {/* A. 8 大象区顶天立地全景光幕与东方八卦神威图腾                  */}
        {/* ============================================================== */}
        <g className="select-none">
          {scrollSectorConfigs.map((conf) => {
            const centerX = getScreenX(conf.angle);
            // 视口剔除：距离中心过远则跳过渲染
            if (Math.abs(centerX - CX) > CANVAS_WIDTH * 1.1) return null;

            const isCenter = activeConf.code === conf.code;
            const isHover = hoveredSector === conf.code;
            const distRatio = Math.abs(centerX - CX) / (CANVAS_WIDTH * 0.6);
            const focusOpacity = Math.max(0.18, 1 - distRatio * 0.7);

            return (
              <g
                key={`scroll-panel-${conf.code}`}
                opacity={focusOpacity}
                className="cursor-pointer"
                onClick={() => {
                  const idx = scrollSectorConfigs.findIndex((c) => c.code === conf.code);
                  if (idx >= 0) snapToSector(idx);
                }}
                onMouseEnter={() => {
                  setHoveredSector(conf.code);
                  if (onHoverStatusChange) {
                    onHoverStatusChange(isEn ? `[${conf.name}]: ${conf.desc}` : `【${conf.name}】: ${conf.desc}`);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredSector(null);
                  if (onHoverStatusChange) onHoverStatusChange(null);
                }}
              >
                {/* 1. 顶天立地全景极光能量流柱 (高度 0 -> 650 占满全屏) */}
                <ellipse
                  cx={centerX}
                  cy={CANVAS_HEIGHT / 2}
                  rx={SECTOR_WIDTH * 0.52}
                  ry={CANVAS_HEIGHT * 0.55}
                  fill={`url(#aurora-grad-${conf.code})`}
                  opacity={isCenter ? 1.0 : isHover ? 0.75 : 0.45}
                />

                {/* 2. 居中八卦神威巨幅图腾光印 (震撼全息水印，字号 190px) */}
                <text
                  x={centerX}
                  y={CANVAS_HEIGHT / 2 + 65}
                  textAnchor="middle"
                  fill={conf.primaryColor}
                  opacity={isCenter ? 0.12 : 0.05}
                  fontSize="190"
                  fontWeight="900"
                  fontFamily="system-ui, sans-serif"
                  style={{
                    filter: `drop-shadow(0 0 40px ${conf.primaryColor})`,
                    letterSpacing: "-4px",
                  }}
                  className="pointer-events-none select-none"
                >
                  {conf.baguaChar}
                </text>

                {/* 3. 象区天顶宏伟坐标标牌 (Top Sky Badge) */}
                <g transform={`translate(${centerX}, 80)`}>
                  <rect
                    x="-65"
                    y="-13"
                    width="130"
                    height="24"
                    rx="6"
                    fill="#030712"
                    fillOpacity="0.85"
                    stroke={isCenter ? conf.primaryColor : "rgba(255,255,255,0.18)"}
                    strokeWidth={isCenter ? "1.4" : "1.0"}
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isCenter ? conf.primaryColor : "rgba(255,255,255,0.75)"}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    letterSpacing="1.2"
                  >
                    {conf.code} · {conf.baguaName}
                  </text>
                  {/* 哲学界限说明微标 */}
                  <text
                    x="0"
                    y="22"
                    textAnchor="middle"
                    fill={isCenter ? conf.secondaryColor : "rgba(148, 163, 184, 0.6)"}
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {conf.territory}
                  </text>
                </g>

                {/* 4. 象区底部宏伟大名展签 (Bottom Hero Caption) */}
                <g transform={`translate(${centerX}, 565)`}>
                  {/* 象区中文大号名讳 */}
                  <text
                    x="0"
                    y="-8"
                    textAnchor="middle"
                    fill="none"
                    stroke={isCenter ? conf.primaryColor : "rgba(255, 255, 255, 0.85)"}
                    strokeWidth={isCenter ? "3.2" : "2.2"}
                    strokeLinejoin="round"
                    fontSize={isCenter ? "28" : "23"}
                    fontWeight="900"
                    letterSpacing="2.5"
                  >
                    {conf.name}
                  </text>
                  <text
                    x="0"
                    y="-8"
                    textAnchor="middle"
                    fill="#050811"
                    fontSize={isCenter ? "28" : "23"}
                    fontWeight="900"
                    letterSpacing="2.5"
                  >
                    {conf.name}
                  </text>

                  {/* 副标题与描述 */}
                  <text
                    x="0"
                    y="16"
                    textAnchor="middle"
                    fill={isCenter ? conf.primaryColor : "rgba(148, 163, 184, 0.75)"}
                    fontSize={isCenter ? "11.5" : "10"}
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {conf.subTitle}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* B. 8 根贯天彻地的全息光帷界线 (两象区交界经纬天线)              */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {BOUNDARY_VEILS.map((veil) => {
            const x = getScreenX(veil.angle);
            if (Math.abs(x - CX) > CANVAS_WIDTH * 1.1) return null;

            const distRatio = Math.abs(x - CX) / (CANVAS_WIDTH * 0.6);
            const opacity = Math.max(0.12, 0.85 - distRatio * 0.6);

            return (
              <g key={`veil-beam-${veil.angle}`} opacity={opacity}>
                {/* 贯穿天地的大能量光柱 (高度 0 -> 650) */}
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={CANVAS_HEIGHT}
                  stroke={veil.primary}
                  strokeWidth="5"
                  strokeOpacity="0.22"
                />
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={CANVAS_HEIGHT}
                  stroke={veil.beamCore}
                  strokeWidth="1.8"
                  strokeOpacity="0.85"
                />
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={CANVAS_HEIGHT}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  strokeOpacity="0.95"
                />

                {/* 天顶能量流光微珠 */}
                <circle cx={x} cy={35} r={3.2} fill="#ffffff" />
                <circle cx={x} cy={35} r={6.5} fill="none" stroke={veil.primary} strokeWidth="1.2" />

                {/* 地渊能量流光微珠 */}
                <circle cx={x} cy={CANVAS_HEIGHT - 35} r={3.2} fill="#ffffff" />
                <circle cx={x} cy={CANVAS_HEIGHT - 35} r={6.5} fill="none" stroke={veil.primary} strokeWidth="1.2" />
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* C. 三大横贯全屏的金色周易天轨 (初爻天轨/二爻人轨/上爻地轨)       */}
        {/* ============================================================== */}
        <g className="select-none pointer-events-none">
          {SCROLL_SECTOR_CONFIGS.map((conf) => {
            const centerX = getScreenX(conf.angle);
            if (Math.abs(centerX - CX) > CANVAS_WIDTH * 1.1) return null;

            const isCenter = activeConf.code === conf.code;
            const halfW = SECTOR_WIDTH / 2 - 24; // 两端留出与光帷界线的呼吸间隙

            return (
              <g key={`trigram-rails-${conf.code}`}>
                {conf.lines.map((isYang, levelIdx) => {
                  const y = RAIL_Y_LEVELS[levelIdx];

                  if (isYang) {
                    // 阳爻：横贯本象区的平直强韧全息金轨
                    return (
                      <g key={`rail-yang-${conf.code}-${levelIdx}`}>
                        <line
                          x1={centerX - halfW}
                          y1={y}
                          x2={centerX + halfW}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.6 : 2.4}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.95 : 0.55}
                        />
                        {/* 轨线发光核 */}
                        <line
                          x1={centerX - halfW + 10}
                          y1={y}
                          x2={centerX + halfW - 10}
                          y2={y}
                          stroke="#ffffff"
                          strokeWidth={isCenter ? 1.0 : 0.6}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.8 : 0.5}
                        />
                      </g>
                    );
                  } else {
                    // 阴爻：两截水平轨线，中间留下 72px 具有东方美学的留白断隙
                    const segW = halfW - 36;
                    return (
                      <g key={`rail-yin-${conf.code}-${levelIdx}`}>
                        {/* 左半截 */}
                        <line
                          x1={centerX - halfW}
                          y1={y}
                          x2={centerX - 36}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.6 : 2.4}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.95 : 0.55}
                        />
                        {/* 右半截 */}
                        <line
                          x1={centerX + 36}
                          y1={y}
                          x2={centerX + halfW}
                          y2={y}
                          stroke={isCenter ? conf.primaryColor : conf.secondaryColor}
                          strokeWidth={isCenter ? 3.6 : 2.4}
                          strokeLinecap="round"
                          opacity={isCenter ? 0.95 : 0.55}
                        />
                      </g>
                    );
                  }
                })}
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* D. 受测者群星璀璨作品展陈 (浮游于天轨之间，多重视差光芒)       */}
        {/* ============================================================== */}
        <g>
          {projectedStars.map(({ sub, x, y, colorToken, isHighLeverage, focusFactor }) => {
            const isHovered = hoveredSubject?.id === sub.id;
            const r = (isHovered ? 7.0 : 4.5) * (0.85 + focusFactor * 0.35);

            return (
              <g
                key={`scroll-star-${sub.id}`}
                className="cursor-pointer"
                opacity={Math.max(0.25, focusFactor)}
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
                {/* 扩大点击热区 */}
                <circle cx={x} cy={y} r={16} fill="transparent" />

                {/* 高杠杆外光环 (能量脉冲虚线) */}
                {isHighLeverage && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 3.8}
                    fill="none"
                    stroke={colorToken.borderColor}
                    strokeWidth="1.4"
                    opacity="0.9"
                    strokeDasharray="2.5 2.5"
                  />
                )}

                {/* 实体星宿 */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={colorToken.backgroundColor}
                  stroke={isHovered ? "#ffffff" : colorToken.borderColor}
                  strokeWidth={isHovered ? 2.4 : 1.4}
                  style={{
                    filter: isHovered
                      ? `drop-shadow(0 0 10px ${colorToken.borderColor})`
                      : `drop-shadow(0 0 4px ${colorToken.backgroundColor})`,
                  }}
                  className="transition-transform duration-100"
                />

                {/* 白炽星核 */}
                <circle cx={x} cy={y} r={1.2} fill="#ffffff" opacity="0.95" />
              </g>
            );
          })}
        </g>

        {/* ============================================================== */}
        {/* E. 画卷顶天立地深度暗角 (Sky & Abyss Vignette)                  */}
        {/* ============================================================== */}
        <rect
          x="0"
          y="0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="url(#scroll-sky-vignette)"
          className="pointer-events-none select-none"
        />

        {/* ============================================================== */}
        {/* F. 受测者悬浮评测标牌 (统一标准规范组件)                       */}
        {/* ============================================================== */}
        {hoveredSubject && anchorPos && (
          <SubjectHoverCard
            subject={hoveredSubject}
            anchorPos={anchorPos}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
          />
        )}
      </svg>

      {/* ============================================================== */}
      {/* G. 画卷悬浮极简 HUD 控制胶囊 (左右无缝旋转与步进切档)          */}
      {/* ============================================================== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 py-1.5 z-30 flex items-center justify-between gap-3 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl text-xs select-none">
        {/* 左切换按钮 (逆时针 45°) */}
        <button
          onClick={() => snapToSector(activeSectorIndex - 1)}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
          title={isEn ? "Pan to previous sector (counter-clockwise 45°)" : "平移至上一个画卷象区 (逆时针 45°)"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 正中主象区名片看板 */}
        <div className="flex-1 flex items-center justify-between gap-2.5 overflow-hidden">
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
              · {activeConf.subTitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
            <span className="text-slate-400">
              {isEn ? "Samples: " : "样本: "}
              <strong className="text-slate-200">{activeStats.count}</strong>
              <span className="text-slate-500"> ({activeStats.percentage})</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400">D* {activeStats.avgDStar}</span>
            <span className="text-purple-400">M {activeStats.avgMRatio}</span>
          </div>
        </div>

        {/* 8 象区无限环形指示微圆点 */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 px-1">
          {scrollSectorConfigs.map((conf, idx) => {
            const isActive = idx === activeSectorIndex;
            return (
              <button
                key={`step-dot-${conf.code}`}
                onClick={() => snapToSector(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  isActive ? "w-3 bg-indigo-400 shadow-sm shadow-indigo-500" : "bg-slate-700 hover:bg-slate-500"
                }`}
                title={isEn ? `Jump to ${conf.name} (${conf.code})` : `跳转到 ${conf.name} (${conf.code})`}
              />
            );
          })}
        </div>

        {/* 右切换按钮 (顺时针 45°) */}
        <button
          onClick={() => snapToSector(activeSectorIndex + 1)}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
          title={isEn ? "Pan to next sector (clockwise 45°)" : "平移至下一个画卷象区 (顺时针 45°)"}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
