import React, { useState } from "react";
import { X, Brain, Sparkles, Trash2, Cpu, Clock, Coins, Layers, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";

interface SubjectDetailDrawerProps {
  report: any | null;
  onClose: () => void;
  onDelete?: (sessionId: string, subjectName?: string) => void;
}

function formatTokens(n?: number): string {
  if (n === undefined || n === null) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatDurationMs(ms?: number): string {
  if (ms === undefined || ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec % 60);
  return `${min}m ${remSec}s`;
}

export default function SubjectDetailDrawer({ report, onClose, onDelete }: SubjectDetailDrawerProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";
  const [showRecords, setShowRecords] = useState(false);
  if (!report) return null;

  const isSubEn = report.metadata?.locale === "en-US";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {isEn ? "Two-Tier Metacognitive Diagnostic Report" : "受测者双层诊断报告"}
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                {report.diagnostic_profile.quadrant_code}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                  isSubEn
                    ? "bg-indigo-950/70 border-indigo-400/40 text-indigo-300"
                    : "bg-slate-800 border-white/10 text-slate-300"
                }`}
                title={isSubEn ? "Evaluated in English" : "中文环境评测"}
              >
                {isSubEn ? "EN" : "ZH"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {report.subject_name} ({report.session_id})
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(report.session_id, report.subject_name)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title={isEn ? "Permanently delete this record" : "彻底删除此条数据"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? "Delete Record" : "删除记录"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
            <Brain className="w-4 h-4" /> {isEn ? "Analytical Truth & 4D Cognitive Manifold Vector" : "后台统计分析层 · 临床真值与 4D 认知流形特征"}
          </div>

          {/* 4D 流形参数矩阵 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">{isEn ? "Discrim D*" : "突破度 D*"}</div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                {report.metacognitive_metrics.d_star?.toFixed(3) ?? "--"}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">{isEn ? "Metacognitive M_ratio" : "元认知 M_ratio"}</div>
              <div className="text-sm font-bold font-mono text-purple-300">
                {report.metacognitive_metrics.m_ratio}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">{isEn ? "Decision Bias" : "决策倾角 Bias"}</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {report.metacognitive_metrics.calibration_bias > 0
                  ? `+${report.metacognitive_metrics.calibration_bias}`
                  : report.metacognitive_metrics.calibration_bias}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <div className="text-[10px] text-slate-400">{isEn ? "Foraging IVE" : "觅食杠杆 IVE"}</div>
              <div className="text-sm font-bold font-mono text-amber-300">
                {report.metacognitive_metrics.info_buying_efficiency?.toFixed(3) ?? "--"}
              </div>
            </div>
          </div>

          {/* 辅助参数 */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
            <div>
              {isEn ? "Type-1 d': " : "一元辨别力 d': "}
              <span className="text-slate-200">{report.metacognitive_metrics.d_prime}</span>
            </div>
            <div>
              {isEn ? "Type-2 Meta-d': " : "二元 Meta-d': "}
              <span className="text-slate-200">{report.metacognitive_metrics.meta_d_prime}</span>
            </div>
            <div>
              Brier Score:{" "}
              <span className="text-slate-200">{report.metacognitive_metrics.brier_score}</span>
            </div>
          </div>

          {/* 客观临床诊断摘要 */}
          <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/10 text-xs text-indigo-100 leading-relaxed">
            <span className="font-semibold text-indigo-300">{isEn ? "Clinical Truth Attribution: " : "临床真值归因："}</span>
            {report.diagnostic_profile.clinical_summary ||
              report.diagnostic_profile.critical_weakness}
          </div>
        </div>

        {/* 双层架构模块 2：用户交互展示层（纯正面赋能） */}
        <div className="space-y-3 p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> {isEn ? "Empowering Interpretation & Arcane Skill Hierarchy" : "用户交互展示层 · 赋能解读与专属技能卡片"}
          </div>

          <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
            {report.diagnostic_profile.empowering_feedback}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-white">{isEn ? "Unique Skill Hierarchy Matrix:" : "专属技能卡片矩阵："}</div>
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

        {/* 执行元数据与资源统计面板 */}
        {report.metadata && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20">
            <div className="text-xs font-bold text-cyan-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> {isEn ? "Execution Metadata & Resource Accounting" : "评测执行元数据与资源统计"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-200 font-mono">
                {report.metadata.thinking_effort
                  ? `${isEn ? "Thinking Effort: " : "思考强度: "}${report.metadata.thinking_effort}`
                  : isEn ? "Standard Mode" : "常规模式"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> {isEn ? "Target Model / Name" : "受测模型 / 名称"}
                </div>
                <div className="font-semibold text-white truncate" title={report.metadata.model_name || report.subject_name}>
                  {report.metadata.model_name || report.subject_name}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> {isEn ? "Total Duration" : "评测总用时"}
                </div>
                <div className="font-semibold text-emerald-300 font-mono">
                  {report.metadata.formatted_duration || formatDurationMs(report.metadata.total_duration_ms)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" /> {isEn ? "Trial Specification" : "轮次规格"}
                </div>
                <div className="font-semibold text-slate-200 font-mono">
                  {isEn
                    ? `Total ${report.summary?.total_trials ?? report.metadata.total_trials} (Warmup ${report.metadata.warmup_trials ?? 10})`
                    : `共 ${report.summary?.total_trials ?? report.metadata.total_trials} 轮 (预热 ${report.metadata.warmup_trials ?? 10})`}
                </div>
              </div>
            </div>

            {report.metadata.persona && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs">
                <span className="text-[10px] text-slate-400 font-semibold">{isEn ? "Agent Persona: " : "Agent 人设设定："}</span>
                <span className="text-slate-300 ml-1">{report.metadata.persona}</span>
              </div>
            )}

            {report.metadata.token_usage && (
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/10 space-y-2">
                <div className="text-[11px] font-semibold text-cyan-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" /> {isEn ? "Token Resource Billing" : "Token 资源消耗账单"}
                  </span>
                  <span className="font-mono text-cyan-300">
                    {isEn ? "Total " : "总计 "} {formatTokens(report.metadata.token_usage.total_tokens)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[10px] text-slate-400">{isEn ? "Prompt" : "输入 (Prompt)"}</div>
                    <div className="text-slate-200 font-bold">{formatTokens(report.metadata.token_usage.prompt_tokens)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[10px] text-slate-400">{isEn ? "Cache Hit" : "缓存命中 (Cache)"}</div>
                    <div className="text-emerald-300 font-bold">{formatTokens(report.metadata.token_usage.cached_tokens)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[10px] text-slate-400">{isEn ? "Completion" : "输出 (Completion)"}</div>
                    <div className="text-purple-300 font-bold">{formatTokens(report.metadata.token_usage.completion_tokens)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                    <div className="text-[10px] text-slate-400">{isEn ? "Reasoning" : "思维链推理"}</div>
                    <div className="text-amber-300 font-bold">{formatTokens(report.metadata.token_usage.reasoning_tokens)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 试次明细与单步资源消耗列表 */}
        {report.records && report.records.length > 0 && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400" /> {isEn ? "Per-Trial Decision Audit Trail" : "单步试次明细与决策过程"}
                <span className="text-[10px] text-slate-400 font-mono">({report.records.length} {isEn ? "trials" : "轮"})</span>
              </div>
              <button
                onClick={() => setShowRecords(!showRecords)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{showRecords ? (isEn ? "Collapse" : "收起明细") : (isEn ? "Expand" : "展开明细")}</span>
                {showRecords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showRecords && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/80">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10 text-slate-400">
                    <tr>
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-2">{isEn ? "Phase" : "阶段"}</th>
                      <th className="py-2 px-2">{isEn ? "Diff" : "难度"}</th>
                      <th className="py-2 px-2">{isEn ? "Type-1 Choice" : "一元推导"}</th>
                      <th className="py-2 px-2">{isEn ? "Type-2 Stake" : "二元决策"}</th>
                      <th className="py-2 px-2">{isEn ? "Duration" : "耗时"}</th>
                      <th className="py-2 px-2">Token</th>
                      <th className="py-2 px-2">{isEn ? "Audit" : "操作过程"}</th>
                      <th className="py-2 px-2 text-right">{isEn ? "Score Δ" : "得分变动"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {report.records.map((rec: any, idx: number) => {
                      const isCorrect = rec.is_correct_first_order;
                      const hasHint = rec.hints_unlocked && rec.hints_unlocked > 0;
                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-1.5 px-2.5 text-slate-400">{rec.trial_index}</td>
                          <td className="py-1.5 px-2">
                            {rec.is_warmup ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                                {isEn ? "Warmup" : "预热"}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-950 text-cyan-300">
                                {isEn ? "Formal" : "正式"}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">{rec.difficulty_level?.toFixed(2) ?? "--"}</td>
                          <td className="py-1.5 px-2">
                            <span className={isCorrect ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                              [{rec.first_order_choice}] {isCorrect ? "✓" : "✗"}
                            </span>
                          </td>
                          <td className="py-1.5 px-2">
                            <span className={rec.action === "HIGH_BET" ? "text-amber-300" : "text-slate-400"}>
                              {rec.action === "HIGH_BET" ? "高注" : "保底"}
                            </span>
                            {rec.confidence_level !== undefined && (
                              <span className="text-[10px] text-slate-500 ml-1">({Math.round(rec.confidence_level * 100)}%)</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-emerald-400">
                            {formatDurationMs(rec.duration_ms)}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">
                            {rec.token_usage ? formatTokens(rec.token_usage.total_tokens) : "--"}
                          </td>
                          <td className="py-1.5 px-2 text-[10px] text-slate-400">
                            {hasHint ? (
                              <span className="text-amber-300">线索T{rec.hints_unlocked}</span>
                            ) : (
                              <span className="text-slate-500">直决</span>
                            )}
                            {rec.operations && rec.operations.length > 0 && (
                              <span className="text-slate-500 ml-1">({rec.operations.length}步)</span>
                            )}
                          </td>
                          <td className={`py-1.5 px-2 text-right font-bold ${rec.score_delta > 0 ? "text-emerald-400" : rec.score_delta < 0 ? "text-rose-400" : "text-slate-400"}`}>
                            {rec.score_delta > 0 ? `+${rec.score_delta}` : rec.score_delta}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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
