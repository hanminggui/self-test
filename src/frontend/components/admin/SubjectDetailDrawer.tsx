import React from "react";
import { X, Brain, Sparkles } from "lucide-react";

interface SubjectDetailDrawerProps {
  report: any | null;
  onClose: () => void;
}

export default function SubjectDetailDrawer({ report, onClose }: SubjectDetailDrawerProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              受测者双层诊断报告
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                {report.diagnostic_profile.quadrant_code}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {report.subject_name} ({report.session_id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 顶栏展示：用户展示层专属称号 */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-2xl font-black text-amber-300">
            {report.diagnostic_profile.role_title}
          </div>
          <div className="text-xs text-amber-200/80 mt-1">
            “{report.diagnostic_profile.praise_tagline}”
          </div>
        </div>

        {/* 双层架构模块 1：后台统计分析层（严谨客观临床真值） */}
        <div className="space-y-3 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
          <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Brain className="w-4 h-4" /> 后台统计分析层 · 临床真值与 4D 认知流形特征
          </div>

          {/* 4D 流形参数矩阵 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">突破度 D*</div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                {report.metacognitive_metrics.d_star?.toFixed(3) ?? "--"}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">元认知 M_ratio</div>
              <div className="text-sm font-bold font-mono text-purple-300">
                {report.metacognitive_metrics.m_ratio}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">决策倾角 Bias</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {report.metacognitive_metrics.calibration_bias > 0
                  ? `+${report.metacognitive_metrics.calibration_bias}`
                  : report.metacognitive_metrics.calibration_bias}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">觅食杠杆 IVE</div>
              <div className="text-sm font-bold font-mono text-amber-300">
                {report.metacognitive_metrics.info_buying_efficiency?.toFixed(3) ?? "--"}
              </div>
            </div>
          </div>

          {/* 辅助参数 */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
            <div>
              一元辨别力 d':{" "}
              <span className="text-slate-200">{report.metacognitive_metrics.d_prime}</span>
            </div>
            <div>
              二元 Meta-d':{" "}
              <span className="text-slate-200">{report.metacognitive_metrics.meta_d_prime}</span>
            </div>
            <div>
              Brier Score:{" "}
              <span className="text-slate-200">{report.metacognitive_metrics.brier_score}</span>
            </div>
          </div>

          {/* 客观临床诊断摘要 */}
          <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/10 text-xs text-indigo-100 leading-relaxed">
            <span className="font-semibold text-indigo-300">临床真值归因：</span>
            {report.diagnostic_profile.clinical_summary ||
              report.diagnostic_profile.critical_weakness}
          </div>
        </div>

        {/* 双层架构模块 2：用户交互展示层（纯正面赋能） */}
        <div className="space-y-3 p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> 用户交互展示层 · 赋能解读与专属技能卡片
          </div>

          <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
            {report.diagnostic_profile.empowering_feedback}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-white">专属技能卡片矩阵：</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {report.diagnostic_profile.skills.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 space-y-1"
                >
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>{s.icon}</span> {s.name}
                    </span>
                    <span className="text-[10px] text-amber-300/80">{s.type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
