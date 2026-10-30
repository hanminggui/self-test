import React from "react";
import { Compass, ArrowRight } from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";
import { useUser } from "../../contexts/UserContext";
import { BottomSheet } from "../common/BottomSheet";

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
  const { t, locale } = useLocale();
  const { enabledProviders, hasAnyProvider } = useUser();
  const isEn = String(locale).toLowerCase().startsWith("en");

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showDragHandle={true}
      showCloseButton={true}
      desktopMaxWidth="sm:max-w-md"
      maxHeight="max-h-[82dvh]"
      ariaLabel={t.auth?.authModalTitle || (isEn ? "Explorer Authentication" : "探索者身份认证")}
    >
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FEF3C7] dark:bg-[#12121C] border-2 border-stone-900 dark:border-[#CCFF00] text-stone-950 dark:text-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00] mb-3">
            <Compass className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-stone-950 dark:text-white tracking-tight">
            {t.auth?.authModalTitle || (isEn ? "Explorer Identity Auth" : "探索者身份认证")}
          </h2>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed font-medium">
            {t.auth?.authModalDesc ||
              (isEn
                ? "Connect your identity account to sync your cognitive manifold records and archetype badges."
                : "连接您的身份账号，云端同步二元认知流形评测记录与画像勋章。")}
          </p>
        </div>

        {/* Provider Action Buttons */}
        <div className="space-y-3">
          {/* GitHub Provider */}
          {enabledProviders.github && (
            <button
              type="button"
              onClick={() => onSelectProvider("github")}
              className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-[#1a1a28] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-white flex items-center justify-center text-white dark:text-stone-950 shadow-sm shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-stone-950 dark:text-white">
                    GitHub
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    {t.auth?.loginWithGithub || (isEn ? "Sign in with GitHub" : "使用 GitHub 账号登录")}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 dark:text-slate-400 group-hover:text-stone-950 dark:group-hover:text-[#CCFF00] group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Linux Do Provider */}
          {enabledProviders.linuxdo && (
            <button
              type="button"
              onClick={() => onSelectProvider("linuxdo")}
              className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-[#1a1a28] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-stone-900/20 dark:border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                    <clipPath id="linuxdo-modal-clip">
                      <circle cx="60" cy="60" r="47" />
                    </clipPath>
                    <circle fill="#f0f0f0" cx="60" cy="60" r="50" />
                    <rect fill="#1c1c1e" clipPath="url(#linuxdo-modal-clip)" x="10" y="10" width="100" height="30" />
                    <rect fill="#f0f0f0" clipPath="url(#linuxdo-modal-clip)" x="10" y="40" width="100" height="40" />
                    <rect fill="#ffb003" clipPath="url(#linuxdo-modal-clip)" x="10" y="80" width="100" height="30" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-stone-950 dark:text-white">
                    Linux Do
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    {t.auth?.loginWithLinuxdo || (isEn ? "Sign in with Linux Do" : "使用 Linux Do 社区账号登录")}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 dark:text-slate-400 group-hover:text-stone-950 dark:group-hover:text-[#CCFF00] group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Google Identity Provider */}
          {enabledProviders.google && (
            <button
              type="button"
              onClick={() => onSelectProvider("google")}
              className="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#12121C] hover:bg-amber-50 dark:hover:bg-[#1a1a28] border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00] active:translate-y-0.5 active:shadow-none transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-300 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0">
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
                  <div className="text-sm font-black text-stone-950 dark:text-white">
                    Google
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                    {t.auth?.loginWithGoogle || (isEn ? "Sign in with Google" : "使用 Google 账号登录")}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-500 dark:text-slate-400 group-hover:text-stone-950 dark:group-hover:text-[#CCFF00] group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {!hasAnyProvider && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-white/5 border-2 border-dashed border-stone-300 dark:border-white/10 text-center">
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
                {t.auth?.noProvidersEnabled ||
                  (isEn
                    ? "No external providers configured. You can continue exploring in guest mode."
                    : "当前未开启任何第三方登录渠道，您可直接以游客身份继续探索与评测。")}
              </p>
            </div>
          )}
        </div>

        {/* Footer info & Legal Agreements */}
        <div className="pt-2 text-center space-y-1.5 border-t border-stone-200 dark:border-white/10">
          <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
            {t.legal?.agreementNotice || (isEn ? "By continuing, you agree to our" : "登录或使用即代表您已阅读并同意")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 dark:text-[#CCFF00] hover:underline font-bold"
            >
              {t.legal?.termsOfService || (isEn ? "Terms of Service" : "服务条款")}
            </a>{" "}
            &{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 dark:text-[#CCFF00] hover:underline font-bold"
            >
              {t.legal?.privacyPolicy || (isEn ? "Privacy Policy" : "隐私政策")}
            </a>
          </p>
          <p className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
            {t.auth?.accountLinked || (isEn ? "Secure OAuth 2.0 Identity Binding" : "账号安全关联绑定")} · Self-Test Suite
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
