import React from "react";
import { Compass, Settings } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { useLocale } from "../contexts/LocaleContext";
import { ProfileSettings } from "../components/profile/ProfileSettings";

export const SettingsPage: React.FC = () => {
  const { user, loading: userLoading, openAuthModal } = useUser();
  const { locale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  if (!userLoading && !user) {
    return (
      <div className="min-h-screen min-h-dvh bg-[#FFFDF8] dark:bg-[#08080C] text-stone-900 dark:text-white flex items-center justify-center p-6 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-[28px] bg-white dark:bg-[#0E0E16] border-[2.5px] border-stone-900 dark:border-white/20 shadow-[0_6px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00] text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] flex items-center justify-center mx-auto text-stone-900 dark:text-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]">
            <Settings className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
            {isEn ? "Sign in to manage preferences" : "请先登录以管理个人偏好"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
            {isEn
              ? "Authenticate to customize your explorer identity, default report visibility, and connected OAuth providers."
              : "登录探索者账号后即可自定义个人名片、默认隐私级别及多端账号关联。"}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openAuthModal}
              className="px-7 py-3.5 rounded-2xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] text-sm font-black border-2 border-stone-900 dark:border-black shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              {t.profile?.signInBtn || (isEn ? "Sign In" : "立即登录")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8 min-h-dvh pb-[env(safe-area-inset-bottom)]">
      {userLoading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Compass className="w-8 h-8 text-stone-950 dark:text-[#CCFF00] animate-spin" />
          <p className="text-xs text-stone-700 dark:text-slate-400 font-bold">
            {isEn ? "Loading preferences..." : "正在加载个人偏好设置..."}
          </p>
        </div>
      ) : (
        <ProfileSettings />
      )}
    </div>
  );
};
