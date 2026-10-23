import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Trophy,
  Brain,
  Eye,
  Target,
  Scale,
  Zap,
  ListOrdered,
  Table as TableIcon,
  Medal,
} from "lucide-react";
import { SubjectPoint } from "../../../types/admin";
import { computeMultivariateColor } from "../../../utils/manifoldUtils";
import { useLocale } from "../../../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../../../backend/archetype_matrix";
import {
  generateLeaderboardOverview,
  subjectDataPointToLeaderboardInput,
  type LeaderboardOverviewResponse,
} from "../../../../backend/leaderboard";

interface SubjectDataTableViewProps {
  allSubjects?: SubjectPoint[];
  tagCounts: Record<string, number>;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  quadrantTitles: Record<string, string>;
  paginatedSubjects: SubjectPoint[];
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  onOpenReport: (sessionId: string) => void;
  onDeleteSubject?: (sessionId: string, subjectName?: string) => void;
}

type TableTabMode = "TOPSIS" | "SUB_BOARDS" | "TABLE";
type SubBoardDimension = "reasoning" | "metacognition" | "calibration" | "game_utility" | "efficiency";

export default function SubjectDataTableView({
  allSubjects,
  tagCounts,
  selectedTag,
  setSelectedTag,
  quadrantTitles,
  paginatedSubjects,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  onOpenReport,
  onDeleteSubject,
}: SubjectDataTableViewProps) {
  const { locale } = useLocale();
  const isEn = locale === "en-US";

  const [tabMode, setTabMode] = useState<TableTabMode>("TOPSIS");
  const [subDimension, setSubDimension] = useState<SubBoardDimension>("reasoning");

  // Compute multi-dimensional leaderboards from all subjects (or fallback to current page)
  const cohortPool = useMemo(() => {
    return allSubjects && allSubjects.length > 0 ? allSubjects : paginatedSubjects;
  }, [allSubjects, paginatedSubjects]);

  const leaderboardOverview: LeaderboardOverviewResponse = useMemo(() => {
    const inputs = cohortPool.map((s) => {
      // Map to LeaderboardSubjectInput
      return subjectDataPointToLeaderboardInput(s as any);
    });
    return generateLeaderboardOverview(inputs);
  }, [cohortPool]);

  // Top 3 for podium
  const top3Topsis = leaderboardOverview.topsis_leaderboard.slice(0, 3);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-amber-400 font-bold flex items-center gap-1">🥇 1</span>;
    if (rank === 2) return <span className="text-slate-300 font-bold flex items-center gap-1">🥈 2</span>;
    if (rank === 3) return <span className="text-amber-600 font-bold flex items-center gap-1">🥉 3</span>;
    return <span className="text-slate-500 font-mono text-[11px] font-semibold">{rank}</span>;
  };

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-hidden">
      {/* 顶部状态与工具栏 (左侧 pl-64 避让左上角悬浮导航 Tabs) */}
      <div className="h-10 shrink-0 flex items-center justify-between pl-64 pr-2 select-none text-xs gap-3">
        {/* 模式选择 Segmented Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/90 border border-white/10 shrink-0">
          <button
            onClick={() => setTabMode("TOPSIS")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              tabMode === "TOPSIS"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>{isEn ? "TOPSIS Leaderboard" : "TOPSIS 综合天梯"}</span>
          </button>
          <button
            onClick={() => setTabMode("SUB_BOARDS")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              tabMode === "SUB_BOARDS"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isEn ? "5D Sub-Boards" : "五维正交分榜"}</span>
          </button>
          <button
            onClick={() => setTabMode("TABLE")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              tabMode === "TABLE"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-purple-300" />
            <span>{isEn ? "Data Inventory" : "明细数据清单"}</span>
          </button>
        </div>

        {/* 筛选标签提示 */}
        {selectedTag && selectedTag !== "ALL" ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">
              {isEn ? "Current Archetype Filter: " : "当前画像筛选："}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
              <span>{quadrantTitles[selectedTag] || selectedTag}</span>
              <span className="text-[10px] font-mono text-amber-400/80">
                ({totalItems} {isEn ? "items" : "条"})
              </span>
            </span>
            <button
              onClick={() => setSelectedTag("ALL")}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer underline underline-offset-2 ml-1"
            >
              {isEn ? "Clear Filter" : "清除筛选"}
            </button>
          </div>
        ) : (
          <div className="text-slate-500 text-[11px] font-mono hidden md:inline truncate">
            {isEn
              ? `Multi-Dimensional Psychometric Benchmark · Total ${cohortPool.length} subjects`
              : `认知物理学基准评估 · 参评受试样本共 ${cohortPool.length} 例`}
          </div>
        )}
      </div>

      {/* 视图一：TOPSIS 统一综合天梯 */}
      {tabMode === "TOPSIS" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Top 3 领奖台卡片 */}
          {top3Topsis.length >= 3 && (
            <div className="grid grid-cols-3 gap-2.5 shrink-0 select-none">
              {top3Topsis.map((item, idx) => {
                const borderStyles = [
                  "border-amber-400/40 bg-gradient-to-b from-amber-950/20 to-slate-950/80 shadow-[0_0_20px_rgba(251,191,36,0.12)]",
                  "border-slate-300/30 bg-gradient-to-b from-slate-800/20 to-slate-950/80",
                  "border-amber-700/30 bg-gradient-to-b from-amber-950/10 to-slate-950/80",
                ][idx];
                const badgeTitle = [isEn ? "Gold Champion" : "天梯冠军", isEn ? "Silver Runner-Up" : "天梯亚军", isEn ? "Bronze Third" : "天梯季军"][idx];
                const medalIcon = ["🥇", "🥈", "🥉"][idx];

                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenReport(item.id)}
                    className={`rounded-xl border p-2.5 flex items-center justify-between cursor-pointer hover:border-white/30 transition-all ${borderStyles}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-xl shrink-0">{medalIcon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-300 font-medium px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                            {badgeTitle}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.quadrant_code}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white truncate max-w-[140px] mt-0.5">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.role_title}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-mono">TOPSIS</div>
                      <div className="text-base font-black font-mono text-amber-300">
                        {item.topsis_score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOPSIS 主数据表格 */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10 select-none">
                <tr className="text-slate-400 font-medium">
                  <th className="py-2.5 px-3 w-14 text-center">{isEn ? "Rank" : "天梯名次"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Subject" : "受测对象"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Archetype" : "画像流派"}</th>
                  <th className="py-2.5 px-3 font-mono text-amber-400">{isEn ? "TOPSIS C_i" : "综合贴近度"}</th>
                  <th className="py-2.5 px-3 font-mono text-cyan-300">{isEn ? "D* (Reasoning)" : "推理 D*"}</th>
                  <th className="py-2.5 px-3 font-mono text-purple-300">M_ratio</th>
                  <th className="py-2.5 px-3 font-mono text-emerald-400">{isEn ? "1-Brier" : "校准精度"}</th>
                  <th className="py-2.5 px-3 font-mono text-yellow-300">{isEn ? "Formal Score" : "正式战绩"}</th>
                  <th className="py-2.5 px-3 font-mono text-indigo-300">{isEn ? "CCS" : "认知综合分"}</th>
                  <th className="py-2.5 px-3 font-mono text-rose-300">{isEn ? "EIR" : "能效比"}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? "Action" : "操作"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboardOverview.topsis_leaderboard.map((item) => {
                  const colorToken = computeMultivariateColor(item.metrics.calibration_bias, item.metrics.ive);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-2 px-3 text-center">{getRankBadge(item.rank)}</td>
                      <td className="py-2 px-3 font-medium text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor: colorToken.backgroundColor,
                            border: `1px solid ${colorToken.borderColor}`,
                            boxShadow: colorToken.boxShadow,
                          }}
                        />
                        <span className="truncate max-w-[140px]">{item.name}</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold border border-white/10 bg-slate-800/80 text-slate-300 shrink-0">
                          {item.subject_type === "HUMAN" ? "HUMAN" : "AGENT"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-amber-300 font-semibold">{item.role_title}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          {item.quadrant_code}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-amber-300 text-sm">
                        {item.topsis_score.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-300 font-semibold">
                        {item.metrics.d_star.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono text-purple-300 font-semibold">
                        {item.metrics.m_ratio.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400 font-semibold">
                        {item.metrics.calibration_accuracy.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-yellow-400">
                        {item.metrics.formal_score}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-indigo-300">
                        {item.metrics.ccs.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 font-mono text-rose-300">
                        {item.metrics.eir.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onOpenReport(item.id)}
                          className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          {isEn ? "Details" : "详情"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 视图二：五维正交分榜 */}
      {tabMode === "SUB_BOARDS" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* 子维度切换器 */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-white/5 select-none shrink-0 overflow-x-auto">
            <button
              onClick={() => setSubDimension("reasoning")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                subDimension === "reasoning"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{isEn ? "1. Reasoning Breakthrough (D*)" : "1. 推理突破榜 (D*)"}</span>
            </button>
            <button
              onClick={() => setSubDimension("metacognition")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                subDimension === "metacognition"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isEn ? "2. Metacognitive Fidelity (M_ratio)" : "2. 元认知保真榜 (M_ratio)"}</span>
            </button>
            <button
              onClick={() => setSubDimension("calibration")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                subDimension === "calibration"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isEn ? "3. Probability Calibration (1-Brier)" : "3. 概率校准榜 (1-Brier)"}</span>
            </button>
            <button
              onClick={() => setSubDimension("game_utility")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                subDimension === "game_utility"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isEn ? "4. Game Utility Payoff" : "4. 博弈收益榜 (战绩与CCS)"}</span>
            </button>
            <button
              onClick={() => setSubDimension("efficiency")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                subDimension === "efficiency"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isEn ? "5. Cognitive Energy Ratio (EIR)" : "5. 认知能效榜 (EIR)"}</span>
            </button>
          </div>

          {/* 子榜数据表格 */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10 select-none">
                <tr className="text-slate-400 font-medium">
                  <th className="py-2.5 px-3 w-14 text-center">{isEn ? "Rank" : "排名"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Subject" : "受测对象"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Archetype" : "画像称号"}</th>
                  <th className="py-2.5 px-3 font-mono font-bold text-amber-300">
                    {subDimension === "reasoning" && (isEn ? "D* Capacity" : "突破度 D*")}
                    {subDimension === "metacognition" && "M_ratio"}
                    {subDimension === "calibration" && (isEn ? "Calibration Accuracy (1-Brier)" : "校准精度 (1-Brier)")}
                    {subDimension === "game_utility" && (isEn ? "Formal Score" : "纯净正式战绩")}
                    {subDimension === "efficiency" && (isEn ? "EIR (Payoff/Cost)" : "能效比 EIR")}
                  </th>
                  <th className="py-2.5 px-3 font-mono text-cyan-300">D*</th>
                  <th className="py-2.5 px-3 font-mono text-purple-300">M_ratio</th>
                  <th className="py-2.5 px-3 font-mono text-emerald-400">1-Brier</th>
                  <th className="py-2.5 px-3 font-mono text-yellow-300">{isEn ? "CCS" : "综合分 CCS"}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? "Action" : "操作"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboardOverview.sub_leaderboards[subDimension].map((item) => {
                  const colorToken = computeMultivariateColor(item.metrics.calibration_bias, item.metrics.ive);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-2 px-3 text-center">{getRankBadge(item.rank)}</td>
                      <td className="py-2 px-3 font-medium text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor: colorToken.backgroundColor,
                            border: `1px solid ${colorToken.borderColor}`,
                            boxShadow: colorToken.boxShadow,
                          }}
                        />
                        <span className="truncate max-w-[140px]">{item.name}</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold border border-white/10 bg-slate-800/80 text-slate-300 shrink-0">
                          {item.subject_type === "HUMAN" ? "HUMAN" : "AGENT"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-amber-300 font-semibold">{item.role_title}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          {item.quadrant_code}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-black text-amber-300 text-sm">
                        {item.score}
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-300 font-semibold">
                        {item.metrics.d_star.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono text-purple-300 font-semibold">
                        {item.metrics.m_ratio.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400 font-semibold">
                        {item.metrics.calibration_accuracy.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-yellow-300">
                        {item.metrics.ccs.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onOpenReport(item.id)}
                          className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          {isEn ? "Details" : "详情"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 视图三：数据明细清单 (原有分页表格增强版) */}
      {tabMode === "TABLE" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/10 select-none">
                <tr className="text-slate-400 font-medium">
                  <th className="py-2.5 px-3">{isEn ? "Subject" : "受测者"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Archetype Order" : "画像称号"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Discrim D*" : "突破度 D*"}</th>
                  <th className="py-2.5 px-3">M_ratio</th>
                  <th className="py-2.5 px-3">{isEn ? "Bias" : "偏向 Bias"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Foraging IVE" : "杠杆 IVE"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Formal Score" : "正式战绩"}</th>
                  <th className="py-2.5 px-3">{isEn ? "CCS" : "综合分 CCS"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Clinical Truth" : "诊断归因"}</th>
                  <th className="py-2.5 px-3 text-right">{isEn ? "Actions" : "操作"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedSubjects.map((sub) => {
                  const colorToken = computeMultivariateColor(sub.calibration_bias, sub.ive ?? 0.5);
                  const isSubEn = sub.locale === "en-US" || sub.metadata?.locale === "en-US";
                  const def = sub.quadrant_code ? getArchetypeDefinition(sub.quadrant_code, locale) : null;
                  const roleTitle = def?.role_title || sub.role_title || (isEn ? "The Grand Archmage" : "人形外挂");
                  const clinicalSummary = def?.clinical_summary || sub.clinical_summary || "--";
                  const formalScore = sub.formal_score ?? sub.final_score ?? 0;
                  const ccs = sub.composite_cognitive_score ?? sub.ccs ?? Math.round((sub.d_star ?? 0.5) * formalScore * 10) / 10;

                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-2 px-3 font-medium text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor: colorToken.backgroundColor,
                            border: `1px solid ${colorToken.borderColor}`,
                            boxShadow: colorToken.boxShadow,
                          }}
                        />
                        <span className="truncate max-w-[120px]">{sub.name}</span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${
                            isSubEn
                              ? "bg-indigo-950/70 border-indigo-400/40 text-indigo-300"
                              : "bg-slate-800/80 border-white/10 text-slate-300"
                          }`}
                          title={isSubEn ? "Evaluated in English" : "中文环境评测"}
                        >
                          {isSubEn ? "EN" : "ZH"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-amber-300 font-semibold">{roleTitle}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1.5">
                          {sub.quadrant_code || "Q1-CAL"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-300 font-semibold">
                        {(sub.d_star ?? 0.5).toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono text-purple-300 font-semibold">
                        {sub.m_ratio}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">
                        {sub.calibration_bias > 0 ? `+${sub.calibration_bias}` : sub.calibration_bias}
                      </td>
                      <td className="py-2 px-3 font-mono text-amber-300">
                        {(sub.ive ?? 0.5).toFixed(3)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-yellow-400">
                        {formalScore}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-300">
                        {ccs.toFixed(1)}
                      </td>
                      <td
                        className="py-2 px-3 text-slate-400 text-[11px] max-w-xs truncate"
                        title={clinicalSummary}
                      >
                        {clinicalSummary}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenReport(sub.id)}
                            className="px-2.5 py-1 rounded-md bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] transition-colors cursor-pointer"
                          >
                            {isEn ? "Details" : "详情"}
                          </button>
                          {onDeleteSubject && (
                            <button
                              onClick={() => onDeleteSubject(sub.id, sub.name)}
                              className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              title={isEn ? "Delete this record" : "删除此条数据"}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{isEn ? "Delete" : "删除"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedSubjects.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      {isEn ? "No matching subject records found" : "未检索到符合条件的受试者记录"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 底部固定分页控制栏 */}
          <div className="shrink-0 h-8 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 pt-1 select-none">
            <div className="flex items-center gap-2">
              <span>
                <span className="text-white font-mono">{totalItems > 0 ? startIndex + 1 : 0}</span>-
                <span className="text-white font-mono">{endIndex}</span> /{" "}
                <span className="text-white font-mono">{totalItems}</span>
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none cursor-pointer"
              >
                <option value={10}>10 {isEn ? "items" : "条"}</option>
                <option value={20}>20 {isEn ? "items" : "条"}</option>
                <option value={50}>50 {isEn ? "items" : "条"}</option>
                <option value={100}>100 {isEn ? "items" : "条"}</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title={isEn ? "Previous page" : "上一页"}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-mono text-[11px] text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title={isEn ? "Next page" : "下一页"}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
