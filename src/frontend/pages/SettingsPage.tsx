import React from "react";
import { Settings, Compass, Globe } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useLocale } from "../contexts/LocaleContext";
import { ProfileSettings } from "../components/profile/ProfileSettings";

export const SettingsPage: React.FC = () => {
  const { user, loading: userLoading, openAuthModal } = useUser();
  const { locale, setLocale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  if (!userLoading && !user) {
    return (
      <div className="min-h-screen bg-[#080a10] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Settings className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isEn ? "Sign in to manage preferences" : "请先登录以管理个人偏好"}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn
              ? "Authenticate to customize your explorer identity, default report visibility, and connected OAuth providers."
              : "登录探索者账号后即可自定义个人名片、默认隐私级别及多端账号关联。"}
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-semibold shadow-lg cursor-pointer"
          >
            {t.profile?.signInBtn || (isEn ? "Sign In" : "立即登录")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Page Title Bar (Inline inside workspace, no fixed top bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/30">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{t.profile?.tabSettings || (isEn ? "Profile & Preferences" : "个人资料与偏好设置")}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                /settings
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn
                ? "Configure your public explorer persona, default report visibility, and multi-provider identity links"
                : "管理您的探索者名片、评测报告默认公开范围与第三方身份认证绑定"}
            </p>
          </div>
        </div>

        {/* Language Quick Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">{isEn ? "Language:" : "语言偏好:"}</span>
          <button
            type="button"
            onClick={() => setLocale("zh-CN")}
            className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
              locale === "zh-CN" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLocale("en-US")}
            className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
              locale === "en-US" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {userLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">
            {isEn ? "Loading preferences..." : "正在加载个人偏好设置..."}
          </p>
        </div>
      ) : (
        <ProfileSettings />
      )}
    </div>
  );
};
