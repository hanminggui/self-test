import React from "react";
import { Info } from "lucide-react";
import { SubjectPoint, ScatterData, SplitLineType } from "../../../types/admin";
import { computeMultivariateColor } from "../../../utils/manifoldUtils";
import { getOctantSectorConfigs } from "../../../constants/adminConstants";
import { useLocale } from "../../../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../../../backend/archetype_matrix";

interface RectangularPhaseViewProps {
  subjects: SubjectPoint[];
  scatterData: ScatterData | null;
  splitLine: SplitLineType;
  onOpenReport: (sessionId: string) => void;
  hoveredSubject: SubjectPoint | null;
  setHoveredSubject: (sub: SubjectPoint | null) => void;
  onActiveSectorChange?: (octantCode: string) => void;
}

export default function RectangularPhaseView({
  subjects,
  scatterData,
  splitLine,
  onOpenReport,
  hoveredSubject,
  setHoveredSubject,
  onActiveSectorChange,
}: RectangularPhaseViewProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";
  const octantSectorConfigs = getOctantSectorConfigs(locale);
  // 计算相变分割线坐标比例 (基于 4D Cognitive Manifold 基准或中位数/均值)
  let splitXRatio = 0.6;
  let splitYRatio = 0.4; // 0.80 / 2.0 = 0.40
  let splitXVal = 0.6;
  let splitYVal = 0.8;

  if (splitLine === "MEDIAN" && scatterData) {
    splitXVal = scatterData.median_x;
    splitYVal = scatterData.median_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  } else if (splitLine === "MEAN" && scatterData) {
    splitXVal = scatterData.mean_x;
    splitYVal = scatterData.mean_y;
    splitXRatio = Math.max(0.05, Math.min(0.95, splitXVal));
    splitYRatio = Math.max(0.05, Math.min(0.95, splitYVal / 2.0));
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none">
      {/* 2D 直角相图全铺画板 */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden pt-4 pb-8 pl-12 pr-4">
        {/* Y 轴刻度尺 */}
        <div className="absolute left-0 top-4 bottom-8 w-12 pr-2 text-[10px] font-mono text-slate-500 pointer-events-none">
          <span className="absolute top-0 right-2 -translate-y-1/2 text-slate-400">2.0+</span>
          <span className="absolute top-[20%] right-2 -translate-y-1/2">1.6</span>
          <span className="absolute top-[40%] right-2 -translate-y-1/2">1.2</span>
          <span className="absolute bottom-[40%] right-2 translate-y-1/2 text-purple-400 font-bold">
            0.8
          </span>
          <span className="absolute bottom-[20%] right-2 translate-y-1/2">0.4</span>
          <span className="absolute bottom-0 right-2 translate-y-1/2 text-slate-400">0.0</span>
        </div>

        {/* Y 轴垂直标头 */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] tracking-wider font-semibold text-slate-400 uppercase pointer-events-none whitespace-nowrap">
          M_ratio
        </div>

        {/* 内部绘图核心网格区 (无外边框，无缝融入画板，充满真实展示区域) */}
        <div className="relative w-full h-full overflow-hidden">
          {/* 四象限光晕背景 */}
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: `${splitXRatio * 100}%`,
              bottom: `${splitYRatio * 100}%`,
              right: 0,
              top: 0,
              background:
                "radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.12), transparent 75%)",
            }}
          />
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: 0,
              bottom: `${splitYRatio * 100}%`,
              width: `${splitXRatio * 100}%`,
              top: 0,
              background:
                "radial-gradient(ellipse at top left, rgba(6, 182, 212, 0.10), transparent 75%)",
            }}
          />
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: `${splitXRatio * 100}%`,
              bottom: 0,
              right: 0,
              height: `${splitYRatio * 100}%`,
              background:
                "radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.09), transparent 75%)",
            }}
          />
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: 0,
              bottom: 0,
              width: `${splitXRatio * 100}%`,
              height: `${splitYRatio * 100}%`,
              background:
                "radial-gradient(ellipse at bottom left, rgba(244, 63, 94, 0.08), transparent 75%)",
            }}
          />

          {[0.2, 0.4, 0.6, 0.8].map((x) => (
            <div
              key={`grid-x-${x}`}
              className="absolute top-0 bottom-0 border-l border-white/[0.04] pointer-events-none"
              style={{ left: `${x * 100}%` }}
            />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((y) => (
            <div
              key={`grid-y-${y}`}
              className="absolute left-0 right-0 border-t border-white/[0.04] pointer-events-none"
              style={{ bottom: `${y * 100}%` }}
            />
          ))}

          {/* 象限精简标识与 B 端画像交互触发 */}
          <div className="absolute top-2.5 right-3 text-right z-10 flex items-center gap-1.5">
            <button
              onClick={() => onActiveSectorChange?.("Q1-CAL")}
              onMouseEnter={() => onActiveSectorChange?.("Q1-CAL")}
              className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-400/90 hover:text-emerald-300 hover:border-emerald-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q1-CAL"]?.name} profile` : `查看 Q1-CAL ${octantSectorConfigs["Q1-CAL"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Q1-CAL: {octantSectorConfigs["Q1-CAL"]?.name}</span>
            </button>
          </div>

          <div className="absolute top-2.5 left-3 text-left z-10 flex items-center gap-1.5">
            <button
              onClick={() => onActiveSectorChange?.("Q2-EVO")}
              onMouseEnter={() => onActiveSectorChange?.("Q2-EVO")}
              className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-cyan-500/30 text-[11px] font-bold text-cyan-400/90 hover:text-cyan-300 hover:border-cyan-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q2-EVO"]?.name} profile` : `查看 Q2-EVO ${octantSectorConfigs["Q2-EVO"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Q2-EVO</span>
            </button>
            <span className="text-slate-600 text-[10px]">/</span>
            <button
              onClick={() => onActiveSectorChange?.("Q7-ARB")}
              onMouseEnter={() => onActiveSectorChange?.("Q7-ARB")}
              className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-yellow-500/30 text-[11px] font-bold text-yellow-400/90 hover:text-yellow-300 hover:border-yellow-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q7-ARB"]?.name} profile` : `查看 Q7-ARB ${octantSectorConfigs["Q7-ARB"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span>Q7-ARB</span>
            </button>
          </div>

          <div
            className="absolute right-3 text-right z-10 transition-all duration-300 flex items-center gap-1.5"
            style={{
              top: `calc(${Math.min(80, (1 - splitYRatio) * 100 + 1)}% + 6px)`,
            }}
          >
            <button
              onClick={() => onActiveSectorChange?.("Q4-PIO")}
              onMouseEnter={() => onActiveSectorChange?.("Q4-PIO")}
              className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-amber-500/30 text-[11px] font-bold text-amber-400/90 hover:text-amber-300 hover:border-amber-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q4-PIO"]?.name} profile` : `查看 Q4-PIO ${octantSectorConfigs["Q4-PIO"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Q4-PIO</span>
            </button>
            <span className="text-slate-600 text-[10px]">/</span>
            <button
              onClick={() => onActiveSectorChange?.("Q3-SEN")}
              onMouseEnter={() => onActiveSectorChange?.("Q3-SEN")}
              className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-teal-500/30 text-[11px] font-bold text-teal-400/90 hover:text-teal-300 hover:border-teal-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q3-SEN"]?.name} profile` : `查看 Q3-SEN ${octantSectorConfigs["Q3-SEN"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>Q3-SEN</span>
            </button>
          </div>

          <div
            className="absolute left-3 text-left z-10 transition-all duration-300 flex items-center gap-1.5"
            style={{
              top: `calc(${Math.min(80, (1 - splitYRatio) * 100 + 1)}% + 6px)`,
            }}
          >
            <button
              onClick={() => onActiveSectorChange?.("Q6-GAM")}
              onMouseEnter={() => onActiveSectorChange?.("Q6-GAM")}
              className="px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-rose-500/30 text-[10px] font-bold text-rose-400/90 hover:text-rose-300 hover:border-rose-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q6-GAM"]?.name} profile` : `查看 Q6-GAM ${octantSectorConfigs["Q6-GAM"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Q6-GAM</span>
            </button>
            <button
              onClick={() => onActiveSectorChange?.("Q5-RET")}
              onMouseEnter={() => onActiveSectorChange?.("Q5-RET")}
              className="px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-indigo-500/30 text-[10px] font-bold text-indigo-400/90 hover:text-indigo-300 hover:border-indigo-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q5-RET"]?.name} profile` : `查看 Q5-RET ${octantSectorConfigs["Q5-RET"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Q5-RET</span>
            </button>
            <button
              onClick={() => onActiveSectorChange?.("Q8-DRI")}
              onMouseEnter={() => onActiveSectorChange?.("Q8-DRI")}
              className="px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-purple-500/30 text-[10px] font-bold text-purple-400/90 hover:text-purple-300 hover:border-purple-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              title={isEn ? `Inspect ${octantSectorConfigs["Q8-DRI"]?.name} profile` : `查看 Q8-DRI ${octantSectorConfigs["Q8-DRI"]?.name} 详细画像`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Q8-DRI</span>
            </button>
          </div>

          {/* 动态相变分割线 */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
            style={{
              left: `${splitXRatio * 100}%`,
              boxShadow: "0 0 10px rgba(99, 102, 241, 0.4)",
            }}
          >
            <div className="absolute top-2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
              {splitLine === "BASELINE"
                ? "D* = 0.60"
                : splitLine === "MEDIAN"
                  ? (isEn ? `Med: ${splitXVal.toFixed(2)}` : `中位: ${splitXVal.toFixed(2)}`)
                  : (isEn ? `Mean: ${splitXVal.toFixed(2)}` : `均值: ${splitXVal.toFixed(2)}`)}
            </div>
          </div>

          <div
            className="absolute left-0 right-0 border-t-2 border-indigo-400/60 pointer-events-none z-10 transition-all duration-300"
            style={{
              bottom: `${splitYRatio * 100}%`,
              boxShadow: "0 0 10px rgba(99, 102, 241, 0.4)",
            }}
          >
            <div className="absolute right-2 -translate-y-1/2 px-1.5 py-0.2 rounded-full bg-indigo-950/90 border border-indigo-400/60 text-[9px] font-mono text-indigo-300 shadow whitespace-nowrap">
              {splitLine === "BASELINE"
                ? "M = 0.80"
                : splitLine === "MEDIAN"
                  ? (isEn ? `Med: ${splitYVal.toFixed(2)}` : `中位: ${splitYVal.toFixed(2)}`)
                  : (isEn ? `Mean: ${splitYVal.toFixed(2)}` : `均值: ${splitYVal.toFixed(2)}`)}
            </div>
          </div>

          {/* 直角散点 */}
          {subjects.map((sub) => {
            const dStarVal = sub.d_star !== undefined ? sub.d_star : 0.5;
            const posX = Math.max(0.02, Math.min(0.98, dStarVal)) * 100;
            const posY = Math.max(0.02, Math.min(0.98, (sub.m_ratio ?? 0.8) / 2.0)) * 100;

            const isHovered = hoveredSubject?.id === sub.id;
            const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);

            return (
              <div
                key={sub.id}
                onMouseEnter={() => setHoveredSubject(sub)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => onOpenReport(sub.id)}
                className={`absolute w-3.5 h-3.5 -ml-[7px] -mb-[7px] rounded-full cursor-pointer transition-all duration-150 z-20 flex items-center justify-center ${
                  sub.is_current
                    ? "scale-150 ring-4 ring-amber-400/80 animate-pulse"
                    : isHovered
                      ? "scale-150 ring-2 ring-white z-30"
                      : "hover:scale-125"
                }`}
                style={{
                  left: `${posX}%`,
                  bottom: `${posY}%`,
                  backgroundColor: colorToken.backgroundColor,
                  border: `1.5px solid ${colorToken.borderColor}`,
                  boxShadow: colorToken.boxShadow,
                }}
              >
                <div className="w-1 h-1 rounded-full bg-white/80 pointer-events-none" />
              </div>
            );
          })}

          {/* 散点 Tooltip */}
          {hoveredSubject && (
            <div
              className="absolute z-40 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/20 text-xs shadow-2xl pointer-events-none min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${Math.min(78, Math.max(2, (hoveredSubject.d_star ?? 0.5) * 100))}%`,
                bottom: `${Math.min(75, Math.max(10, ((hoveredSubject.m_ratio ?? 0.8) / 2.0) * 100))}%`,
                transform: "translate(-50%, -120%)",
              }}
            >
              <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1">
                <span>{hoveredSubject.name}</span>
                <span className="text-amber-400 font-mono text-[10px]">
                  {hoveredSubject.final_score}分
                </span>
              </div>
              <div className="text-[11px] text-amber-300 font-semibold pt-1">
                {(hoveredSubject.quadrant_code ? getArchetypeDefinition(hoveredSubject.quadrant_code, locale).role_title : hoveredSubject.role_title) || (isEn ? "Unknown" : "未知特质")}
                <span className="text-[9px] text-slate-400 font-mono ml-1">
                  ({hoveredSubject.quadrant_code})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-400 pt-1">
                <div>
                  D*:{" "}
                  <span className="text-cyan-300 font-bold">
                    {(hoveredSubject.d_star ?? 0.5).toFixed(3)}
                  </span>
                </div>
                <div>
                  M_ratio:{" "}
                  <span className="text-purple-300 font-bold">{hoveredSubject.m_ratio}</span>
                </div>
                <div>
                  Bias:{" "}
                  <span className="text-slate-300">
                    {hoveredSubject.calibration_bias > 0
                      ? `+${hoveredSubject.calibration_bias}`
                      : hoveredSubject.calibration_bias}
                  </span>
                </div>
                <div>
                  IVE:{" "}
                  <span className="text-amber-300 font-bold">
                    {(hoveredSubject.ive ?? 0.5).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* X 轴刻度尺 */}
        <div className="absolute left-12 right-4 bottom-2 h-6 flex justify-between text-[10px] font-mono text-slate-500 pointer-events-none">
          <span className="absolute left-0 text-slate-400">0.0</span>
          <span className="absolute left-[20%] -translate-x-1/2">0.2</span>
          <span className="absolute left-[40%] -translate-x-1/2">0.4</span>
          <span className="absolute left-[60%] -translate-x-1/2 text-cyan-400 font-bold whitespace-nowrap">
            0.6
          </span>
          <span className="absolute left-[80%] -translate-x-1/2">0.8</span>
          <span className="absolute right-0 text-slate-400">1.0</span>
        </div>

        {/* X 轴水平标头 */}
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase pointer-events-none">
          相变突破度 D*
        </div>
      </div>

      {/* 认知流形视觉通道编码规范：作为底部通栏贴合条，无四周独立边框，一体化衔接 */}
      <div className="shrink-0 px-6 py-2 border-t border-white/10 bg-slate-950/80 backdrop-blur-md space-y-1">
        <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          认知流形视觉通道编码规范
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* 色相通道 */}
          <div className="space-y-0.5">
            <div className="text-slate-400 flex items-center justify-between text-[10px]">
              <span>色相 Hue · 决策偏向 Bias</span>
              <span className="font-mono text-slate-500">双极色温</span>
            </div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-[hsl(205,80%,55%)] via-[hsl(155,80%,55%)] to-[hsl(15,85%,55%)] shadow-inner" />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
              <span>谨慎 (&lt;-0.12)</span>
              <span className="text-emerald-400 font-semibold">自洽 (±0.12)</span>
              <span>自负 (&gt;+0.12)</span>
            </div>
          </div>

          {/* 饱和度/辉光 */}
          <div className="space-y-0.5">
            <div className="text-slate-400 flex items-center justify-between text-[10px]">
              <span>纯度/辉光 · 觅食杠杆 IVE</span>
              <span className="font-mono text-slate-500">能量充盈度</span>
            </div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-slate-600 via-amber-500/70 to-amber-400 shadow-inner" />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
              <span>纯内生 (0)</span>
              <span>均衡 (0.5)</span>
              <span className="text-amber-300 font-semibold">高杠杆 (≥0.70)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
