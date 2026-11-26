import React, { useMemo, useState, useId } from "react";
import { Download, Copy, Check, Eye, Sparkles, Compass } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  AestheticSessionData,
  ConstellationNode,
  computeAestheticParameters,
  generateAestheticSvg,
  reportToAestheticSession,
} from "../../utils/aestheticEngine";

interface CognitiveManifoldSigilProps {
  /** Pass either a FinalAssessmentReport OR an AestheticSessionData */
  report?: any;
  session?: AestheticSessionData;
  isEn?: boolean;
  compact?: boolean;
  className?: string;
}

export const CognitiveManifoldSigil: React.FC<CognitiveManifoldSigilProps> = ({
  report,
  session: propSession,
  isEn = false,
  compact = false,
  className = "",
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? "dark" : "light";
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "");

  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [showHud, setShowHud] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const session = useMemo<AestheticSessionData>(() => {
    if (propSession) return propSession;
    return reportToAestheticSession(report);
  }, [propSession, report]);

  const hasExactTrials = Boolean(session.trials && session.trials.length > 0);
  const size = 640;
  const cx = size / 2;
  const cy = size / 2;

  const p = useMemo(
    () =>
      computeAestheticParameters(session, size, size, {
        theme,
        surface: "artifact",
        showHud,
      }),
    [session, theme, showHud]
  );

  const ringRadii = [size * 0.14, size * 0.23, size * 0.32, size * 0.41];
  const outerRingR = ringRadii[3];
  const ringStrokeOp = isDark ? 0.16 : 0.14;

  const tickMarks = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const ang = (i * Math.PI * 2) / 36;
      const isMajor = i % 3 === 0;
      const rIn = outerRingR - (isMajor ? size * 0.012 : size * 0.006);
      const rOut = outerRingR + (isMajor ? size * 0.005 : 0);
      return {
        x1: cx + rIn * Math.cos(ang),
        y1: cy + rIn * Math.sin(ang),
        x2: cx + rOut * Math.cos(ang),
        y2: cy + rOut * Math.sin(ang),
        isMajor,
      };
    });
  }, [cx, cy, outerRingR]);

  const handleCopySvg = async () => {
    const svg = generateAestheticSvg(session, 1000, {
      theme,
      surface: "artifact",
      showHud,
    });
    try {
      await navigator.clipboard.writeText(svg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadSvg = () => {
    const svg = generateAestheticSvg(session, 1000, {
      theme,
      surface: "artifact",
      showHud,
    });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cognitive-manifold-${session.id || "sigil"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeNode = hoveredNode || p.nodes[p.nodes.length - 1] || null;

  return (
    <section
      aria-label={isEn ? "Computational Cognitive Manifold Sigil" : "1-of-1 专属认知流形印记"}
      className={`rounded-2xl p-5 sm:p-6 bg-white/95 dark:bg-[#0E0E16]/95 backdrop-blur-md border border-stone-900/12 dark:border-white/12 shadow-[0_12px_36px_-14px_rgba(28,25,23,0.12)] dark:shadow-[0_16px_44px_-16px_rgba(0,0,0,0.7)] space-y-5 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-900/8 dark:border-white/10 pb-3.5">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00] dark:fill-[#CCFF00]/20 shrink-0" />
            <h3 className="text-[15px] sm:text-base font-black text-stone-950 dark:text-white tracking-tight whitespace-nowrap">
              {isEn ? "1-of-1 Cognitive Manifold" : "专属认知流形图腾 · 1-of-1"}
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 font-medium leading-relaxed">
            {hasExactTrials
              ? isEn
                ? `Synthesized from your ${p.totalTrials} trial decisions, confidence pulses, and M-Ratio harmonics.`
                : `由本次 ${p.totalTrials} 题难度爬坡、置信波动与 M-Ratio 谐波连续计算生成。`
              : isEn
              ? "Reconstructed from your macroscopic metacognitive metrics and calibration signature."
              : "基于您的宏观元认知参数与校准偏移连续重构生成的认知拓扑指纹。"}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowHud((v) => !v)}
            className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-stone-100/90 dark:bg-white/[0.06] border border-stone-900/10 dark:border-white/12 text-[11px] font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:border-[#CCFF00]/60 transition cursor-pointer flex items-center gap-1"
            title={isEn ? "Toggle Coordinate HUD" : "切换坐标刻度标注"}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showHud ? (isEn ? "HUD" : "刻度") : (isEn ? "Clean" : "纯净")}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySvg}
            className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-stone-100/90 dark:bg-white/[0.06] border border-stone-900/10 dark:border-white/12 text-[11px] font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-200/70 dark:hover:border-[#CCFF00]/60 transition cursor-pointer flex items-center gap-1"
            title={isEn ? "Copy SVG Source" : "复制矢量 SVG"}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#CCFF00]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isEn ? "Copied" : "已复制") : "SVG"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="min-h-[34px] px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-[#CCFF00] dark:hover:brightness-110 text-white dark:text-[#08080C] text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? "Export" : "收藏原图"}</span>
          </button>
        </div>
      </div>

      {/* Main Split: Interactive Manifold SVG + Trial Telemetry / Legend */}
      <div className={`grid grid-cols-1 ${compact ? "" : "md:grid-cols-12"} gap-5 items-center`}>
        {/* Interactive Generative SVG Canvas */}
        <div className={`${compact ? "" : "md:col-span-7"} w-full`}>
          <div className="relative aspect-square w-full max-w-[420px] mx-auto rounded-2xl overflow-hidden border border-stone-900/12 dark:border-white/12">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full block select-none"
              onMouseLeave={() => setHoveredNode(null)}
            >
              <defs>
                <linearGradient id={`sigil-bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.bgGradStart} />
                  <stop offset="52%" stopColor={p.bgGradMid} />
                  <stop offset="100%" stopColor={p.bgGradEnd} />
                </linearGradient>
                <radialGradient id={`sigil-aura-${uid}`} cx="50%" cy="48%" r="48%">
                  <stop
                    offset="0%"
                    stopColor={p.auraColor}
                    stopOpacity={isDark ? 0.28 : 0.22}
                  />
                  <stop
                    offset="58%"
                    stopColor={p.secondaryColor}
                    stopOpacity={0.07}
                  />
                  <stop offset="100%" stopColor={p.bgGradStart} stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`sigil-spine-${uid}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.primaryColor} stopOpacity={isDark ? 0.34 : 0.24} />
                  <stop offset="100%" stopColor={p.secondaryColor} stopOpacity={isDark ? 0.1 : 0.08} />
                </linearGradient>
                <filter id={`sigil-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background & Radial Aura */}
              <rect width={size} height={size} fill={`url(#sigil-bg-${uid})`} />
              <circle cx={cx} cy={cy} r={size * 0.48} fill={`url(#sigil-aura-${uid})`} />

              {/* Harmonic Topographic Waves */}
              <g>
                {p.waveLayers.map((w, idx) => (
                  <React.Fragment key={`w-${idx}`}>
                    <path d={w.d} fill={w.fill} opacity={w.opacity} />
                    <path
                      d={w.strokeD}
                      fill="none"
                      stroke={w.stroke}
                      strokeWidth={1.05}
                      opacity={w.opacity * 1.45}
                    />
                  </React.Fragment>
                ))}
              </g>

              {/* Astrolabe Reticle */}
              <g fill="none">
                <line
                  x1={cx - outerRingR - size * 0.025}
                  y1={cy}
                  x2={cx + outerRingR + size * 0.025}
                  y2={cy}
                  stroke={p.mutedInkColor}
                  strokeWidth={0.7}
                  opacity={ringStrokeOp}
                />
                <line
                  x1={cx}
                  y1={cy - outerRingR - size * 0.025}
                  x2={cx}
                  y2={cy + outerRingR + size * 0.025}
                  stroke={p.mutedInkColor}
                  strokeWidth={0.7}
                  opacity={ringStrokeOp}
                />
                {ringRadii.map((r, i) => (
                  <circle
                    key={`r-${i}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={p.mutedInkColor}
                    strokeWidth={i === 3 ? 1 : 0.75}
                    strokeDasharray={i % 2 === 1 ? "3 4" : undefined}
                    opacity={ringStrokeOp * (i === 3 ? 1.4 : 1)}
                  />
                ))}
                {tickMarks.map((tk, idx) => (
                  <line
                    key={`tk-${idx}`}
                    x1={tk.x1}
                    y1={tk.y1}
                    x2={tk.x2}
                    y2={tk.y2}
                    stroke={p.mutedInkColor}
                    strokeWidth={tk.isMajor ? 1.1 : 0.6}
                    opacity={tk.isMajor ? ringStrokeOp * 1.8 : ringStrokeOp}
                  />
                ))}
              </g>

              {/* Harmonic Resonance Filaments */}
              <g>
                {p.resonancePaths.map((d, idx) => (
                  <path
                    key={`res-${idx}`}
                    d={d}
                    fill="none"
                    stroke={idx % 2 === 0 ? p.primaryColor : p.secondaryColor}
                    strokeWidth={1.0}
                    opacity={Math.max(0.06, (isDark ? 0.28 : 0.24) - idx * 0.05)}
                  />
                ))}
              </g>

              {/* Baseline Difficulty Shell */}
              <path
                d={p.baselinePath}
                fill="none"
                stroke={p.mutedInkColor}
                strokeWidth={0.9}
                strokeDasharray="3 4"
                opacity={0.28}
              />

              {/* Smooth Cubic-Bézier Cognitive Envelope */}
              <path
                d={p.spinePath}
                fill={`url(#sigil-spine-${uid})`}
                stroke={p.primaryColor}
                strokeWidth={1.85}
                opacity={0.9}
                filter={isDark ? `url(#sigil-glow-${uid})` : undefined}
              />

              {/* Ambient Stars */}
              <g>
                {p.ambientStars.map((st, idx) => (
                  <circle
                    key={`st-${idx}`}
                    cx={st.x}
                    cy={st.y}
                    r={st.r}
                    fill={st.color}
                    opacity={st.opacity}
                  />
                ))}
              </g>

              {/* Active Hovered Ray Highlight */}
              {hoveredNode && (
                <line
                  x1={cx}
                  y1={cy}
                  x2={hoveredNode.outerX}
                  y2={hoveredNode.outerY}
                  stroke={p.hintColor}
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
              )}

              {/* Interactive Trial Constellation Nodes */}
              <g>
                {p.nodes.map((node) => {
                  const isHovered = hoveredNode?.trialIndex === node.trialIndex;
                  const strokeColor = node.isCorrect ? p.primaryColor : p.dangerColor;
                  const fillColor = node.isCorrect ? p.secondaryColor : p.dangerColor;

                  return (
                    <g
                      key={node.trialIndex}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node)}
                      onClick={() => setHoveredNode(node)}
                    >
                      {/* Invisible generous touch/hover hit target */}
                      <circle cx={node.x} cy={node.y} r={14} fill="transparent" />

                      {/* Reaction Time Whisker */}
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.outerX}
                        y2={node.outerY}
                        stroke={strokeColor}
                        strokeWidth={isHovered ? 1.8 : 1}
                        strokeLinecap="round"
                        opacity={node.isWarmup ? 0.25 : 0.52}
                      />

                      {/* Confidence Aura */}
                      {!node.isWarmup && node.isCorrect && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r * (isHovered ? 2.8 : 2.1)}
                          fill={fillColor}
                          opacity={node.opacity * (isDark ? 0.24 : 0.17)}
                        />
                      )}

                      {/* Reversal / Pivot Halo */}
                      {node.isReversal && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r + 3.2}
                          fill="none"
                          stroke={p.hintColor}
                          strokeWidth={1.1}
                          strokeDasharray="2 2"
                          opacity={0.85}
                        />
                      )}

                      {/* Core Node */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? node.r * 1.35 : node.r}
                        fill={
                          node.isWarmup
                            ? "none"
                            : node.isCorrect
                            ? fillColor
                            : isDark
                            ? "#090B12"
                            : "#FFFDF8"
                        }
                        stroke={isHovered ? "#FFFFFF" : strokeColor}
                        strokeWidth={isHovered ? 2 : node.isWarmup ? 1.1 : node.isCorrect ? 1.5 : 1.9}
                        opacity={node.opacity}
                      />

                      {/* Hint Diamond Marker */}
                      {node.hintTaken && (
                        <polygon
                          points={`${node.outerX},${node.outerY - 3} ${node.outerX + 3},${node.outerY} ${node.outerX},${node.outerY + 3} ${node.outerX - 3},${node.outerY}`}
                          fill={p.hintColor}
                          opacity={0.95}
                        />
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Center Origin */}
              <circle cx={cx} cy={cy} r={4} fill={p.primaryColor} opacity={0.85} />
              <circle cx={cx} cy={cy} r={10} fill="none" stroke={p.secondaryColor} strokeWidth={0.9} opacity={0.45} />

              {/* Coordinate HUD */}
              {showHud && (
                <g
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  fill={p.mutedInkColor}
                >
                  <text
                    x={size * 0.055}
                    y={size * 0.075}
                    fontSize={11}
                    fontWeight={700}
                    letterSpacing={1.4}
                    opacity={0.7}
                  >
                    MANIFOLD // {session.quadrant_code || "SIGIL"}
                  </text>
                  <text
                    x={size * 0.945}
                    y={size * 0.075}
                    fontSize={11}
                    fontWeight={700}
                    textAnchor="end"
                    opacity={0.7}
                  >
                    N={p.totalTrials} · M={session.metrics.m_ratio.toFixed(2)}
                  </text>
                  <text
                    x={size * 0.055}
                    y={size * 0.945}
                    fontSize={10}
                    opacity={0.62}
                  >
                    d&apos; {session.metrics.d_prime.toFixed(2)} · BIAS{" "}
                    {session.metrics.calibration_bias >= 0 ? "+" : ""}
                    {session.metrics.calibration_bias.toFixed(2)}
                  </text>
                  <text
                    x={size * 0.945}
                    y={size * 0.945}
                    fontSize={10}
                    textAnchor="end"
                    opacity={0.62}
                  >
                    HUE {Math.round(p.baseHue)}° · HARMONIC K={p.harmonicSymmetry}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Right / Bottom Column: Live Trial Inspector + Visual Grammar (Flattened) */}
        <div className={`${compact ? "" : "md:col-span-5"} space-y-4 text-left`}>
          {/* Interactive Trial Readout */}
          <div className="p-3.5 rounded-2xl bg-stone-50/90 dark:bg-white/[0.04] border border-stone-900/8 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wide text-stone-700 dark:text-[#CCFF00] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {hoveredNode
                    ? isEn
                      ? `Trial #${hoveredNode.trialIndex} Telemetry`
                      : `第 ${hoveredNode.trialIndex} 题微观星标`
                    : isEn
                    ? "Hover / Tap Any Star Node"
                    : "悬停或点击星图节点查看单题"}
                </span>
              </span>
              {activeNode && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeNode.isCorrect
                      ? "bg-emerald-100 text-emerald-900 dark:bg-[#CCFF00]/20 dark:text-[#CCFF00]"
                      : "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300"
                  }`}
                >
                  {activeNode.isCorrect
                    ? isEn
                      ? "Correct"
                      : "命中"
                    : isEn
                    ? "Missed"
                    : "偏航"}
                </span>
              )}
            </div>

            {activeNode && (
              <div className="grid grid-cols-3 divide-x divide-stone-900/10 dark:divide-white/10 font-mono text-[11px] tabular-nums pt-1">
                <div className="pr-2">
                  <div className="text-[10px] text-stone-500 dark:text-slate-400">
                    {isEn ? "Difficulty" : "题目难度"}
                  </div>
                  <div className="text-sm font-black text-stone-900 dark:text-white">
                    {(activeNode.difficulty * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="px-2.5">
                  <div className="text-[10px] text-stone-500 dark:text-slate-400">
                    {isEn ? "Confidence" : "主观置信"}
                  </div>
                  <div className="text-sm font-black text-stone-900 dark:text-[#CCFF00]">
                    {(activeNode.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="pl-2.5">
                  <div className="text-[10px] text-stone-500 dark:text-slate-400">
                    {isEn ? "Time" : "思考耗时"}
                  </div>
                  <div className="text-sm font-black text-stone-900 dark:text-sky-300">
                    {(activeNode.duration_ms / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aesthetic Encoding Grammar (Borderless flat typography) */}
          <div className="px-1 space-y-2 text-xs">
            <div className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-slate-400">
              {isEn ? "Visual Encoding Grammar" : "计算美学编码规则"}
            </div>
            <ul className="space-y-1.5 text-[11px] text-stone-600 dark:text-slate-300 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: p.primaryColor }}
                />
                <span>
                  <strong className="text-stone-900 dark:text-white">
                    {isEn ? "Hue" : "色相"} ({Math.round(p.baseHue)}°)
                  </strong>
                  ：{isEn ? "Bias spectrum (Emerald = balanced, Amber = bold, Indigo = prudent)." : "校准偏差映射（青绿=平衡，琥珀=果敢，靛蓝=审慎）。"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 border-2 border-stone-700 dark:border-[#CCFF00]" />
                <span>
                  <strong className="text-stone-900 dark:text-white">
                    {isEn ? "Harmonics" : "谐波"} (K={p.harmonicSymmetry})
                  </strong>
                  ：{isEn ? "M-Ratio sculpts resonance petals & topographic wave calm." : "M-Ratio 决定共振花瓣对称阶数与背景等高线流势。"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rotate-45 mt-1 shrink-0 bg-amber-500 dark:bg-yellow-400" />
                <span>
                  <strong className="text-stone-900 dark:text-white">
                    {isEn ? "Nodes" : "星标"}
                  </strong>
                  ：{isEn ? "Filled = hit, hollow ring = miss; outer whiskers encode RT; diamonds = hints." : "实心=命中，空环=偏航；外芒线=思考耗时；菱星=求助。"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CognitiveManifoldSigil;
