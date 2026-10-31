/**
 * Cognitive Twin Duel Page (src/frontend/pages/DuelPage.tsx)
 * 
 * Standalone public landing page for the viral "Cognitive Twin Duel" social comparison:
 * - Accessible via /duel/:sessionIdA/:sessionIdB
 * - Full dual-theme support: Scheme C Playful Dopamine (Light) & Scheme B Acid Cyber Editorial (Dark)
 * - Fetches duel comparison data from /api/duel/:idA/:idB
 * - Renders the TwinStarsJointPoster with high-DPI export & instant share links
 * - Features prominent "Challenge / Test My Cognition" CTA
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Compass,
  HelpCircle,
  ArrowRight,
  Swords,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { TwinStarsJointPoster } from "../components/share/TwinStarsJointPoster";
import {
  extractDuelSessionIdsFromUrl,
  buildDuelUrl,
  saveReferrerSessionId,
} from "../utils/sessionRoute";
import { DuelPosterData } from "../components/share/duelPosterGenerator";
import { DuelComparisonResult } from "../../backend/duel_engine";

interface DuelSessionSummary {
  id: string;
  subject_name: string;
  archetype: string;
  quadrant_code: string;
  diagnostic_profile?: {
    role_title?: string;
    praise_tagline?: string;
  };
  metrics?: Record<string, unknown>;
}

interface DuelDataResponse {
  sessionA: DuelSessionSummary;
  sessionB: DuelSessionSummary;
  comparison: DuelComparisonResult;
}

export const DuelPage: React.FC = () => {
  const { locale } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [sessionIds, setSessionIds] = useState<{ sessionIdA: string; sessionIdB: string } | null>(
    () => {
      return extractDuelSessionIdsFromUrl();
    }
  );

  const [duelData, setDuelData] = useState<DuelDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync route on mount & popstate
  useEffect(() => {
    const updateIds = () => {
      const ids = extractDuelSessionIdsFromUrl();
      setSessionIds(ids);
    };
    window.addEventListener("popstate", updateIds);
    return () => window.removeEventListener("popstate", updateIds);
  }, []);

  // Fetch duel data
  useEffect(() => {
    if (!sessionIds?.sessionIdA || !sessionIds?.sessionIdB) {
      setLoading(false);
      setError(
        isEn
          ? "No dual session IDs specified. Format: /duel/:sessionIdA/:sessionIdB"
          : "未指定对决双方的会话 ID。正确格式：/duel/:sessionIdA/:sessionIdB"
      );
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const fetchDuel = async () => {
      try {
        const url = `/api/duel/${encodeURIComponent(sessionIds.sessionIdA)}/${encodeURIComponent(sessionIds.sessionIdB)}?lang=${encodeURIComponent(locale)}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": locale },
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error ||
              (isEn
                ? "Assessment records not found or expired."
                : "对决的评测记录不存在或尚未完成。")
          );
        }

        const data = await res.json();
        if (!isCancelled) {
          setDuelData(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(
            err?.message ||
              (isEn ? "Failed to load duel comparison." : "加载双星对决数据失败。")
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDuel();

    return () => {
      isCancelled = true;
    };
  }, [sessionIds, locale, isEn]);

  const handleChallenge = () => {
    if (sessionIds?.sessionIdA) {
      saveReferrerSessionId(sessionIds.sessionIdA);
      window.location.href = `/?referrer=${encodeURIComponent(sessionIds.sessionIdA)}&duel=1`;
    } else {
      window.location.href = "/";
    }
  };

  const formattedPosterData: DuelPosterData | null = useMemo(() => {
    if (!duelData) return null;
    const sA = duelData.sessionA;
    const sB = duelData.sessionB;
    const comp = duelData.comparison;

    return {
      participantA: {
        sessionId: sA.id,
        subjectName: sA.subject_name,
        archetype: sA.archetype || sA.quadrant_code,
        roleTitle: sA.diagnostic_profile?.role_title,
        praiseTagline: sA.diagnostic_profile?.praise_tagline,
        metrics: sA.metrics,
      },
      participantB: {
        sessionId: sB.id,
        subjectName: sB.subject_name,
        archetype: sB.archetype || sB.quadrant_code,
        roleTitle: sB.diagnostic_profile?.role_title,
        praiseTagline: sB.diagnostic_profile?.praise_tagline,
        metrics: sB.metrics,
      },
      comparison: comp,
      locale,
      entryUrl: buildDuelUrl(sA.id, sB.id),
    };
  }, [duelData, locale]);

  return (
    <div className="min-h-screen bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex flex-col font-sans selection:bg-[#FBBF24] dark:selection:bg-[#CCFF00] selection:text-stone-950 dark:selection:text-[#08080C]">
      {/* 顶部全局导航栏 */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-[#08080C]/80 border-b-2 border-stone-900/10 dark:border-white/10 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 group cursor-pointer min-w-0"
            aria-label="Self-Test Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FBBF24] dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] group-hover:-translate-y-0.5 active:translate-y-0.5 transition-all shrink-0">
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-stone-950 dark:text-[#CCFF00]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-base tracking-tight text-stone-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-[#CCFF00] transition-colors truncate max-w-[140px] sm:max-w-none">
                Self-Test · {isEn ? "Twin Duel" : "双星对决"}
              </span>
              <span className="text-[10px] text-stone-500 dark:text-slate-400 font-bold hidden sm:inline">
                {isEn ? "4D Cognitive Manifold Comparison" : "4D 认知流形与互补特质对照"}
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />
            <LanguageToggle />

            {/* 核心行动点：测测我的认知 */}
            <button
              onClick={handleChallenge}
              type="button"
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] border-2 border-stone-900 dark:border-[#CCFF00] shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] flex items-center gap-1 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-950 dark:text-[#08080C]" />
              <span className="hidden xs:inline">{isEn ? "Test Now" : "测测我的认知"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-10">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
              <Swords className="w-8 h-8 text-stone-900 dark:text-[#CCFF00] animate-spin" />
            </div>
            <p className="text-base text-stone-800 dark:text-slate-300 font-bold">
              {isEn ? "Computing 4D cognitive distance & twin synergy..." : "正在计算 4D 认知流形欧氏距离与双星协同..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="max-w-xl mx-auto py-16 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-stone-900 dark:border-rose-500/40 flex items-center justify-center shadow-[0_4px_0_#1c1917] dark:shadow-none">
              <HelpCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white">
                {isEn ? "Duel Records Not Found" : "未找到对决记录"}
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleChallenge}
                type="button"
                className="px-7 py-3.5 rounded-2xl text-sm font-black bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-[2.5px] border-stone-900 dark:border-[#CCFF00] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] inline-flex items-center gap-2 cursor-pointer active:translate-y-1 active:shadow-none transition-all"
              >
                <Sparkles className="w-4 h-4 text-stone-950 dark:text-[#08080C]" />
                <span>{isEn ? "Start Free Metacognition Test" : "立即测测我的认知"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success / Duel Render */}
        {!loading && !error && formattedPosterData && (
          <TwinStarsJointPoster
            data={formattedPosterData}
            onChallenge={handleChallenge}
          />
        )}
      </main>

      {/* 底部页脚 */}
      <footer className="border-t-2 border-stone-900/10 dark:border-white/10 py-6 px-4 text-center text-xs text-stone-500 dark:text-slate-400 space-y-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center justify-center gap-4 text-stone-600 dark:text-slate-400 font-bold">
          <a href="/" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Home" : "首页"}
          </a>
          <a href="/privacy" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Privacy Policy" : "隐私政策"}
          </a>
          <a href="/terms" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Terms of Service" : "用户协议"}
          </a>
          <a href="/admin" className="hover:text-amber-800 dark:hover:text-[#CCFF00] transition-colors">
            {isEn ? "Admin Portal" : "管理控制台"}
          </a>
        </div>
        <p>© {new Date().getFullYear()} Self-Test (思维星图). All rights reserved.</p>
      </footer>
    </div>
  );
};
