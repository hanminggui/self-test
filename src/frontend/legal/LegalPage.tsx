import React, { useEffect } from "react";
import { Compass, ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { ChinesePrivacyContent } from "./privacy/zh";
import { EnglishPrivacyContent } from "./privacy/en";
import { ChineseTermsContent } from "./terms/zh";
import { EnglishTermsContent } from "./terms/en";

interface LegalPageProps {
  type: "privacy" | "terms";
}

export const LegalPage: React.FC<LegalPageProps> = ({ type: initialType }) => {
  const { locale, setLocale, t } = useLocale();
  const [currentType, setCurrentType] = React.useState<"privacy" | "terms">(initialType);

  // Sync with URL query parameter e.g. /privacy?lang=en
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get("lang");
    if (langParam === "en" || langParam === "en-US") {
      setLocale("en-US");
    } else if (langParam === "zh" || langParam === "zh-CN") {
      setLocale("zh-CN");
    }
  }, [setLocale]);

  // Handle browser back/forward or navigation
  useEffect(() => {
    setCurrentType(initialType);
  }, [initialType]);

  const isPrivacy = currentType === "privacy";

  return (
    <div className="min-h-screen min-h-dvh bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-950 dark:selection:bg-[#CCFF00]/30 dark:selection:text-[#CCFF00] pb-[env(safe-area-inset-bottom)]">
      {/* 顶部通栏导航 (适配安全区与移动端触控) */}
      <header className="sticky top-0 z-40 bg-[#FFFDF8]/90 dark:bg-[#08080C]/90 backdrop-blur-md border-b-2 border-stone-900/10 dark:border-white/10 px-4 sm:px-8 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between gap-3">
        <a
          href="/"
          className="flex items-center gap-2.5 text-stone-950 dark:text-white hover:opacity-80 transition-opacity group cursor-pointer min-w-0"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FBBF24] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center shrink-0 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]">
            <Compass className="w-4 h-4 text-stone-950 dark:text-[#CCFF00]" />
          </div>
          <div className="truncate">
            <div className="text-xs sm:text-sm font-black tracking-wide text-stone-900 dark:text-white truncate">
              Self-Test · {locale === "zh-CN" ? "思维星图" : "Mind Astrolabe"}
            </div>
            <div className="text-[10px] text-stone-500 dark:text-slate-400 font-mono truncate hidden xs:block">
              Legal & Compliance
            </div>
          </div>
        </a>

        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle />
          <a
            href="/"
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none transition-all cursor-pointer active:translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{t.legal?.backToHome || "返回首页"}</span>
          </a>
        </div>
      </header>

      {/* 页面主体内容 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-24 md:pb-12 space-y-6">
        {/* 顶部 Tab 切换与标题 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCurrentType("privacy");
                window.history.replaceState(null, "", "/privacy");
              }}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                isPrivacy
                  ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                  : "bg-white dark:bg-[#12121C] text-stone-700 dark:text-slate-300 border-stone-300 dark:border-white/15 hover:border-stone-900 dark:hover:border-white/30"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentType("terms");
                window.history.replaceState(null, "", "/terms");
              }}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                !isPrivacy
                  ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                  : "bg-white dark:bg-[#12121C] text-stone-700 dark:text-slate-300 border-stone-300 dark:border-white/15 hover:border-stone-900 dark:hover:border-white/30"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.legal?.termsOfService || "服务条款"}</span>
            </button>
          </div>

          <div className="pt-2">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-950 dark:text-white tracking-tight flex items-center gap-3">
              {isPrivacy ? (
                <>
                  <ShieldCheck className="w-7 h-7 text-amber-500 dark:text-[#CCFF00]" />
                  <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
                </>
              ) : (
                <>
                  <FileText className="w-7 h-7 text-amber-500 dark:text-[#CCFF00]" />
                  <span>{t.legal?.termsOfService || "服务条款"}</span>
                </>
              )}
            </h1>
            <p className="text-xs text-stone-500 dark:text-slate-400 font-mono mt-1.5 font-bold">
              {t.legal?.lastUpdated || "最后更新于"}: 2026-10-22
            </p>
          </div>
        </div>

        {/* 协议正文卡片容器 */}
        <div className="bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 rounded-[28px] p-5 sm:p-8 md:p-10 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          {isPrivacy ? (
            locale === "zh-CN" ? (
              <ChinesePrivacyContent />
            ) : (
              <EnglishPrivacyContent />
            )
          ) : locale === "zh-CN" ? (
            <ChineseTermsContent />
          ) : (
            <EnglishTermsContent />
          )}
        </div>
      </main>

      {/* 桌面/通用 Footer */}
      <footer className="border-t-2 border-stone-900/10 dark:border-white/10 py-6 text-center text-xs text-stone-500 dark:text-slate-400 mt-6 bg-[#FFFBEB] dark:bg-black/30">
        <div className="flex items-center justify-center gap-4 mb-2 font-bold">
          <button
            type="button"
            onClick={() => {
              setCurrentType("privacy");
              window.history.replaceState(null, "", "/privacy");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hover:text-stone-950 dark:hover:text-[#CCFF00] transition-colors cursor-pointer"
          >
            {t.legal?.privacyPolicy || "隐私政策"}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setCurrentType("terms");
              window.history.replaceState(null, "", "/terms");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hover:text-stone-950 dark:hover:text-[#CCFF00] transition-colors cursor-pointer"
          >
            {t.legal?.termsOfService || "服务条款"}
          </button>
          <span>•</span>
          <a href="/" className="hover:text-stone-950 dark:hover:text-[#CCFF00] transition-colors">
            {locale === "zh-CN" ? "返回评测" : "Explore Test"}
          </a>
        </div>
        <p className="font-mono text-[11px] text-stone-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Self-Test. Metacognitive Manifold Explorer. All rights reserved.
        </p>
      </footer>

      {/* Mobile Fixed Bottom Dock (触手可及的底部导航) */}
      <nav
        aria-label="Legal navigation dock"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF8]/95 dark:bg-[#0E0E16]/95 backdrop-blur-md border-t-2 border-stone-900/15 dark:border-white/15 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden flex items-center justify-between gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      >
        <button
          type="button"
          onClick={() => {
            setCurrentType("privacy");
            window.history.replaceState(null, "", "/privacy");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
            isPrivacy
              ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-sm"
              : "bg-white dark:bg-[#12121C] text-stone-700 dark:text-slate-300 border-stone-200 dark:border-white/10"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentType("terms");
            window.history.replaceState(null, "", "/terms");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
            !isPrivacy
              ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-sm"
              : "bg-white dark:bg-[#12121C] text-stone-700 dark:text-slate-300 border-stone-200 dark:border-white/10"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.legal?.termsOfService || "服务条款"}</span>
        </button>

        <a
          href="/"
          className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900/30 dark:border-white/20 text-stone-900 dark:text-white flex items-center justify-center shadow-sm"
          title="返回首页"
        >
          <ArrowLeft className="w-4 h-4" />
        </a>
      </nav>
    </div>
  );
};
