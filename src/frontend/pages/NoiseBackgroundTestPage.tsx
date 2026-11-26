import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sliders,
  Play,
  Pause,
  Copy,
  Check,
  Download,
  Sparkles,
  Sun,
  Moon,
  Layers,
  ArrowLeft,
  RotateCcw,
  Palette,
  Eye,
  Activity,
  Compass,
} from "lucide-react";
import { SimplexNoise } from "../utils/simplexNoise";

interface PresetConfig {
  name: string;
  grid: number;
  frequency: number;
  seed: number;
  strokeWidth: number;
  color: string;
  isDark: boolean;
  style: "outline" | "filled" | "rings" | "glow";
}

const PRESETS: PresetConfig[] = [
  {
    name: "原版拓扑 (Default)",
    grid: 45,
    frequency: 3,
    seed: 1,
    strokeWidth: 0.8,
    color: "#38bdf8",
    isDark: true,
    style: "outline",
  },
  {
    name: "赛博霓虹 (Cyber Neon)",
    grid: 50,
    frequency: 4.2,
    seed: 42,
    strokeWidth: 1.2,
    color: "#a855f7",
    isDark: true,
    style: "glow",
  },
  {
    name: "暗金流体 (Golden Flow)",
    grid: 40,
    frequency: 2.2,
    seed: 17,
    strokeWidth: 1.0,
    color: "#f59e0b",
    isDark: true,
    style: "rings",
  },
  {
    name: "纸质极简 (Minimal Paper)",
    grid: 36,
    frequency: 2.8,
    seed: 8,
    strokeWidth: 0.9,
    color: "#0f172a",
    isDark: false,
    style: "outline",
  },
  {
    name: "星丛点阵 (Star Cluster)",
    grid: 48,
    frequency: 5.0,
    seed: 88,
    strokeWidth: 0.5,
    color: "#10b981",
    isDark: true,
    style: "filled",
  },
];

interface NoiseBackgroundTestPageProps {
  onNavigate?: (path: string) => void;
}

export const NoiseBackgroundTestPage: React.FC<NoiseBackgroundTestPageProps> = ({ onNavigate }) => {
  // Config states
  const [grid, setGrid] = useState<number>(45);
  const [frequency, setFrequency] = useState<number>(3.0);
  const [seed, setSeed] = useState<number>(1);
  const [strokeWidth, setStrokeWidth] = useState<number>(0.8);
  const [color, setColor] = useState<string>("#38bdf8");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [style, setStyle] = useState<"outline" | "filled" | "rings" | "glow">("outline");
  const [radiusScale, setRadiusScale] = useState<number>(1.0);

  // Animation states
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(0.003);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // View UI states
  const [showDemoUI, setShowDemoUI] = useState<boolean>(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<"svg" | "css" | null>(null);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const loop = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      setTimeOffset((prev) => prev + delta * animSpeed * 0.1);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAnimating, animSpeed]);

  // Noise instance
  const noise = useMemo(() => new SimplexNoise(seed), [seed]);

  // Generate SVG circles
  const circles = useMemo(() => {
    const list: Array<{ cx: number; cy: number; r: number; key: number }> = [];
    const step = 200 / grid;
    const halfStep = 100 / grid;

    for (let i = 0; i < grid * grid; i++) {
      const x = (i % grid) * step - 100;
      const y = Math.floor(i / grid) * step - 100;

      let nVal: number;
      if (isAnimating) {
        nVal = noise.noise3D([(x * frequency) / 200, (y * frequency) / 200, timeOffset]);
      } else {
        nVal = noise.noise2D([(x * frequency) / 200, (y * frequency) / 200]);
      }

      const rRatio = Math.max(0, Math.min(1, 0.5 + 0.5 * nVal));
      const radius = rRatio * halfStep * radiusScale;

      if (radius > 0.1) {
        list.push({
          cx: x + halfStep,
          cy: y + halfStep,
          r: radius,
          key: i,
        });
      }
    }
    return list;
  }, [noise, grid, frequency, radiusScale, isAnimating, timeOffset]);

  // Build raw SVG string for export
  const buildSvgString = useCallback(() => {
    const filterDef =
      style === "glow"
        ? `<defs><filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
        : "";

    const circleElements = circles
      .map(({ cx, cy, r }) => {
        if (style === "filled") {
          return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}" fill-opacity="0.85" />`;
        }
        if (style === "rings") {
          return `<g><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" /><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(r * 0.4).toFixed(2)}" fill="${color}" fill-opacity="0.6" /></g>`;
        }
        return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" ${style === "glow" ? 'filter="url(#glow)"' : ""} />`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="100%" height="100%">${filterDef}${circleElements}</svg>`;
  }, [circles, style, color, strokeWidth]);

  // Copy SVG code
  const handleCopySvg = async () => {
    const svgCode = buildSvgString();
    await navigator.clipboard.writeText(svgCode);
    setCopiedType("svg");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy CSS Data URI
  const handleCopyCss = async () => {
    const svgCode = buildSvgString();
    const encoded = encodeURIComponent(svgCode);
    const cssSnippet = `background-image: url("data:image/svg+xml,${encoded}");\nbackground-size: cover;\nbackground-position: center;`;
    await navigator.clipboard.writeText(cssSnippet);
    setCopiedType("css");
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Download .svg file
  const handleDownloadSvg = () => {
    const svgCode = buildSvgString();
    const blob = new Blob([svgCode], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simplex-noise-bg-grid${grid}-seed${seed}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Apply preset
  const applyPreset = (preset: PresetConfig) => {
    setGrid(preset.grid);
    setFrequency(preset.frequency);
    setSeed(preset.seed);
    setStrokeWidth(preset.strokeWidth);
    setColor(preset.color);
    setIsDark(preset.isDark);
    setStyle(preset.style);
  };

  const bgColor = isDark ? "#060810" : "#f8fafc";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const cardBg = isDark ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.12)";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden select-none transition-colors duration-500 font-sans"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* ================= BACKGROUND SVG CANVAS ================= */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg
          viewBox="-100 -100 200 200"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          {style === "glow" && (
            <defs>
              <filter id="preview-glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}
          {circles.map(({ cx, cy, r, key }) => {
            if (style === "filled") {
              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity={0.8}
                />
              );
            }
            if (style === "rings") {
              return (
                <g key={key}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.4}
                    fill={color}
                    fillOpacity={0.6}
                  />
                </g>
              );
            }
            return (
              <circle
                key={key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                filter={style === "glow" ? "url(#preview-glow)" : undefined}
              />
            );
          })}
        </svg>
      </div>

      {/* ================= DEMO PAGE UI OVERLAY ================= */}
      {showDemoUI && (
        <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 sm:p-12 pointer-events-auto">
          {/* Header */}
          <header className="flex items-center justify-between max-w-6xl w-full mx-auto backdrop-blur-md px-6 py-4 rounded-2xl border shadow-lg"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate("/");
                  else window.location.href = "/";
                }}
                className="p-2 rounded-xl border hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: cardBorder }}
                title="返回首页"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-sky-400 animate-spin-slow" />
                <span className="font-bold tracking-tight text-lg">Simplex Noise SVG Background</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Grid: {grid}x{grid} ({circles.length} circles)
              </span>
            </div>
          </header>

          {/* Main Hero Card Demonstration */}
          <main className="max-w-4xl w-full mx-auto my-auto text-center py-12 px-6">
            <div
              className="backdrop-blur-xl p-8 sm:p-12 rounded-3xl border shadow-2xl relative overflow-hidden text-left sm:text-center"
              style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-400/30 text-sky-400">
                <Sparkles className="w-4 h-4" />
                <span>Simplex 2D/3D Vector Topology Matrix</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                优雅的有机数学背景
              </h1>
              <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
                原代码完全可以无缝转化为生产级 SVG 背景。右下角控制台可即时调整密度、频率、随机种子及流动动画，并一键复制 SVG 或 CSS Data URL。
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/25 transition cursor-pointer flex items-center gap-2"
                >
                  {copiedType === "svg" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedType === "svg" ? "已复制 SVG 源码" : "复制 SVG 源码"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCss}
                  className="px-6 py-3 rounded-xl font-bold text-sm border hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
                  style={{ borderColor: cardBorder }}
                >
                  {copiedType === "css" ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  {copiedType === "css" ? "已复制 CSS 代码" : "复制 CSS 背景"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="px-5 py-3 rounded-xl font-bold text-sm border hover:bg-white/10 transition cursor-pointer flex items-center gap-2"
                  style={{ borderColor: cardBorder }}
                >
                  <Download className="w-4 h-4" />
                  下载 .svg
                </button>
              </div>

              {/* Mini Stats Bar */}
              <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t" style={{ borderColor: cardBorder }}>
                <div>
                  <div className="text-2xl font-bold font-mono text-sky-400">{grid}×{grid}</div>
                  <div className="text-xs opacity-60 mt-1">采样网格</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-amber-400">{frequency}</div>
                  <div className="text-xs opacity-60 mt-1">噪声频度</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">{circles.length}</div>
                  <div className="text-xs opacity-60 mt-1">矢量图元数</div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer note */}
          <footer className="text-center text-xs opacity-50 max-w-md mx-auto">
            Algorithm based on Reinder Nijhoff's Simplex Noise (2020) & Stefan Gustavson's paper.
          </footer>
        </div>
      )}

      {/* ================= FLOATING CONTROL PANEL ================= */}
      <div
        className={`fixed z-30 bottom-6 right-6 transition-all duration-300 pointer-events-auto ${
          isPanelCollapsed ? "w-14 h-14" : "w-[360px] sm:w-[400px] max-h-[85vh] overflow-y-auto"
        }`}
      >
        {isPanelCollapsed ? (
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(false)}
            className="w-14 h-14 rounded-2xl bg-sky-500 hover:bg-sky-400 text-black flex items-center justify-center shadow-2xl cursor-pointer transition transform hover:scale-105"
            title="展开调参面板"
          >
            <Sliders className="w-6 h-6" />
          </button>
        ) : (
          <div
            className="backdrop-blur-2xl rounded-3xl p-5 border shadow-2xl space-y-4"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-sm">参数实时调校</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: cardBorder }}
                  title="切换黑白底色"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDemoUI(!showDemoUI)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: cardBorder }}
                  title={showDemoUI ? "隐藏页面卡片（全屏纯看背景）" : "显示页面卡片实景"}
                >
                  <Eye className={`w-4 h-4 ${showDemoUI ? "text-sky-400" : "opacity-40"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer text-xs"
                  style={{ borderColor: cardBorder }}
                  title="收起面板"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="text-xs font-semibold opacity-70 mb-2 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                <span>预设风格</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border text-left truncate transition hover:opacity-90 cursor-pointer"
                    style={{
                      borderColor: p.color === color ? p.color : cardBorder,
                      backgroundColor: p.color === color ? `${p.color}20` : "transparent",
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 text-xs">
              {/* Grid */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>网格密度 (grid)</span>
                  <span className="font-mono">{grid}</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="80"
                  step="1"
                  value={grid}
                  onChange={(e) => setGrid(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Frequency */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>噪声频度 (frequency)</span>
                  <span className="font-mono">{frequency.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.1"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Seed */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>随机种子 (seed)</span>
                  <span className="font-mono">{seed}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Stroke Width */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>线条粗细 (strokeWidth)</span>
                  <span className="font-mono">{strokeWidth.toFixed(2)}px</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Radius Scale */}
              <div>
                <div className="flex justify-between mb-1 opacity-80">
                  <span>圆半径缩放 (scale)</span>
                  <span className="font-mono">{radiusScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.5"
                  step="0.05"
                  value={radiusScale}
                  onChange={(e) => setRadiusScale(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Style Selector */}
            <div>
              <div className="text-xs font-semibold opacity-70 mb-1.5">图元样式</div>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {(["outline", "filled", "rings", "glow"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`py-1.5 rounded-lg border text-center capitalize transition cursor-pointer ${
                      style === s ? "bg-sky-500/20 text-sky-400 border-sky-400" : "border-white/10"
                    }`}
                  >
                    {s === "outline" ? "线框" : s === "filled" ? "实心" : s === "rings" ? "同心环" : "发光"}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="opacity-70">图元主色</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] opacity-80 uppercase">{color}</span>
              </div>
            </div>

            {/* Dynamic 3D Noise Animation Switch */}
            <div className="p-3 rounded-2xl border flex items-center justify-between" style={{ borderColor: cardBorder }}>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isAnimating ? "text-emerald-400 animate-pulse" : "opacity-50"}`} />
                <div className="text-xs">
                  <div className="font-semibold">3D 动态流动</div>
                  <div className="text-[10px] opacity-60">使用 noise3D 随时间连续演变</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnimating(!isAnimating)}
                className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  isAnimating ? "bg-emerald-500/20 text-emerald-400 border-emerald-400" : "hover:bg-white/10"
                }`}
                style={{ borderColor: isAnimating ? undefined : cardBorder }}
              >
                {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default NoiseBackgroundTestPage;
