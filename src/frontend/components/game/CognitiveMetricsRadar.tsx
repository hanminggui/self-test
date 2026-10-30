import React from "react";
import { Target, Zap, TrendingUp, ShieldCheck, Activity } from "lucide-react";

export interface CognitiveMetricsRadarProps {
  metrics: {
    d_prime?: number;
    m_ratio?: number;
    calibration_bias?: number;
    first_order_accuracy?: number;
    second_order_accuracy?: number;
    [key: string]: any;
  };
  locale?: string;
  className?: string;
}

export const CognitiveMetricsRadar: React.FC<CognitiveMetricsRadarProps> = ({
  metrics,
  locale = "zh-CN",
  className = "",
}) => {
  const isEn = String(locale).toLowerCase().startsWith("en");

  const dPrime = metrics?.d_prime ?? 1.5;
  const mRatio = metrics?.m_ratio ?? 0.85;
  const bias = metrics?.calibration_bias ?? 0.05;
  const accuracy = metrics?.first_order_accuracy ?? 0.75;

  // Normalized scores 0 - 100%
  const scoreAcuity = Math.round(Math.min(100, Math.max(18, (dPrime / 2.6) * 100)));
  const scoreMetacog = Math.round(Math.min(100, Math.max(18, (mRatio / 1.35) * 100)));
  const scoreCalibration = Math.round(Math.max(18, Math.min(100, (1 - Math.min(1, Math.abs(bias) * 1.6)) * 100)));
  const scoreAccuracy = Math.round(Math.min(100, Math.max(18, accuracy * 100)));

  // 4 Axes Coordinates on a 320x320 SVG Canvas
  const CX = 160;
  const CY = 160;
  const MAX_R = 105;

  // Top: Calibration Balance
  const pTop = {
    x: CX,
    y: CY - (scoreCalibration / 100) * MAX_R,
  };
  // Right: Task Acuity (d')
  const pRight = {
    x: CX + (scoreAcuity / 100) * MAX_R,
    y: CY,
  };
  // Bottom: Accuracy
  const pBottom = {
    x: CX,
    y: CY + (scoreAccuracy / 100) * MAX_R,
  };
  // Left: Metacognitive Sensitivity (M-ratio)
  const pLeft = {
    x: CX - (scoreMetacog / 100) * MAX_R,
    y: CY,
  };

  const polygonPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div
      className={`rounded-[28px] p-6 sm:p-7 bg-white dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] space-y-5 ${className}`}
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-stone-900/10 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500 fill-amber-400 dark:text-[#CCFF00]" />
          <h3 className="text-base font-black text-stone-950 dark:text-white">
            {isEn ? "4D Cognitive Radar Chart" : "四维认知指标雷达图"}
          </h3>
        </div>
        <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] text-stone-950 dark:text-[#CCFF00] shadow-[0_1.5px_0_#1c1917] dark:shadow-none self-start sm:self-center">
          {isEn ? "Psychometric Calibration" : "高阶元认知量化校准"}
        </span>
      </div>

      {/* SVG Radar Visual Canvas */}
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 select-none">
          <svg viewBox="0 0 320 320" className="w-full h-full overflow-visible">
            {/* Concentric Grid Diamonds */}
            {rings.map((ring) => {
              const r = ring * MAX_R;
              return (
                <polygon
                  key={ring}
                  points={`${CX},${CY - r} ${CX + r},${CY} ${CX},${CY + r} ${CX - r},${CY}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={ring === 1.0 ? 1.8 : 1.2}
                  strokeDasharray={ring === 1.0 ? "none" : "3,3"}
                  className="text-stone-900/15 dark:text-white/15"
                />
              );
            })}

            {/* Axis Spokes */}
            <line
              x1={CX}
              y1={CY - MAX_R}
              x2={CX}
              y2={CY + MAX_R}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-stone-900/20 dark:text-white/20"
            />
            <line
              x1={CX - MAX_R}
              y1={CY}
              x2={CX + MAX_R}
              y2={CY}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-stone-900/20 dark:text-white/20"
            />

            {/* Radar Polygon Shape */}
            <polygon
              points={polygonPoints}
              fill="#FBBF24"
              fillOpacity={0.45}
              stroke="#1c1917"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="dark:fill-[#CCFF00] dark:stroke-[#CCFF00]"
            />

            {/* Vertex Nodes */}
            {[pTop, pRight, pBottom, pLeft].map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="5.5"
                fill={i % 2 === 0 ? "#FB7185" : "#38BDF8"}
                stroke="#1c1917"
                strokeWidth="2"
              />
            ))}

            {/* In-Chart Axis Labels */}
            <text
              x={CX}
              y={CY - MAX_R - 10}
              textAnchor="middle"
              className="fill-stone-950 dark:fill-white font-black text-[11px]"
            >
              {isEn ? "Calibration" : "自省自洽"} ({scoreCalibration}%)
            </text>
            <text
              x={CX + MAX_R + 10}
              y={CY + 4}
              textAnchor="start"
              className="fill-stone-950 dark:fill-white font-black text-[11px]"
            >
              {isEn ? "Acuity d'" : "辨别力 d'"} ({dPrime.toFixed(2)})
            </text>
            <text
              x={CX}
              y={CY + MAX_R + 20}
              textAnchor="middle"
              className="fill-stone-950 dark:fill-white font-black text-[11px]"
            >
              {isEn ? "Accuracy" : "任务胜率"} ({scoreAccuracy}%)
            </text>
            <text
              x={CX - MAX_R - 10}
              y={CY + 4}
              textAnchor="end"
              className="fill-stone-950 dark:fill-white font-black text-[11px]"
            >
              {isEn ? "M-Ratio" : "元认知 M"} ({mRatio.toFixed(2)})
            </text>
          </svg>
        </div>
      </div>

      {/* 4 Quantitative Breakdown Indicator Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-sky-700 dark:text-cyan-400" />
            <span>{isEn ? "Acuity d'" : "任务辨别力 d'"}</span>
          </div>
          <div className="text-lg font-black font-mono text-sky-800 dark:text-cyan-300">
            {dPrime.toFixed(2)}
          </div>
          <p className="text-[9.5px] text-stone-600 dark:text-slate-500 font-bold">
            {isEn ? "Perceptual strength" : "感知敏锐度"}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 dark:text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-[#CCFF00]" />
            <span>{isEn ? "Metacog M-Ratio" : "元认知效能 M"}</span>
          </div>
          <div className="text-lg font-black font-mono text-emerald-800 dark:text-[#CCFF00]">
            {mRatio.toFixed(2)}
          </div>
          <p className="text-[9.5px] text-stone-600 dark:text-slate-500 font-bold">
            {isEn ? "Type-2 self-insight" : "二阶自知杠杆"}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>{isEn ? "Calibration Bias" : "自洽偏向 Bias"}</span>
          </div>
          <div className="text-lg font-black font-mono text-amber-900 dark:text-amber-300">
            {bias >= 0 ? `+${bias.toFixed(2)}` : bias.toFixed(2)}
          </div>
          <p className="text-[9.5px] text-stone-600 dark:text-slate-500 font-bold">
            {Math.abs(bias) < 0.1 ? (isEn ? "Balanced" : "自洽平和") : bias > 0 ? (isEn ? "Confident" : "进取下注") : (isEn ? "Cautious" : "审慎防守")}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 dark:text-slate-400">
            <Target className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
            <span>{isEn ? "Accuracy" : "综合准确率"}</span>
          </div>
          <div className="text-lg font-black font-mono text-rose-900 dark:text-rose-300">
            {Math.round(accuracy * 100)}%
          </div>
          <p className="text-[9.5px] text-stone-600 dark:text-slate-500 font-bold">
            {isEn ? "Trial convergence" : "阶梯收敛准确率"}
          </p>
        </div>
      </div>
    </div>
  );
};
