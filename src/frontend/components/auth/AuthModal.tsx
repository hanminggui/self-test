import React, { useEffect } from "react";
import { X, Shield, Sparkles } from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: "github" | "linuxdo" | "google") => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSelectProvider,
}) => {
  const { t } = useLocale();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl z-10 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-white/10 text-amber-300 shadow-lg shadow-amber-950/20 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {t.auth?.authModalTitle || "探索者身份认证"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {t.auth?.authModalDesc || "连接您的身份账号，云端同步二元认知流形评测记录与画像勋章"}
          </p>
        </div>

        {/* Provider Options */}
        <div className="space-y-3">
          {/* GitHub Option */}
          <button
            onClick={() => onSelectProvider("github")}
            className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 text-white group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">GitHub</div>
                <div className="text-[11px] text-slate-400">
                  {t.auth?.loginWithGithub || "使用 GitHub 账号登录"}
                </div>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-amber-300 transition-colors text-xs">→</span>
          </button>

          {/* LinuxDo Connect Option */}
          <button
            onClick={() => onSelectProvider("linuxdo")}
            className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-amber-500/30 transition-all duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600/30 to-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-300 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  LinuxDo Connect
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Community
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {t.auth?.loginWithLinuxdo || "使用 LinuxDo Connect 登录"}
                </div>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-amber-300 transition-colors text-xs">→</span>
          </button>

          {/* Google Identity Option */}
          <button
            onClick={() => onSelectProvider("google")}
            className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Google</div>
                <div className="text-[11px] text-slate-400">
                  {t.auth?.loginWithGoogle || "使用 Google 账号登录"}
                </div>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-amber-300 transition-colors text-xs">→</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500">
            {t.auth?.accountLinked || "账号已关联绑定"} · Metacognitive Testing Suite
          </p>
        </div>
      </div>
    </div>
  );
};
