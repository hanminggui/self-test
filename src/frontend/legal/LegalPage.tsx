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
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 顶部通栏导航 */}
      <header className="sticky top-0 z-40 bg-[#07090e]/80 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2.5 text-white hover:text-amber-300 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center group-hover:border-amber-400/40 transition-colors">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">
              Self-Test · {locale === "zh-CN" ? "思维星图" : "Mind Astrolabe"}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Mind Astrolabe
            </div>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.legal?.backToHome || "返回首页"}</span>
          </a>
        </div>
      </header>

      {/* 页面主体内容 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* 顶部 Tab 切换与标题 */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentType("privacy");
                window.history.replaceState(null, "", "/privacy");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isPrivacy
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
            </button>
            <button
              onClick={() => {
                setCurrentType("terms");
                window.history.replaceState(null, "", "/terms");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                !isPrivacy
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.legal?.termsOfService || "服务条款"}</span>
            </button>
          </div>

          <div className="pt-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              {isPrivacy ? (
                <>
                  <ShieldCheck className="w-7 h-7 text-amber-400" />
                  <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
                </>
              ) : (
                <>
                  <FileText className="w-7 h-7 text-amber-400" />
                  <span>{t.legal?.termsOfService || "服务条款"}</span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1.5">
              {t.legal?.lastUpdated || "最后更新于"}: 2026-10-22
            </p>
          </div>
        </div>

        {/* 协议正文卡片容器 */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-xl shadow-2xl">
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

      {/* 底部 Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-400 mt-12 bg-black/30">
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => {
              setCurrentType("privacy");
              window.history.replaceState(null, "", "/privacy");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            {t.legal?.privacyPolicy || "隐私政策"}
          </button>
          <span>•</span>
          <button
            onClick={() => {
              setCurrentType("terms");
              window.history.replaceState(null, "", "/terms");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="hover:text-amber-300 transition-colors cursor-pointer"
          >
            {t.legal?.termsOfService || "服务条款"}
          </button>
          <span>•</span>
          <a href="/" className="hover:text-amber-300 transition-colors">
            {locale === "zh-CN" ? "返回评测" : "Explore Test"}
          </a>
        </div>
        <p className="font-mono text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Self-Test. Metacognitive Manifold Explorer. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
