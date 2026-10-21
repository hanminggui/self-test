import React, { useState, useRef, useEffect } from "react";
import { User as UserIcon, LogOut, ChevronDown, Compass, Shield } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useLocale } from "../../contexts/LocaleContext";
import { AuthModal } from "./AuthModal";

export const UserNav: React.FC = () => {
  const { user, login, logout, openAuthModal, closeAuthModal, isAuthModalOpen, hasAnyProvider } = useUser();
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-xs font-medium text-slate-200 hover:text-white transition-all duration-150 shadow-sm cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.auth?.signIn || "登录"}</span>
            </button>
          ) : null
        ) : (
          // Logged In State: User Avatar & Dropdown
          <div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-xs font-bold">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <span className="text-xs font-medium text-slate-200 max-w-[100px] truncate">
                {user.display_name}
              </span>

              {/* LinuxDo Community Badge */}
              {user.primary_provider === "linuxdo" && badge && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {badge}
                </span>
              )}

              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.display_name}
                  </p>
                  {user.email && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      {user.primary_provider}
                    </span>
                    {trustLevel !== undefined && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Shield className="w-3 h-3" />
                        L{trustLevel}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.auth?.signOut || "退出登录"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onSelectProvider={(p) => {
          login(p);
        }}
      />
    </>
  );
};
