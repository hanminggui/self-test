import React, { useEffect, useState, useCallback } from "react";
import {
  Crown,
  Sparkles,
  Lock,
  ArrowRight,
  Compass,
  Zap,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Eye,
  Shield,
  Layers,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useLocale } from "../contexts/LocaleContext";
import { getMythicArchetype } from "../components/share/mythicArchetypes";
import { getArcaneArchetype } from "../components/share/arcaneArchetypes";
import { getArchetypeDefinition } from "../../backend/archetype_matrix";
import { BottomSheet } from "../components/common/BottomSheet";

interface CognitiveAssetItem {
  quadrant_code: string;
  archetype: string;
  role_title: string;
  english_title: string;
  praise_tagline: string;
  strength_tags: string[];
  empowering_feedback: string;
  skills: Array<{ icon: string; type: string; name: string; desc: string }>;
  unlocked: boolean;
  count: number;
  best_d_prime: number | null;
  best_m_ratio: number | null;
  latest_session_id: string | null;
  latest_unlocked_at: string | null;
}

interface AssetsPageProps {
  onNavigate?: (path: string) => void;
}

export const AssetsPage: React.FC<AssetsPageProps> = ({ onNavigate }) => {
  const { user, loading: userLoading, openAuthModal, sessionSyncVersion } = useUser();
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [assets, setAssets] = useState<CognitiveAssetItem[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "UNLOCKED" | "LOCKED">("ALL");
  const [selectedAsset, setSelectedAsset] = useState<CognitiveAssetItem | null>(null);

  const filteredAssets = assets.filter((item) => {
    if (filterTab === "UNLOCKED") return item.unlocked;
    if (filterTab === "LOCKED") return !item.unlocked;
    return true;
  });

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const DEFAULT_QUADRANTS = ["Q1-CAL", "Q2-EVO", "Q3-SEN", "Q4-PIO", "Q5-RET", "Q6-GAM", "Q7-ARB", "Q8-DRI"];

  const getDefaultAssets = useCallback((loc: any): CognitiveAssetItem[] => {
    return DEFAULT_QUADRANTS.map((code) => {
      const def = getArchetypeDefinition(code, loc);
      return {
        quadrant_code: def.quadrant_code,
        archetype: def.archetype,
        role_title: def.role_title,
        english_title: def.english_title,
        praise_tagline: def.praise_tagline,
        strength_tags: def.strength_tags,
        empowering_feedback: def.empowering_feedback,
        skills: def.skills,
        unlocked: false,
        count: 0,
        best_d_prime: null,
        best_m_ratio: null,
        latest_session_id: null,
        latest_unlocked_at: null,
      };
    });
  }, []);

  const fetchAssets = useCallback(async () => {
    if (!user) {
      setAssets(getDefaultAssets(locale));
      setUnlockedCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/me/assets?lang=${encodeURIComponent(locale)}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || getDefaultAssets(locale));
        setUnlockedCount(data.unlocked_count || 0);
      } else {
        setAssets(getDefaultAssets(locale));
        setUnlockedCount(0);
      }
    } catch {
      setAssets(getDefaultAssets(locale));
      setUnlockedCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, locale, getDefaultAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, sessionSyncVersion]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8 min-h-dvh pb-[env(safe-area-inset-bottom)]">
      {/* Guest Mode Notice Banner */}
      {!user && !userLoading && (
        <div className="p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shrink-0 text-stone-950 dark:text-[#CCFF00]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
                {isEn ? "Guest Exploration Mode" : "游客图鉴探索模式"}
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">
                {isEn
                  ? "Browse all 8 cognitive archetypes and skills. Sign in or complete an assessment to unlock!"
                  : "点击卡片可查看流派专属认知特技与心智阐释。登录或完成评测即可永久点亮收录！"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAuthModal}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:text-[#08080C] text-stone-950 font-black text-xs border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none cursor-pointer shrink-0 active:translate-y-0.5"
          >
            {isEn ? "Sign In" : "立即登录"}
          </button>
        </div>
      )}
      {/* Filter Tabs Bar (全部 / 已解锁 / 待探索) & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b-2 border-stone-900/10 dark:border-white/10 pb-5">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setFilterTab("ALL")}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterTab === "ALL"
                ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none"
                : "text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white"
            }`}
          >
            {isEn ? "All" : "全部图鉴"} ({assets.length || 8})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("UNLOCKED")}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === "UNLOCKED"
                ? "bg-[#D1FAE5] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none"
                : "text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>{isEn ? "Unlocked" : "已点亮"} ({unlockedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("LOCKED")}
            className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === "LOCKED"
                ? "bg-[#FFE4E6] dark:bg-[#FF3366] text-stone-950 dark:text-white border-2 border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-none"
                : "text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-stone-600 dark:text-slate-400" />
            <span>{isEn ? "Locked" : "待探索"} ({(assets.length || 8) - unlockedCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500 dark:text-[#CCFF00]" />
            <span className="text-xs font-bold text-stone-700 dark:text-slate-300">{unlockedCount} / 8</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-[#CCFF00]/20 text-amber-900 dark:text-[#CCFF00]">
              {Math.round((unlockedCount / 8) * 100)}%
            </span>
          </div>

          <button
            type="button"
            onClick={fetchAssets}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none transition-all cursor-pointer active:translate-y-0.5 flex items-center justify-center"
            title={isEn ? "Refresh" : "刷新资产"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500 dark:text-[#CCFF00]" : ""}`} />
          </button>
        </div>
      </div>

      {loading && assets.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-10 h-10 text-stone-950 dark:text-[#CCFF00] animate-spin" />
          <p className="text-xs text-stone-700 dark:text-slate-400 font-bold">
            {isEn ? "Synchronizing cognitive assets..." : "正在同步认知资产图鉴..."}
          </p>
        </div>
      ) : (
        /* Mobile Waterfall / Masonry Cards Stream */
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-4 [column-fill:_balance]">
          {filteredAssets.map((item) => {
            const mythic = getMythicArchetype(item.quadrant_code);
            const arcane = getArcaneArchetype(item.quadrant_code);
            const totemLabel = isEn
              ? arcane.orderTitle
              : `${mythic.mythicTotem} · ${mythic.totemTitle}`;

            return (
              <div
                key={item.quadrant_code}
                data-testid="archetype-card"
                onClick={() => setSelectedAsset(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedAsset(item);
                  }
                }}
                className={`break-inside-avoid mb-4 rounded-[26px] p-5 border-[2.5px] transition-all duration-200 flex flex-col justify-between relative overflow-hidden cursor-pointer select-none active:scale-[0.98] ${
                  item.unlocked
                    ? "bg-[#FFFBEB] dark:bg-[#0E0E16] border-stone-900 dark:border-[#CCFF00] shadow-[0_5px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] hover:-translate-y-0.5"
                    : "bg-[#FFFDF8] dark:bg-[#0A0A10] border-stone-900/40 dark:border-white/10 opacity-80 shadow-[0_3px_0_#1c1917] dark:shadow-none hover:opacity-100"
                }`}
              >
                <div className="space-y-3 relative z-10">
                  {/* Top Row: Quadrant Code, Unlock Status & Detail indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border-2 ${
                        item.unlocked
                          ? "bg-[#FEF3C7] dark:bg-[#12121C] border-stone-900 dark:border-[#CCFF00] text-stone-950 dark:text-[#CCFF00] font-black shadow-[0_1.5px_0_#1c1917]"
                          : "bg-stone-100 dark:bg-white/5 border-stone-300 dark:border-white/10 text-stone-500 dark:text-slate-500 font-bold"
                      }`}
                    >
                      {item.quadrant_code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.unlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 dark:text-[#CCFF00] bg-[#D1FAE5] dark:bg-[#CCFF00]/10 border-2 border-stone-900 dark:border-[#CCFF00]/30 px-2 py-0.5 rounded-full shadow-[0_1.5px_0_#1c1917]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-[#CCFF00]" />
                          <span>{isEn ? `×${item.count}` : `已收录 ×${item.count}`}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-slate-500 bg-stone-100 dark:bg-white/5 border border-stone-300 dark:border-white/10 px-2 py-0.5 rounded-full font-bold">
                          <Lock className="w-3 h-3" />
                          <span>{isEn ? "Locked" : "待探索"}</span>
                        </span>
                      )}
                      <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-slate-300">
                        <Eye className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Totem & Role Title */}
                  <div className="space-y-1">
                    <div className={`text-[11px] font-black truncate ${item.unlocked ? "text-amber-900 dark:text-[#CCFF00]" : "text-stone-500 dark:text-slate-300"}`}>
                      {totemLabel}
                    </div>
                    <h2
                      className={`text-lg sm:text-xl font-black tracking-tight ${
                        item.unlocked
                          ? "text-stone-950 dark:text-white"
                          : "text-stone-600 dark:text-slate-300"
                      }`}
                    >
                      {item.role_title}
                    </h2>
                    <p className={`text-xs italic line-clamp-2 font-bold ${item.unlocked ? "text-stone-700 dark:text-slate-300" : "text-stone-500 dark:text-slate-400"}`}>
                      “{item.praise_tagline}”
                    </p>
                  </div>

                  {/* Strength Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {item.strength_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                          item.unlocked
                            ? "bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-slate-200 shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
                            : "bg-stone-50 dark:bg-white/5 border border-stone-300/60 dark:border-white/10 text-stone-500 dark:text-slate-300"
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Skills Preview */}
                  {item.skills && item.skills.length > 0 && (
                    <div className="pt-2 border-t-2 border-stone-900/15 dark:border-white/10 space-y-1.5">
                      {item.skills.slice(0, 2).map((sk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <span>{sk.icon}</span>
                          <span className={item.unlocked ? "text-stone-950 dark:text-slate-200 font-bold truncate" : "text-stone-500 dark:text-slate-500 truncate"}>
                            {sk.name}
                          </span>
                          <span className="text-[9px] text-stone-600 dark:text-slate-400 font-black ml-auto shrink-0">{sk.type}</span>
                        </div>
                      ))}
                      {item.skills.length > 2 && (
                        <div className="text-[10px] text-amber-700 dark:text-[#CCFF00] font-bold text-center pt-0.5">
                          + 点击展开全部 {item.skills.length} 项技能
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Metrics or Unlock Action */}
                <div className="pt-3.5 mt-3.5 border-t-2 border-stone-900/15 dark:border-white/10 relative z-10">
                  {item.unlocked && item.latest_session_id ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/15 shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                          <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1 font-bold">
                            <Zap className="w-3 h-3 text-sky-700 dark:text-cyan-400" />
                            <span>Best d&apos;</span>
                          </span>
                          <span className="font-mono font-black text-sky-900 dark:text-cyan-300 text-xs">
                            {item.best_d_prime?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/15 shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                          <span className="text-stone-600 dark:text-slate-400 flex items-center gap-1 font-bold">
                            <TrendingUp className="w-3 h-3 text-emerald-700 dark:text-[#CCFF00]" />
                            <span>Best M</span>
                          </span>
                          <span className="font-mono font-black text-emerald-900 dark:text-[#CCFF00] text-xs">
                            {item.best_m_ratio?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/report/${item.latest_session_id}`);
                        }}
                        className="w-full min-h-[44px] py-2.5 px-3 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:text-[#08080C] text-stone-950 font-black text-xs border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-stone-950 dark:text-[#08080C]" />
                        <span>{isEn ? "Inspect Report" : "查看代表报告"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/");
                      }}
                      className="w-full min-h-[44px] py-2.5 px-3 rounded-2xl bg-[#FFFDF8] hover:bg-amber-100 dark:bg-[#12121C] dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-white font-bold text-xs shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{isEn ? "Start Test to Unlock" : "参与评测以解锁"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Touch-friendly BottomSheet Detail Drawer */}
      <BottomSheet
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        title={
          selectedAsset ? (
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] text-stone-950 dark:text-[#CCFF00] font-black">
                {selectedAsset.quadrant_code}
              </span>
              <span className="text-base sm:text-lg font-black text-stone-950 dark:text-white truncate">
                {selectedAsset.role_title}
              </span>
            </div>
          ) : undefined
        }
        subtitle={
          selectedAsset ? (
            <span className="text-xs text-stone-500 dark:text-slate-400 font-bold">
              {isEn
                ? getArcaneArchetype(selectedAsset.quadrant_code).orderTitle
                : `${getMythicArchetype(selectedAsset.quadrant_code).mythicTotem} · ${getMythicArchetype(selectedAsset.quadrant_code).totemTitle}`}
            </span>
          ) : undefined
        }
        desktopMaxWidth="sm:max-w-xl"
        footer={
          selectedAsset && (
            <div className="flex items-center gap-3 w-full">
              {selectedAsset.unlocked && selectedAsset.latest_session_id ? (
                <button
                  type="button"
                  onClick={() => {
                    const sid = selectedAsset.latest_session_id;
                    setSelectedAsset(null);
                    navigate(`/report/${sid}`);
                  }}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:text-[#08080C] text-stone-950 font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                  <span>{isEn ? "View Representative Report" : "查看代表报告"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
                    navigate("/test");
                  }}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:text-[#08080C] text-stone-950 font-black text-xs sm:text-sm border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                  <span>{isEn ? "Start Assessment to Unlock" : "立即参与评测点亮"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="min-h-[44px] px-4 py-3 rounded-2xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 text-xs sm:text-sm font-bold text-stone-800 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none cursor-pointer"
              >
                {isEn ? "Close" : "关闭"}
              </button>
            </div>
          )
        }
      >
        {selectedAsset && (
          <div className="space-y-4 py-1">
            {/* Tagline */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900/20 dark:border-white/20 text-stone-900 dark:text-slate-100 text-xs italic font-bold">
              “{selectedAsset.praise_tagline}”
            </div>

            {/* Unlock Status / Summary KPI Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-stone-700 dark:text-slate-300">
                  {isEn ? "Archetype Status" : "流派图鉴状态"}
                </span>
                {selectedAsset.unlocked ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#CCFF00]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEn ? `Collected ${selectedAsset.count} times` : `已收录 ${selectedAsset.count} 次`}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-stone-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                    <span>{isEn ? "Unclaimed" : "待探索点亮"}</span>
                  </span>
                )}
              </div>

              {selectedAsset.unlocked && (
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12121C] border border-stone-900/15 dark:border-white/20">
                    <div className="text-[10px] text-stone-500 dark:text-slate-400 font-sans font-bold">
                      最高敏感度 Best d&apos;
                    </div>
                    <div className="text-sm font-black text-sky-800 dark:text-cyan-300">
                      {selectedAsset.best_d_prime?.toFixed(2) ?? "--"}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#12121C] border border-stone-900/15 dark:border-white/20">
                    <div className="text-[10px] text-stone-500 dark:text-slate-400 font-sans font-bold">
                      最高元认知 Best M_ratio
                    </div>
                    <div className="text-sm font-black text-emerald-800 dark:text-[#CCFF00]">
                      {selectedAsset.best_m_ratio?.toFixed(2) ?? "--"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Empowering Feedback */}
            <div className="space-y-1.5">
              <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500 dark:text-[#CCFF00]" />
                <span>{isEn ? "Empowering Feedback" : "心智流派深度赋能"}</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed font-medium p-3.5 rounded-2xl bg-stone-50 dark:bg-[#12121C] border border-stone-900/15 dark:border-white/10">
                {selectedAsset.empowering_feedback}
              </p>
            </div>

            {/* Strength Tags */}
            <div className="space-y-1.5">
              <div className="text-xs font-black text-stone-900 dark:text-white">
                {isEn ? "Core Strengths" : "核心优势特质"}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.strength_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-white font-bold shadow-[0_2px_0_#1c1917] dark:shadow-none"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Complete Skills List */}
            {selectedAsset.skills && selectedAsset.skills.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-[#CCFF00]" />
                  <span>{isEn ? "Complete Archetype Skills" : "流派专属认知特技"} ({selectedAsset.skills.length})</span>
                </div>
                <div className="space-y-2">
                  {selectedAsset.skills.map((sk, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-[#0E0E16] border-2 border-stone-900/20 dark:border-white/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-xs text-stone-950 dark:text-white">
                          <span className="text-base">{sk.icon}</span>
                          <span>{sk.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#12121C] border border-stone-900 dark:border-white/20 text-stone-900 dark:text-[#CCFF00]">
                          {sk.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-slate-300 leading-relaxed font-medium pl-6">
                        {sk.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
