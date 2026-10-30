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
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useLocale } from "../contexts/LocaleContext";
import { getMythicArchetype } from "../components/share/mythicArchetypes";
import { getArcaneArchetype } from "../components/share/arcaneArchetypes";

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

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const fetchAssets = useCallback(async () => {
    if (!user) {
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
        setAssets(data.assets || []);
        setUnlockedCount(data.unlocked_count || 0);
      }
    } catch {}
    setLoading(false);
  }, [user, locale]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, sessionSyncVersion]);

  if (!userLoading && !user) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-[28px] bg-white dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center mx-auto text-stone-900 dark:text-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
            {isEn ? "Sign in to view your Cognitive Assets" : "请先登录查看您的认知资产图鉴"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
            {isEn
              ? "Collect and unlock all 8 cognitive archetypes across your metacognitive assessments."
              : "登录后即可收集并点亮八大二元认知画像与神兽图腾，永久保存您的心智特技资产。"}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openAuthModal}
              className="px-7 py-3.5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] text-sm font-black border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              {isEn ? "Sign In Now" : "立即登录"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-stone-900/10 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FBBF24] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center text-stone-950 dark:text-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>{isEn ? "Cognitive Assets & Archetype Codex" : "认知资产 · 八大流派化身图鉴"}</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-[#12121C] border border-stone-900 dark:border-white/20 text-stone-900 dark:text-[#CCFF00] font-bold">
                /assets
              </span>
            </h1>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5 font-medium">
              {isEn
                ? "Every completed or claimed assessment unlocks the corresponding archetype in your personal cognitive codex."
                : "每次完成或认领认知评测，对应的流派神兽与四维特技将永久收录至您的个人认知资产库"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-[#FFFBEB] dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none flex items-center gap-3">
            <div className="text-xs text-stone-600 dark:text-slate-400 font-bold">{isEn ? "Unlocked" : "已点亮图鉴"}</div>
            <div className="text-base font-mono font-black text-stone-900 dark:text-[#CCFF00]">
              {unlockedCount} <span className="text-stone-400 dark:text-slate-500 text-xs">/ 8</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAssets}
            className="p-2.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none transition-all cursor-pointer"
            title={isEn ? "Refresh" : "刷新资产"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500 dark:text-[#CCFF00]" : ""}`} />
          </button>
        </div>
      </div>

      {loading && assets.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-10 h-10 text-stone-900 dark:text-[#CCFF00] animate-spin" />
          <p className="text-xs text-stone-600 dark:text-slate-400 font-bold">
            {isEn ? "Synchronizing cognitive assets..." : "正在同步认知资产图鉴..."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {assets.map((item) => {
            const mythic = getMythicArchetype(item.quadrant_code);
            const arcane = getArcaneArchetype(item.quadrant_code);
            const totemLabel = isEn
              ? arcane.orderTitle
              : `${mythic.mythicTotem} · ${mythic.totemTitle}`;

            return (
              <div
                key={item.quadrant_code}
                className={`rounded-[24px] p-5 border-2 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  item.unlocked
                    ? "bg-[#FFFBEB] dark:bg-[#0E0E16] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]"
                    : "bg-white/80 dark:bg-[#0E0E16]/60 border-stone-300 dark:border-white/10 opacity-75 hover:opacity-95"
                }`}
              >
                <div className="space-y-3.5 relative z-10">
                  {/* Top Row: Quadrant Code & Unlock Status */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                        item.unlocked
                          ? "bg-[#FEF3C7] dark:bg-[#12121C] border-stone-900 dark:border-[#CCFF00] text-stone-900 dark:text-[#CCFF00] font-black"
                          : "bg-stone-100 dark:bg-white/5 border-stone-300 dark:border-white/10 text-stone-400 dark:text-slate-500 font-bold"
                      }`}
                    >
                      {item.quadrant_code}
                    </span>

                    {item.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 dark:text-[#CCFF00] bg-emerald-100/80 dark:bg-[#CCFF00]/10 border border-emerald-600/40 dark:border-[#CCFF00]/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-[#CCFF00]" />
                        <span>{isEn ? `Collected ×${item.count}` : `已收录 ×${item.count}`}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 dark:text-slate-500 bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 px-2 py-0.5 rounded-full font-bold">
                        <Lock className="w-3 h-3" />
                        <span>{isEn ? "Unclaimed" : "待探索"}</span>
                      </span>
                    )}
                  </div>

                  {/* Totem & Role Title */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-amber-800 dark:text-[#CCFF00] truncate">
                      {totemLabel}
                    </div>
                    <h2
                      className={`text-xl font-black tracking-tight ${
                        item.unlocked
                          ? "text-stone-900 dark:text-white"
                          : "text-stone-400 dark:text-slate-500"
                      }`}
                    >
                      {item.role_title}
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-slate-400 italic line-clamp-1 font-medium">
                      “{item.praise_tagline}”
                    </p>
                  </div>

                  {/* Strength Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.strength_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                          item.unlocked
                            ? "bg-white dark:bg-[#12121C] border-stone-900 dark:border-white/20 text-stone-900 dark:text-slate-200"
                            : "bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/10 text-stone-400 dark:text-slate-500"
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Skills Preview */}
                  {item.skills && item.skills.length > 0 && (
                    <div className="pt-2 border-t-2 border-stone-900/10 dark:border-white/10 space-y-1.5">
                      {item.skills.slice(0, 2).map((sk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <span>{sk.icon}</span>
                          <span className={item.unlocked ? "text-stone-800 dark:text-slate-200 font-bold" : "text-stone-400 dark:text-slate-500"}>
                            {sk.name}
                          </span>
                          <span className="text-[9px] text-stone-500 dark:text-slate-500 font-bold ml-auto">{sk.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Metrics or Unlock Action */}
                <div className="pt-4 mt-4 border-t-2 border-stone-900/10 dark:border-white/10 relative z-10">
                  {item.unlocked && item.latest_session_id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/15 shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                          <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 font-bold">
                            <Zap className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
                            <span>Best d&apos;</span>
                          </span>
                          <span className="font-mono font-black text-sky-700 dark:text-cyan-300 text-xs">
                            {item.best_d_prime?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/15 shadow-[0_1.5px_0_#1c1917] dark:shadow-none">
                          <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 font-bold">
                            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-[#CCFF00]" />
                            <span>Best M</span>
                          </span>
                          <span className="font-mono font-black text-emerald-700 dark:text-[#CCFF00] text-xs">
                            {item.best_m_ratio?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/report/${item.latest_session_id}`)}
                        className="w-full py-2.5 px-3 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:text-[#08080C] text-stone-950 text-xs font-black border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-none flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-stone-950 dark:text-[#08080C]" />
                        <span>{isEn ? "Inspect Report" : "查看代表报告"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="w-full py-2.5 px-3 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-stone-700 dark:text-slate-300 text-xs font-bold shadow-[0_2px_0_#1c1917] dark:shadow-none flex items-center justify-center gap-1.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
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
    </div>
  );
};
