import React, { useState, useRef, useEffect } from "react";
import { User as UserIcon, LogOut, ChevronDown, Compass, Shield, Activity, Settings } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useLocale } from "../../contexts/LocaleContext";

export const UserNav: React.FC = () => {
  const { user, logout, openAuthModal, hasAnyProvider } = useUser();
  const { t } = useLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trustLevel = user?.metadata?.trust_level;
  const badge = user?.metadata?.badge;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {!user ? (
          // Guest State: Sign In Button
          hasAnyProvider ? (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-amber-50 border border-stone-900/20 hover:border-stone-900 text-xs font-bold text-stone-900 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:hover:border-amber-500/35 dark:text-slate-200 dark:hover:text-white transition-all duration-150 shadow-sm cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t.auth?.signIn || "登录"}</span>
            </button>
          ) : null
        ) : (
          // Logged In State: User Avatar & Dropdown
          <div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-white hover:bg-stone-50 border border-stone-900/15 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 transition-all text-left shadow-sm cursor-pointer"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-stone-900/15 dark:ring-white/20"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-indigo-500/30 border border-amber-500/30 dark:border-indigo-400/30 flex items-center justify-center text-amber-900 dark:text-indigo-300 text-xs font-bold">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="text-xs font-bold text-stone-900 dark:text-slate-200 max-w-[100px] truncate">
                {user.display_name}
              </span>

              {/* LinuxDo Community Badge */}
              {user.primary_provider === "linuxdo" && badge && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                  {badge}
                </span>
              )}

              <ChevronDown className="w-3 h-3 text-stone-500 dark:text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-stone-900/12 dark:border-white/10 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-stone-900/8 dark:border-white/5 mb-1">
                  <p className="text-xs font-semibold text-stone-900 dark:text-white truncate">
                    {user.display_name}
                  </p>
                  {user.email && (
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-500 dark:text-slate-400">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/5 border border-stone-900/10 dark:border-white/10">
                      {user.primary_provider}
                    </span>
                    {trustLevel !== undefined && (
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                        <Shield className="w-3 h-3" />
                        L{trustLevel}
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href="/history"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    if (window.location.pathname !== "/history") {
                      window.history.pushState({}, "", "/history");
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-800 hover:text-stone-950 hover:bg-amber-50 dark:text-indigo-300 dark:hover:text-indigo-200 dark:hover:bg-indigo-500/10 rounded-xl transition-colors text-left"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-indigo-400" />
                  <span>{t.profile?.navLink || "历史评测与轨迹"}</span>
                </a>

                <a
                  href="/settings"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    if (window.location.pathname !== "/settings") {
                      window.history.pushState({}, "", "/settings");
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-800 hover:text-stone-950 hover:bg-amber-50 dark:text-amber-300 dark:hover:text-amber-200 dark:hover:bg-amber-500/10 rounded-xl transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t.profile?.tabSettings || "个人资料与偏好"}</span>
                </a>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.auth?.signOut || "退出登录"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
