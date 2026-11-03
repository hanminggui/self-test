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

export interface VipTheme {
  vipRank: string;
  vipLevel: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBgLight: string;
  cardBorderLight: string;
  cardShadowLight: string;
  cardBgDark: string;
  cardBorderDark: string;
  cardShadowDark: string;
  glowAura: string;
  vipTagColor: string;
}

export const VIP_THEMES: Record<string, VipTheme> = {
  "Q1-CAL": {
    vipRank: "VIP·天元鎏金",
    vipLevel: "UR·帝尊",
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-100 dark:bg-amber-500/20",
    badgeBorder: "border-amber-600 dark:border-amber-400",
    badgeText: "text-amber-950 dark:text-amber-300",
    cardBgLight: "bg-gradient-to-b from-[#FFFDF2] via-[#FFFBEB] to-white",
    cardBorderLight: "border-amber-600",
    cardShadowLight: "shadow-[0_5px_0_#b45309]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#171306] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-amber-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#F59E0B]",
    glowAura: "rgba(245, 158, 11, 0.25)",
    vipTagColor: "bg-amber-500 text-stone-950 font-black",
  },
  "Q2-EVO": {
    vipRank: "VIP·通幽翡翠",
    vipLevel: "SSR·先知",
    accentColor: "#10B981",
    badgeBg: "bg-emerald-100 dark:bg-emerald-500/20",
    badgeBorder: "border-emerald-600 dark:border-emerald-400",
    badgeText: "text-emerald-950 dark:text-emerald-300",
    cardBgLight: "bg-gradient-to-b from-[#F2FDF7] via-[#ECFDF5] to-white",
    cardBorderLight: "border-emerald-600",
    cardShadowLight: "shadow-[0_5px_0_#047857]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#061710] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-emerald-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#10B981]",
    glowAura: "rgba(16, 185, 129, 0.25)",
    vipTagColor: "bg-emerald-500 text-stone-950 font-black",
  },
  "Q3-SEN": {
    vipRank: "VIP·苍穹沧澜",
    vipLevel: "SSR·明鉴",
    accentColor: "#0EA5E9",
    badgeBg: "bg-sky-100 dark:bg-sky-500/20",
    badgeBorder: "border-sky-600 dark:border-sky-400",
    badgeText: "text-sky-950 dark:text-sky-300",
    cardBgLight: "bg-gradient-to-b from-[#F2F9FD] via-[#F0F9FF] to-white",
    cardBorderLight: "border-sky-600",
    cardShadowLight: "shadow-[0_5px_0_#0369a1]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#06141c] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-sky-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#0EA5E9]",
    glowAura: "rgba(14, 165, 233, 0.25)",
    vipTagColor: "bg-sky-500 text-stone-950 font-black",
  },
  "Q4-PIO": {
    vipRank: "VIP·赤焰破晓",
    vipLevel: "SP·炽阳",
    accentColor: "#F43F5E",
    badgeBg: "bg-rose-100 dark:bg-rose-500/20",
    badgeBorder: "border-rose-600 dark:border-rose-400",
    badgeText: "text-rose-950 dark:text-rose-300",
    cardBgLight: "bg-gradient-to-b from-[#FFF3F4] via-[#FFF1F2] to-white",
    cardBorderLight: "border-rose-600",
    cardShadowLight: "shadow-[0_5px_0_#be123c]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#1b070b] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-rose-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#F43F5E]",
    glowAura: "rgba(244, 63, 94, 0.25)",
    vipTagColor: "bg-rose-500 text-white font-black",
  },
  "Q5-RET": {
    vipRank: "VIP·幻夜玄晶",
    vipLevel: "SSR·沉渊",
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-100 dark:bg-purple-500/20",
    badgeBorder: "border-purple-600 dark:border-purple-400",
    badgeText: "text-purple-950 dark:text-purple-300",
    cardBgLight: "bg-gradient-to-b from-[#FAF7FF] via-[#F5F3FF] to-white",
    cardBorderLight: "border-purple-600",
    cardShadowLight: "shadow-[0_5px_0_#6d28d9]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#120824] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-purple-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#8B5CF6]",
    glowAura: "rgba(139, 92, 246, 0.25)",
    vipTagColor: "bg-purple-500 text-white font-black",
  },
  "Q6-GAM": {
    vipRank: "VIP·先锋酸芒",
    vipLevel: "SP·诡道",
    accentColor: "#CCFF00",
    badgeBg: "bg-lime-100 dark:bg-[#CCFF00]/20",
    badgeBorder: "border-lime-600 dark:border-[#CCFF00]",
    badgeText: "text-lime-950 dark:text-[#CCFF00]",
    cardBgLight: "bg-gradient-to-b from-[#F9FFE6] via-[#F7FEE7] to-white",
    cardBorderLight: "border-lime-600",
    cardShadowLight: "shadow-[0_5px_0_#4d7c0f]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#101704] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-[#CCFF00]",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#CCFF00]",
    glowAura: "rgba(204, 255, 0, 0.25)",
    vipTagColor: "bg-[#CCFF00] text-stone-950 font-black",
  },
  "Q7-ARB": {
    vipRank: "VIP·雷霆极钴",
    vipLevel: "SSR·定乾",
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-100 dark:bg-blue-500/20",
    badgeBorder: "border-blue-600 dark:border-blue-400",
    badgeText: "text-blue-950 dark:text-blue-300",
    cardBgLight: "bg-gradient-to-b from-[#F2F7FF] via-[#EFF6FF] to-white",
    cardBorderLight: "border-blue-600",
    cardShadowLight: "shadow-[0_5px_0_#1d4ed8]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#060e22] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-blue-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#3B82F6]",
    glowAura: "rgba(59, 130, 246, 0.25)",
    vipTagColor: "bg-blue-500 text-white font-black",
  },
  "Q8-DRI": {
    vipRank: "VIP·极光幻彩",
    vipLevel: "SSR·逍遥",
    accentColor: "#EC4899",
    badgeBg: "bg-pink-100 dark:bg-pink-500/20",
    badgeBorder: "border-pink-600 dark:border-pink-400",
    badgeText: "text-pink-950 dark:text-pink-300",
    cardBgLight: "bg-gradient-to-b from-[#FFF2F9] via-[#FDF2F8] to-white",
    cardBorderLight: "border-pink-600",
    cardShadowLight: "shadow-[0_5px_0_#be185d]",
    cardBgDark: "dark:bg-gradient-to-b dark:from-[#1e0714] dark:to-[#0E0E16]",
    cardBorderDark: "dark:border-pink-400",
    cardShadowDark: "dark:shadow-[4px_4px_0px_#EC4899]",
    glowAura: "rgba(236, 72, 153, 0.25)",
    vipTagColor: "bg-pink-500 text-white font-black",
  },
};

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

  const sortedAssets = React.useMemo(() => {
    const list = assets.filter((item) => {
      if (filterTab === "UNLOCKED") return item.unlocked;
      if (filterTab === "LOCKED") return !item.unlocked;
      return true;
    });
    // 已点亮的排到最前 (unlocked first, locked after)
    return [...list].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return a.quadrant_code.localeCompare(b.quadrant_code);
    });
  }, [assets, filterTab]);

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
            disabled={loading}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-950 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none transition-all cursor-pointer active:translate-y-0.5 flex items-center justify-center disabled:opacity-60"
            title={isEn ? "Refresh" : "刷新资产"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500 dark:text-[#CCFF00]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 资产图鉴刷新交互提示 */}
      {loading && assets.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-50 dark:bg-white/5 border border-amber-300 dark:border-[#CCFF00]/30 text-xs font-bold text-stone-800 dark:text-[#CCFF00] animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-[#CCFF00]" />
          <span>正在同步认知资产图鉴与专属特技库...</span>
        </div>
      )}

      {loading && assets.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-10 h-10 text-stone-950 dark:text-[#CCFF00] animate-spin" />
          <p className="text-xs text-stone-700 dark:text-slate-400 font-bold">
            {isEn ? "Synchronizing cognitive assets..." : "正在同步认知资产图鉴..."}
          </p>
        </div>
      ) : (
        /* 响应式整齐网格排列 (已点亮优先排列在最前，每个图鉴专属 VIP 尊贵配色) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 items-stretch">
          {sortedAssets.map((item) => {
            const mythic = getMythicArchetype(item.quadrant_code);
            const arcane = getArcaneArchetype(item.quadrant_code);
            const totemLabel = isEn
              ? arcane.orderTitle
              : `${mythic.mythicTotem} · ${mythic.totemTitle}`;
            const vip = VIP_THEMES[item.quadrant_code] || VIP_THEMES["Q1-CAL"];

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
                className={`rounded-[26px] p-5 border-[2.5px] transition-all duration-200 flex flex-col justify-between h-full min-h-[380px] relative overflow-hidden cursor-pointer select-none active:scale-[0.98] ${
                  item.unlocked
                    ? `${vip.cardBgLight} ${vip.cardBgDark} ${vip.cardBorderLight} ${vip.cardBorderDark} ${vip.cardShadowLight} ${vip.cardShadowDark} hover:-translate-y-1`
                    : "bg-[#FFFDF8] dark:bg-[#0E0E16] border-stone-900/30 dark:border-white/10 opacity-75 shadow-[0_3px_0_#1c1917] dark:shadow-none hover:opacity-100"
                }`}
              >
                {/* 暗色模式氛围流光层 (兼容文字可读性，通过深色背景阻断，仅在边缘溢出柔光) */}
                {item.unlocked && (
                  <div
                    className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none opacity-20 dark:opacity-35 blur-2xl transition-opacity"
                    style={{ backgroundColor: vip.accentColor }}
                  />
                )}

                <div className="space-y-3 relative z-10">
                  {/* Top Row: Archetype Title Pill & Unlock Status */}
                  <div className="flex items-center justify-between gap-1.5 flex-nowrap">
                    <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-xl border-2 font-black shrink-0 ${
                          item.unlocked
                            ? `${vip.badgeBg} ${vip.badgeBorder} ${vip.badgeText} shadow-[0_1.5px_0_#1c1917] dark:shadow-none`
                            : "bg-stone-100 dark:bg-white/10 border-stone-300 dark:border-white/20 text-stone-700 dark:text-white font-bold"
                        }`}
                      >
                        {item.role_title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.unlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 dark:text-[#08080C] bg-[#D1FAE5] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black px-2 py-0.5 rounded-full shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-[#08080C]" />
                          <span>{isEn ? `×${item.count}` : `已收录 ×${item.count}`}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-700 dark:text-slate-200 bg-stone-100 dark:bg-white/10 border border-stone-300 dark:border-white/20 px-2 py-0.5 rounded-full font-bold">
                          <Lock className="w-3 h-3 text-stone-600 dark:text-slate-300" />
                          <span>{isEn ? "Locked" : "待探索"}</span>
                        </span>
                      )}
                      <span className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-700 dark:text-white">
                        <Eye className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Totem & Slogan */}
                  <div className="space-y-1">
                    <div className={`text-[11px] font-black truncate ${item.unlocked ? "text-amber-900 dark:text-[#CCFF00]" : "text-stone-700 dark:text-slate-200"}`}>
                      {totemLabel}
                    </div>
                    <div
                      className={`text-sm sm:text-base font-black tracking-tight leading-snug italic ${
                        item.unlocked
                          ? "text-stone-950 dark:text-white drop-shadow-sm"
                          : "text-stone-700 dark:text-slate-100"
                      }`}
                    >
                      “{item.praise_tagline}”
                    </div>
                  </div>

                  {/* Strength Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {item.strength_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                          item.unlocked
                            ? "bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/30 text-stone-950 dark:text-white shadow-[0_1.5px_0_#1c1917] dark:shadow-none"
                            : "bg-stone-50 dark:bg-white/10 border border-stone-400/40 dark:border-white/20 text-stone-700 dark:text-slate-200"
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Skills Preview (Feedback 4 & 5: 暗色模式高对比度可见度强化，无惧流光干扰) */}
                  {item.skills && item.skills.length > 0 && (
                    <div className="pt-2 border-t-2 border-stone-900/15 dark:border-white/20 space-y-2">
                      {item.skills.slice(0, 2).map((sk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="text-sm shrink-0">{sk.icon}</span>
                          <span className={`font-black truncate ${
                            item.unlocked ? "text-stone-950 dark:text-white" : "text-stone-700 dark:text-slate-100"
                          }`}>
                            {sk.name}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ml-auto shrink-0 border ${
                            item.unlocked
                              ? "bg-amber-100 dark:bg-[#CCFF00]/15 text-stone-950 dark:text-[#CCFF00] border-stone-900/30 dark:border-[#CCFF00]/40 shadow-xs"
                              : "bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-slate-200 border-stone-300 dark:border-white/20"
                          }`}>
                            {sk.type}
                          </span>
                        </div>
                      ))}
                      {item.skills.length > 2 && (
                        <div className="text-[10px] text-amber-800 dark:text-[#CCFF00] font-black text-center pt-1 hover:underline">
                          + 点击展开全部 {item.skills.length} 项技能
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Unlock / View Action */}
                <div className="pt-3.5 mt-3.5 border-t-2 border-stone-900/15 dark:border-white/10 relative z-10">
                  {item.unlocked && item.latest_session_id ? (
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
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs px-2.5 py-1 rounded-xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] text-stone-950 dark:text-[#CCFF00] font-black shrink-0">
                {selectedAsset.role_title}
              </span>
              <span className="text-xs text-stone-600 dark:text-slate-400 font-bold italic truncate">
                “{selectedAsset.praise_tagline}”
              </span>
            </div>
          ) : undefined
        }
        subtitle={
          selectedAsset ? (
            <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
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
        {selectedAsset && (() => {
          const userArchetypeLevel = selectedAsset.unlocked
            ? Math.min(3, Math.max(1, selectedAsset.count >= 3 ? 3 : selectedAsset.count >= 2 ? 2 : 1))
            : 0;

          return (
            <div className="space-y-6 py-3">
              {/* Unlock Status Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] flex items-center justify-between text-xs font-black">
                <span className="text-stone-700 dark:text-slate-300">
                  {isEn ? "Archetype Status" : "流派图鉴状态"}
                </span>
                {selectedAsset.unlocked ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#CCFF00]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEn ? `Collected ${selectedAsset.count} times` : `已收录 ${selectedAsset.count} 次`}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#CCFF00]/20 text-emerald-950 dark:text-[#CCFF00] border border-emerald-500/30">
                      {userArchetypeLevel === 3 ? (isEn ? "Lv.3 Master" : "3级 · 巅峰") : userArchetypeLevel === 2 ? (isEn ? "Lv.2 Adept" : "2级 · 进阶") : (isEn ? "Lv.1 Novice" : "1级 · 初阶")}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-stone-500 dark:text-slate-400">
                    <Lock className="w-4 h-4" />
                    <span>{isEn ? "Unclaimed (Lv.0)" : "待探索点亮 (未解锁)"}</span>
                  </span>
                )}
              </div>

              {/* Empowering Feedback */}
              <div className="space-y-2">
                <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500 dark:text-[#CCFF00]" />
                  <span>{isEn ? "Empowering Feedback" : "心智流派深度赋能"}</span>
                </div>
                <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed font-medium p-3.5 rounded-2xl bg-stone-50 dark:bg-[#12121C] border border-stone-900/15 dark:border-white/10">
                  {selectedAsset.empowering_feedback}
                </p>
              </div>

              {/* Strength Tags */}
              <div className="space-y-2">
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

              {/* Complete Skills List (Tiered unlock based on archetype level) */}
              {selectedAsset.skills && selectedAsset.skills.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-black text-stone-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600 dark:text-[#CCFF00]" />
                      <span>{isEn ? "Archetype Skills" : "流派专属认知特技"}</span>
                    </div>
                    {selectedAsset.unlocked && (
                      <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold">
                        {isEn ? `Current Tier: Lv.${userArchetypeLevel}` : `当前画像最高能级：${userArchetypeLevel} 级`}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {selectedAsset.skills.map((sk, idx) => {
                      const reqLevel = idx === 0 ? 1 : idx === 1 ? 2 : 3;
                      const isLit = userArchetypeLevel >= reqLevel;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border-2 transition-all space-y-1.5 ${
                            isLit
                              ? "bg-white dark:bg-[#0E0E16] border-stone-900 dark:border-white/30 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]"
                              : "bg-stone-100/70 dark:bg-white/5 border-dashed border-stone-300 dark:border-white/10 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-black text-xs text-stone-950 dark:text-white min-w-0">
                              <span className={`text-base ${isLit ? "" : "grayscale opacity-50"}`}>{sk.icon}</span>
                              <span className={`truncate ${isLit ? "text-stone-950 dark:text-white" : "text-stone-500 dark:text-slate-300"}`}>{sk.name}</span>
                              <span className="text-[10px] text-amber-800 dark:text-[#CCFF00] font-black shrink-0">
                                ({sk.type})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isLit ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D1FAE5] dark:bg-[#CCFF00]/15 text-emerald-900 dark:text-[#CCFF00] border border-emerald-500/40 dark:border-[#CCFF00]/40 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-[#CCFF00]" />
                                  <span>{isEn ? `Lv.${reqLevel} Active` : `${reqLevel}级·已点亮`}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-slate-300 border border-stone-300 dark:border-white/20 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>{isEn ? `Req. Lv.${reqLevel}` : `需达到 ${reqLevel} 级点亮`}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <p className={`text-[11px] leading-relaxed font-medium pl-6 ${isLit ? "text-stone-700 dark:text-slate-200" : "text-stone-500 dark:text-slate-400"}`}>
                            {sk.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
};
