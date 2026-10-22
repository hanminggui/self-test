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
      <div className="min-h-screen bg-[#080a10] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Crown className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isEn ? "Sign in to view your Cognitive Assets" : "请先登录查看您的认知资产图鉴"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn
              ? "Collect and unlock all 8 cognitive archetypes across your metacognitive assessments."
              : "登录后即可收集并点亮八大二元认知画像与神兽图腾，永久保存您的心智特技资产。"}
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-semibold shadow-lg cursor-pointer"
          >
            {isEn ? "Sign In Now" : "立即登录"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-amber-500/20 to-indigo-500/20 border border-purple-400/30 flex items-center justify-center text-amber-300 shadow-lg shadow-purple-950/30">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>{isEn ? "Cognitive Assets & Archetype Codex" : "认知资产 · 八大流派化身图鉴"}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                /assets
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn
                ? "Every completed or claimed assessment unlocks the corresponding archetype in your personal cognitive codex."
                : "每次完成或认领认知评测，对应的流派神兽与四维特技将永久收录至您的个人认知资产库"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
            <div className="text-xs text-slate-400">{isEn ? "Unlocked" : "已点亮图鉴"}</div>
            <div className="text-base font-mono font-extrabold text-amber-300">
              {unlockedCount} <span className="text-slate-500 text-xs">/ 8</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAssets}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isEn ? "Refresh" : "刷新资产"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {loading && assets.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-xs text-slate-400">
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
                className={`rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  item.unlocked
                    ? "bg-gradient-to-b from-amber-950/25 via-slate-900/90 to-[#0b0e17] border-amber-500/35 shadow-xl shadow-amber-950/20 hover:border-amber-400/60"
                    : "bg-white/[0.015] border-white/[0.07] opacity-70 hover:opacity-90"
                }`}
              >
                {item.unlocked && (
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="space-y-3.5 relative z-10">
                  {/* Top Row: Quadrant Code & Unlock Status */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                        item.unlocked
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-300 font-bold"
                          : "bg-white/5 border-white/10 text-slate-500"
                      }`}
                    >
                      {item.quadrant_code}
                    </span>

                    {item.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{isEn ? `Collected ×${item.count}` : `已收录 ×${item.count}`}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        <span>{isEn ? "Unclaimed" : "待探索"}</span>
                      </span>
                    )}
                  </div>

                  {/* Totem & Role Title */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-amber-400/80 truncate">
                      {totemLabel}
                    </div>
                    <h2
                      className={`text-xl font-black tracking-tight ${
                        item.unlocked
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300"
                          : "text-slate-400"
                      }`}
                    >
                      {item.role_title}
                    </h2>
                    <p className="text-xs text-slate-400 italic line-clamp-1">
                      “{item.praise_tagline}”
                    </p>
                  </div>

                  {/* Strength Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.strength_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${
                          item.unlocked
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                            : "bg-white/[0.02] border-white/5 text-slate-500"
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Skills Preview */}
                  {item.skills && item.skills.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                      {item.skills.slice(0, 2).map((sk, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <span>{sk.icon}</span>
                          <span className={item.unlocked ? "text-slate-200 font-medium" : "text-slate-500"}>
                            {sk.name}
                          </span>
                          <span className="text-[9px] text-slate-500 ml-auto">{sk.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Metrics or Unlock Action */}
                <div className="pt-4 mt-4 border-t border-white/[0.06] relative z-10">
                  {item.unlocked && item.latest_session_id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span>Best d&apos;</span>
                          </span>
                          <span className="font-mono font-bold text-cyan-300 text-xs">
                            {item.best_d_prime?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                          <span className="text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-purple-400" />
                            <span>Best M</span>
                          </span>
                          <span className="font-mono font-bold text-purple-300 text-xs">
                            {item.best_m_ratio?.toFixed(2) ?? "--"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/report/${item.latest_session_id}`)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isEn ? "Inspect Report" : "查看代表报告"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
