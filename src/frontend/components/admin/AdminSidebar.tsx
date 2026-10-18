import React from "react";
import {
  Users,
  Brain,
  Layers,
  Award,
  Globe,
  GalleryHorizontal,
  Disc,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  Compass,
  Zap,
  Info,
} from "lucide-react";
import { ViewMode, SplitLineType, OctantStatsMap } from "../../types/admin";
import {
  OCTANT_SECTOR_CONFIGS,
  OCTANT_DETAILED_INFO,
} from "../../constants/adminConstants";

const ALL_OCTANTS = [
  "Q1-CAL",
  "Q4-PIO",
  "Q3-SEN",
  "Q5-RET",
  "Q6-GAM",
  "Q8-DRI",
  "Q2-EVO",
  "Q7-ARB",
];

interface AdminSidebarProps {
  viewMode: ViewMode;
  // COMPASS props
  isRotating: boolean;
  onToggleRotating: () => void;
  compassHoverStatus: string | null;
  // GLOBE / SECTOR props
  activeGlobeSector: string;
  onSelectActiveSector?: (sectorCode: string) => void;
  octantStatsMap: OctantStatsMap;
  // RECT props
  splitLine: SplitLineType;
  onSelectSplitLine: (split: SplitLineType) => void;
  // TABLE props
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalTableItems: number;
  tagCounts?: Record<string, number>;
  selectedTag?: string;
  onSelectTag?: (tag: string) => void;
  quadrantTitles?: Record<string, string>;
  // Global stats
  overallStats: {
    total: number;
    avgDStar: string;
    avgMRatio: string;
    maxScore: number;
  };
}

export default function AdminSidebar({
  viewMode,
  isRotating,
  onToggleRotating,
  compassHoverStatus,
  activeGlobeSector,
  onSelectActiveSector,
  octantStatsMap,
  splitLine,
  onSelectSplitLine,
  searchQuery,
  onSearchChange,
  totalTableItems,
  overallStats,
  tagCounts,
  selectedTag,
  onSelectTag,
  quadrantTitles,
}: AdminSidebarProps) {
  // 当前聚焦的象区（默认 Q1-CAL）
  const currentCode = activeGlobeSector || "Q1-CAL";
  const conf = OCTANT_SECTOR_CONFIGS[currentCode] || OCTANT_SECTOR_CONFIGS["Q1-CAL"];
  const detail = OCTANT_DETAILED_INFO[currentCode] || OCTANT_DETAILED_INFO["Q1-CAL"];
  const stats = octantStatsMap[currentCode] || {
    count: 0,
    percentage: "0%",
    avgDStar: "--",
    avgMRatio: "--",
  };

  const handleSectorClick = (code: string) => {
    if (onSelectActiveSector) {
      onSelectActiveSector(code);
    }
    if (viewMode === "TABLE" && onSelectTag) {
      onSelectTag(selectedTag === code ? "ALL" : code);
    }
  };

  return (
    <aside className="w-72 sm:w-80 md:w-84 h-full shrink-0 flex flex-col gap-2 glass-panel rounded-2xl border border-white/5 p-2.5 overflow-hidden justify-between select-none shadow-2xl">
      {/* ============================================================== */}
      {/* 1. 顶部：各视图特有交互控制卡片                                */}
      {/* ============================================================== */}
      <div className="shrink-0 space-y-2">
        {/* COMPASS 视图控制 */}
        {viewMode === "COMPASS" && (
          <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "12s" }} />
              <span>星系自转</span>
            </div>
            <button
              onClick={onToggleRotating}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                isRotating
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30 shadow-sm"
                  : "bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30"
              }`}
              title={isRotating ? "点击暂停星盘自转" : "点击开启星盘自转"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRotating ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{isRotating ? "自转中" : "已定格"}</span>
            </button>
          </div>
        )}

        {/* 2D 直角相图模式下的基准线控制 */}
        {viewMode === "RECT" && (
          <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-400" />
                <span>相变分割基准</span>
              </span>
              <span className="font-mono text-indigo-300 text-[10px]">{splitLine}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                onClick={() => onSelectSplitLine("BASELINE")}
                className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                  splitLine === "BASELINE"
                    ? "bg-indigo-600 text-white font-semibold border-indigo-400 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                基准(0.6, 0.8)
              </button>
              <button
                onClick={() => onSelectSplitLine("MEDIAN")}
                className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                  splitLine === "MEDIAN"
                    ? "bg-indigo-600 text-white font-semibold border-indigo-400 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                群体中位数
              </button>
              <button
                onClick={() => onSelectSplitLine("MEAN")}
                className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer border ${
                  splitLine === "MEAN"
                    ? "bg-indigo-600 text-white font-semibold border-indigo-400 shadow-sm"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                群体均值
              </button>
            </div>
          </div>
        )}

        {/* 数据明细 TABLE 模式下的搜索框 */}
        {viewMode === "TABLE" && (
          <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" />
                <span>数据检索</span>
              </span>
              <span className="font-mono text-slate-400 text-[10px]">{totalTableItems} 条记录</span>
            </div>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="搜索受测者 / 称号 / 标签..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-6 pr-2 py-1 rounded-lg bg-slate-950 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. 中部核心：【B端全维认知画像解读看板】 (可平滑纵向滚动)       */}
      {/* ============================================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
        {/* 2.1 8 象区快捷切换微药丸栏 (支持随时点击切换查看任意画像) */}
        <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>象区快速查阅 / 过滤</span>
            </span>
            <span className="text-[9px] text-slate-500">点击切换画像</span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {ALL_OCTANTS.map((code) => {
              const itemConf = OCTANT_SECTOR_CONFIGS[code];
              const isSelected = currentCode === code;
              return (
                <button
                  key={code}
                  onClick={() => handleSectorClick(code)}
                  className={`py-1 px-1 rounded-md text-[10px] font-medium transition-all flex flex-col items-center justify-center cursor-pointer border truncate ${
                    isSelected
                      ? "bg-indigo-600/30 border-indigo-400 text-white font-bold shadow-sm ring-1 ring-indigo-500/50"
                      : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                  title={`${itemConf?.name || code} (${code})`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mb-0.5"
                    style={{ backgroundColor: itemConf?.primaryColor || "#38bdf8" }}
                  />
                  <span className="truncate max-w-full text-[9px]">{itemConf?.name || code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2.2 象区身份名牌与方位标 (Header Badge) */}
        <div
          className="p-2.5 rounded-xl border relative overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: `${conf?.primaryColor || "#6366f1"}12`,
            borderColor: `${conf?.primaryColor || "#6366f1"}40`,
          }}
        >
          {/* 顶部微背景光晕 */}
          <div
            className="absolute top-0 right-0 w-28 h-28 -mr-8 -mt-8 rounded-full pointer-events-none opacity-20 blur-xl"
            style={{ backgroundColor: conf?.primaryColor || "#6366f1" }}
          />

          <div className="relative z-10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: conf?.primaryColor || "#38bdf8" }}
                />
                <span>{conf?.code}</span>
              </span>
              <span className="text-[10px] text-slate-300 font-mono font-medium">
                {conf?.quadrantName}
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                {conf?.name}
              </h3>
              <span className="text-[10px] text-amber-300 font-medium">
                {conf?.subTitle}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-snug">
              {conf?.desc}
            </p>
          </div>
        </div>

        {/* 2.3 群体样本分布指标 (4 格紧凑数据条) */}
        <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-slate-900/80 border border-white/5 text-center">
          <div className="p-1 rounded bg-black/30 border border-white/5">
            <div className="text-[8.5px] text-slate-400">样本人数</div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">{stats.count} 人</div>
          </div>
          <div className="p-1 rounded bg-black/30 border border-white/5">
            <div className="text-[8.5px] text-slate-400">群体占比</div>
            <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">{stats.percentage}</div>
          </div>
          <div className="p-1 rounded bg-black/30 border border-white/5">
            <div className="text-[8.5px] text-slate-400">均值 D*</div>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5">{stats.avgDStar}</div>
          </div>
          <div className="p-1 rounded bg-black/30 border border-white/5">
            <div className="text-[8.5px] text-slate-400">均值 M</div>
            <div className="text-xs font-mono font-bold text-purple-300 mt-0.5">{stats.avgMRatio}</div>
          </div>
        </div>

        {/* 2.4 【核心特质释义】 (B端人话核心解读，让非专业高管/HR一眼看懂) */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
            <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
            <span>核心特质人话释义 (B端洞察)</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
            {detail?.definition}
          </p>
        </div>

        {/* 2.5 【实战决策与攻坚特征】 (业务决策、风险偏好与攻关表现) */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
            <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
            <span>实战决策与攻坚特征</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
            {detail?.features}
          </p>
        </div>

        {/* 2.6 【流形能级分阶画像】 (梯队晋阶标准) */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-purple-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-purple-400 shrink-0" />
              <span>流形能级分阶画像</span>
            </span>
            <span className="text-[9px] text-slate-500 font-normal">晋级阶梯</span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            {/* 觉醒阶 */}
            <div className="p-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 leading-snug">
              <span className="text-indigo-300 font-semibold">{detail?.tiers.awakened}</span>
            </div>
            {/* 核心阶 */}
            <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 leading-snug">
              <span className="text-cyan-300 font-semibold">{detail?.tiers.core}</span>
            </div>
            {/* 被动阶 */}
            <div className="p-1.5 rounded-lg bg-slate-950/60 border border-white/5 leading-snug">
              <span className="text-slate-400 font-normal">{detail?.tiers.passive}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. 底部：大盘全局指标 (精致紧凑 2x2 网格)                      */}
      {/* ============================================================== */}
      <div className="shrink-0 pt-1.5 border-t border-white/5 space-y-1">
        <div className="text-[9.5px] text-slate-400 font-medium px-0.5 flex items-center justify-between">
          <span>大盘全局基准</span>
          <span className="font-mono text-slate-500">{overallStats.total} 份测评样本</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {/* 总参测人次 */}
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Users className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>人次</span>
            </div>
            <div className="text-xs font-bold font-mono text-white">{overallStats.total}</div>
          </div>

          {/* 平均相变突破度 D* */}
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Brain className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>均 D*</span>
            </div>
            <div className="text-xs font-bold font-mono text-cyan-400">{overallStats.avgDStar}</div>
          </div>

          {/* 平均元认知效率 M_ratio */}
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Layers className="w-3 h-3 text-purple-400 shrink-0" />
              <span>均 M</span>
            </div>
            <div className="text-xs font-bold font-mono text-purple-400">{overallStats.avgMRatio}</div>
          </div>

          {/* 群体最高战绩得分 */}
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <Award className="w-3 h-3 text-amber-400 shrink-0" />
              <span>最高分</span>
            </div>
            <div className="text-xs font-bold font-mono text-amber-400">{overallStats.maxScore}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
