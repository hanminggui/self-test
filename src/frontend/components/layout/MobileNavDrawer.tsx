import React from "react";
import {
  Compass,
  Sparkles,
  Crown,
  Settings,
  Clock,
  LogOut,
  LogIn,
  Globe,
  FileText,
  Shield,
  ArrowRight,
  Home,
  Check,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useLocale } from "../../contexts/LocaleContext";
import { ThemeToggle } from "../ThemeToggle";
import { GameQuickControls } from "../game/GameQuickControls";
import { BottomSheet } from "../common/BottomSheet";

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  /** Optional custom anchor links for landing page */
  extraLinks?: Array<{
    label: string;
    href: string;
    onClick?: () => void;
  }>;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  extraLinks,
}) => {
  const { user, logout, openAuthModal } = useUser();
  const { locale, setLocale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const handleNav = (path: string) => {
    onClose();
    onNavigate(path);
  };

  const trustLevel = user?.metadata?.trust_level;
  const badge = user?.metadata?.badge;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showDragHandle={true}
      showCloseButton={true}
      desktopMaxWidth="sm:max-w-md"
      maxHeight="max-h-[88dvh]"
      title={
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-stone-900 dark:text-[#CCFF00]" />
          <span>{isEn ? "Navigation & Account" : "导航与账户控制"}</span>
        </div>
      }
      ariaLabel={isEn ? "Mobile Navigation Menu" : "移动端导航菜单"}
    >
      <div className="space-y-5">
        {/* 1. User Identity & Status Section */}
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2.5px_0_#1c1917] dark:shadow-none">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-[#FBBF24] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black flex items-center justify-center text-stone-950 dark:text-[#08080C] text-sm font-black shrink-0 shadow-[0_2px_0_#1c1917] dark:shadow-none">
                    {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-black text-stone-950 dark:text-white truncate">
                      {user.display_name}
                    </span>
                    {user.primary_provider === "linuxdo" && badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] dark:bg-[#1c1c28] text-stone-900 dark:text-[#CCFF00] border border-stone-900 dark:border-[#CCFF00]">
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-600 dark:text-slate-400">
                    <span className="capitalize font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-white/10 border border-stone-900/20 dark:border-white/20">
                      {user.primary_provider}
                    </span>
                    {trustLevel !== undefined && (
                      <span className="flex items-center gap-0.5 text-amber-800 dark:text-amber-400 font-bold">
                        <Shield className="w-3 h-3" />
                        L{trustLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Prominent Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-black transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.auth?.signOut || (isEn ? "Sign Out" : "退出当前登录")}</span>
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div>
                <div className="text-xs font-bold text-stone-600 dark:text-slate-400">
                  {isEn ? "Guest Explorer" : "当前为游客试玩身份"}
                </div>
                <div className="text-sm font-black text-stone-900 dark:text-white mt-0.5">
                  {isEn ? "Sign in to save records" : "登录以永久同步评测档案与图鉴"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] text-xs font-black border-2 border-stone-900 dark:border-black shadow-[0_2.5px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.auth?.signIn || (isEn ? "Sign In Now" : "立即登录 / 绑定账号")}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Primary Navigation Links */}
        <div className="space-y-1.5">
          <div className="px-1 text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-slate-400">
            {isEn ? "Navigation" : "快捷路由"}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNav("/")}
              className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100/50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none text-left cursor-pointer"
            >
              <Home className="w-4 h-4 text-amber-600 dark:text-[#CCFF00] shrink-0" />
              <span className="truncate">{isEn ? "Official Home" : "官网首页"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleNav("/test")}
              className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100/50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none text-left cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00] shrink-0" />
              <span className="truncate">{isEn ? "Assessment" : "认知评测"}</span>
            </button>

            {user && (
              <>
                <button
                  type="button"
                  onClick={() => handleNav("/history")}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100/50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none text-left cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-[#38BDF8] shrink-0" />
                  <span className="truncate">{isEn ? "Reports History" : "历史档案"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav("/assets")}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100/50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none text-left cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-purple-600 dark:text-[#CCFF00] shrink-0" />
                  <span className="truncate">{isEn ? "Archetype Assets" : "图鉴资产"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav("/settings")}
                  className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#12121C] hover:bg-amber-100/50 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white shadow-[0_2px_0_#1c1917] dark:shadow-none text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-cyan-600 dark:text-slate-400 shrink-0" />
                  <span className="truncate">{t.profile?.tabSettings || (isEn ? "Preferences" : "个人偏好设置")}</span>
                </button>
              </>
            )}
          </div>

          {/* Extra Anchor Links (e.g. for landing page) */}
          {extraLinks && extraLinks.length > 0 && (
            <div className="pt-2 space-y-1">
              {extraLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  onClick={(e) => {
                    onClose();
                    if (link.onClick) {
                      e.preventDefault();
                      link.onClick();
                    }
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-amber-100/60 dark:hover:bg-white/10 text-xs font-bold text-stone-800 dark:text-slate-200"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 3. System Preferences (Theme, Language, Effects) */}
        <div className="space-y-2 pt-2 border-t-2 border-stone-900/10 dark:border-white/10">
          <div className="px-1 text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-slate-400">
            {isEn ? "Preferences & Controls" : "偏好与视听控制"}
          </div>

          {/* Visual Theme Row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none">
            <span className="text-xs font-black text-stone-900 dark:text-white">
              {isEn ? "Visual Theme" : "视觉主题模式"}
            </span>
            <ThemeToggle />
          </div>

          {/* Language Row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none">
            <span className="flex items-center gap-2 text-xs font-black text-stone-900 dark:text-white">
              <Globe className="w-4 h-4 text-stone-700 dark:text-slate-400" />
              <span>{isEn ? "Display Language" : "界面语言"}</span>
            </span>
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-black/40 p-1 rounded-xl border border-stone-900/20 dark:border-white/20">
              <button
                type="button"
                onClick={() => setLocale("zh-CN")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  locale === "zh-CN"
                    ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] shadow-sm"
                    : "text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-white"
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => setLocale("en-US")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  locale === "en-US"
                    ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] shadow-sm"
                    : "text-stone-600 dark:text-slate-400 hover:text-stone-950 dark:hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Audio & Effects Row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900 dark:border-white/20 shadow-[0_2px_0_#1c1917] dark:shadow-none">
            <span className="flex items-center gap-2 text-xs font-black text-stone-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-[#CCFF00]" />
              <span>{isEn ? "Audio & Motion" : "视听与动效"}</span>
            </span>
            <GameQuickControls compact />
          </div>
        </div>

        {/* 4. Footer Legal Links */}
        <div className="pt-2 border-t border-stone-200 dark:border-white/10 flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 font-bold px-2">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              handleNav("/privacy");
            }}
            className="hover:text-stone-900 dark:hover:text-[#CCFF00] flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>{t.legal?.privacyPolicy || (isEn ? "Privacy Policy" : "隐私政策")}</span>
          </a>
          <span>·</span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              handleNav("/terms");
            }}
            className="hover:text-stone-900 dark:hover:text-[#CCFF00]"
          >
            {t.legal?.termsOfService || (isEn ? "Terms of Service" : "服务条款")}
          </a>
        </div>
      </div>
    </BottomSheet>
  );
};
