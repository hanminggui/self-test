import React from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { SubjectPoint } from "../../../types/admin";
import { computeMultivariateColor } from "../../../utils/manifoldUtils";
import { useLocale } from "../../../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../../../backend/archetype_matrix";

interface SubjectDataTableViewProps {
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

export default function SubjectDataTableView({
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

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-hidden">
      {/* 顶部状态与工具栏 (左侧 pl-64 避让左上角悬浮导航 Tabs) */}
      <div className="h-9 shrink-0 flex items-center justify-between pl-64 pr-2 select-none text-xs">
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
          <div className="text-slate-500 text-[11px] font-mono">
            {isEn ? "Subject Cohort Inventory · " : "受测者全量数据清单 · "}
            {isEn ? "Total " : "共 "}
            <span className="text-slate-300 font-bold">{totalItems}</span>
            {isEn ? " records" : " 条记录"}
          </div>
        )}

        <div className="text-[11px] text-slate-500 hidden sm:inline">
          {isEn
            ? "Use the right panel for archetype filtering & keyword search"
            : "可在右侧控制面板进行画像分类筛选与关键词检索"}
        </div>
      </div>

      {/* 表格区：内部平滑滚动，表头 sticky */}
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
              <th className="py-2.5 px-3">{isEn ? "Final Score" : "最终战绩"}</th>
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
              const clinicalSummary = def?.clinical_truth_summary || sub.clinical_summary || "--";
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
                    <span className="text-amber-300 font-semibold">
                      {roleTitle}
                    </span>
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
                    {sub.final_score}
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
                <td colSpan={9} className="py-8 text-center text-slate-500">
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
  );
}
