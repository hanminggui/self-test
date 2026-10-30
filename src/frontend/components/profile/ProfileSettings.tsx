import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Unlink,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useLocale } from "../../contexts/LocaleContext";
import { useGameEffects } from "../../contexts/GameEffectsContext";
import type { SessionVisibilityPreference, UserSocialLinks } from "../../../storage/user";
import type { ConnectedProviderInfo } from "../../../backend/user_manager";

// Provider & Brand SVGs
const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinuxDoIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="profile-linuxdo-clip">
      <circle cx="60" cy="60" r="47" />
    </clipPath>
    <circle fill="#f0f0f0" cx="60" cy="60" r="50" />
    <rect fill="#1c1c1e" clipPath="url(#profile-linuxdo-clip)" x="10" y="10" width="100" height="30" />
    <rect fill="#f0f0f0" clipPath="url(#profile-linuxdo-clip)" x="10" y="40" width="100" height="40" />
    <rect fill="#ffb003" clipPath="url(#profile-linuxdo-clip)" x="10" y="80" width="100" height="30" />
  </svg>
);

const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
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
);

// Sleek preset avatar identifiers
const PRESET_AVATARS = [
  { id: "totem-sovereign", name: "应龙 (Sovereign)", gradient: "from-amber-500 to-yellow-600", symbol: "🐉" },
  { id: "totem-wanderer", name: "鲲鹏 (Wanderer)", gradient: "from-blue-600 to-cyan-400", symbol: "🐋" },
  { id: "totem-sage", name: "白泽 (Sage)", gradient: "from-emerald-500 to-teal-600", symbol: "🦌" },
  { id: "totem-oracle", name: "天机 (Oracle)", gradient: "from-sky-500 to-teal-500", symbol: "🔮" },
  { id: "totem-sentinel", name: "玄武 (Sentinel)", gradient: "from-slate-600 to-stone-500", symbol: "🐢" },
  { id: "totem-vanguard", name: "麒麟 (Vanguard)", gradient: "from-rose-500 to-orange-500", symbol: "🔥" },
];

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser, enabledProviders } = useUser();
  const { t } = useLocale();
  const {
    motionMode,
    setMotionMode,
    soundMode,
    setSoundMode,
    performanceMode,
    setPerformanceMode,
    playSound,
  } = useGameEffects();

  // Form states
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.metadata?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [defaultVisibility, setDefaultVisibility] = useState<SessionVisibilityPreference>(
    user?.metadata?.default_visibility || "anonymous"
  );
  const [socialLinks, setSocialLinks] = useState<UserSocialLinks>({
    github: user?.metadata?.social_links?.github || "",
    twitter: user?.metadata?.social_links?.twitter || "",
    linuxdo: user?.metadata?.social_links?.linuxdo || "",
    website: user?.metadata?.social_links?.website || "",
  });

  // Providers status
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Submission & feedback states
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  // Sync form state when user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setBio(user.metadata?.bio || "");
      setAvatarUrl(user.avatar_url || "");
      setDefaultVisibility(user.metadata?.default_visibility || "anonymous");
      setSocialLinks({
        github: user.metadata?.social_links?.github || "",
        twitter: user.metadata?.social_links?.twitter || "",
        linuxdo: user.metadata?.social_links?.linuxdo || "",
        website: user.metadata?.social_links?.website || "",
      });
    }
  }, [user]);

  // Fetch full profile and connected providers
  const fetchProfileData = async () => {
    try {
      setLoadingProviders(true);
      const res = await fetch("/api/me/profile", { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        if (data.providers) {
          setConnectedProviders(data.providers);
        }
      }
    } catch {
      // Fallback: estimate from user context
      if (user) {
        const fallbackProviders: ConnectedProviderInfo[] = [
          { provider: "github", linked: user.primary_provider === "github" || Boolean(user.metadata?.providers?.github), is_primary: user.primary_provider === "github" },
          { provider: "linuxdo", linked: user.primary_provider === "linuxdo" || Boolean(user.metadata?.providers?.linuxdo), is_primary: user.primary_provider === "linuxdo" },
          { provider: "google", linked: user.primary_provider === "google" || Boolean(user.metadata?.providers?.google), is_primary: user.primary_provider === "google" },
        ];
        setConnectedProviders(fallbackProviders);
      }
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  // Handle URL query feedback (e.g. ?linked=github or ?error=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const linked = params.get("linked");
      const err = params.get("error");
      if (linked) {
        setStatusMessage({ type: "success", text: `已成功关联 ${linked.toUpperCase()} 账号！` });
        fetchProfileData();
        refreshUser();
        window.history.replaceState({}, "", "/settings");
      } else if (err) {
        setStatusMessage({ type: "error", text: decodeURIComponent(err) });
        window.history.replaceState({}, "", "/settings");
      }
    }
  }, [refreshUser]);

  // Client-side display name validation
  const trimmedName = displayName.trim();
  const isNameTooShort = trimmedName.length < 2 && trimmedName.length > 0;
  const isNameTooLong = trimmedName.length > 32;
  const hasInvalidChars = /<[^>]*>|[<>]/.test(displayName);
  const isNameInvalid = isNameTooShort || isNameTooLong || hasInvalidChars || trimmedName.length === 0;

  // Save profile handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNameInvalid) {
      setStatusMessage({ type: "error", text: t.profile?.displayNameHelp || "昵称长度须在 2-32 字符之间且无特殊标签" });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: trimmedName,
          bio,
          avatar_url: avatarUrl || null,
          default_visibility: defaultVisibility,
          social_links: socialLinks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setStatusMessage({ type: "success", text: t.profile?.saveSuccess || "资料与设置已成功更新！" });
      if (data.providers) {
        setConnectedProviders(data.providers);
      }
      await refreshUser();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `${t.profile?.saveError || "保存失败："} ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Unlink secondary provider handler
  const handleUnlink = async (provider: string) => {
    if (!window.confirm(t.profile?.unlinkConfirm || `确定要解除 ${provider} 的账号绑定吗？`)) {
      return;
    }

    setUnlinkingProvider(provider);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/me/providers/${provider}/unlink`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unlink provider");
      }

      setStatusMessage({ type: "success", text: `已成功解除 ${provider.toUpperCase()} 账号绑定` });
      if (data.providers) {
        setConnectedProviders(data.providers);
      }
      await refreshUser();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `${t.profile?.saveError || "操作失败："} ${err.message}` });
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const totalLinked = connectedProviders.filter((p) => p.linked).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Status Alert Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-sm font-bold transition-all duration-300 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#10B981]"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-300 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FF3366]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Basic Profile Card */}
        <div className="rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          <div className="flex items-center gap-3 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
            <UserIcon className="w-5 h-5 text-stone-900 dark:text-[#CCFF00]" />
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white tracking-wide">
                {t.profile?.displayNameLabel || "基本资料"}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">公开个人名片、头像与认知宣言</p>
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
              {t.profile?.avatarLabel || "头像选择"}
            </label>

            <div className="flex flex-wrap items-center gap-6">
              {/* Current Preview */}
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-stone-900 dark:border-white/20 shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#FBBF24] dark:bg-[#CCFF00] border-2 border-stone-900 dark:border-black flex items-center justify-center text-stone-950 dark:text-[#08080C] text-2xl font-black shadow-[0_3px_0_#1c1917] dark:shadow-none">
                    {displayName.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {/* Preset Avatars */}
              <div className="flex-1 space-y-2">
                <p className="text-xs text-stone-600 dark:text-slate-400 font-bold">{t.profile?.avatarPresetLabel || "预置星象头像"}</p>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_AVATARS.map((preset) => {
                    const presetDataUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="18" fill="%231e1b4b"/><text x="40" y="48" font-size="34" text-anchor="middle" dominant-baseline="middle">${preset.symbol}</text></svg>`;
                    const isSelected = avatarUrl === presetDataUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(presetDataUrl)}
                        title={preset.name}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-br ${preset.gradient} flex items-center justify-center text-lg border-2 border-stone-900 transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                          isSelected ? "ring-2 ring-[#CCFF00] scale-105 shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#CCFF00]" : "opacity-85 hover:opacity-100"
                        }`}
                      >
                        {preset.symbol}
                      </button>
                    );
                  })}
                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(user.avatar_url || "")}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#12121C] hover:bg-stone-100 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-bold text-stone-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-center active:translate-y-0.5"
                    >
                      恢复第三方头像
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-stone-600 dark:text-slate-400 mb-1">{t.profile?.avatarCustomLabel || "自定义图片 URL"}</label>
              <input
                type="url"
                value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all"
              />
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
                {t.profile?.displayNameLabel || "公开昵称"}
              </label>
              <span className={`text-[11px] font-mono font-bold ${isNameTooLong ? "text-rose-600 dark:text-rose-400" : "text-stone-500 dark:text-slate-400"}`}>
                {displayName.length} / 32
              </span>
            </div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.profile?.displayNamePlaceholder || "请输入公开展示昵称"}
              maxLength={40}
              className={`w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none transition-all ${
                isNameInvalid && displayName.length > 0
                  ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "border-stone-300 dark:border-white/20 focus:border-stone-900 dark:focus:border-[#CCFF00]"
              }`}
            />
            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
              {t.profile?.displayNameHelp || "支持 2-32 个字符，禁止包含脚本或违规侮辱性词汇"}
            </p>
          </div>

          {/* Bio Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">
                {t.profile?.bioLabel || "个人简介 / 认知宣言"}
              </label>
              <span className={`text-[11px] font-mono font-bold ${bio.length > 300 ? "text-rose-600 dark:text-rose-400" : "text-stone-500 dark:text-slate-400"}`}>
                {bio.length} / 300
              </span>
            </div>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t.profile?.bioPlaceholder || "用一两句话描述您的心智思考模式或探索宣言..."}
              maxLength={300}
              className="w-full min-h-[88px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all resize-none"
            />
            <p className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">{t.profile?.bioHelp || "上限 300 个字符"}</p>
          </div>
        </div>

        {/* Section 2: Visibility Preference Tier */}
        <div className="rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          <div className="flex items-center gap-3 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
            <Shield className="w-5 h-5 text-amber-500 dark:text-[#CCFF00]" />
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white tracking-wide">
                {t.profile?.visibilityLabel || "默认评测可见性偏好"}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">
                {t.profile?.visibilityDesc || "决定您完成评测后的默认隐私等级"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* L1: Private */}
            <div
              onClick={() => setDefaultVisibility("private")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                defaultVisibility === "private"
                  ? "bg-amber-50 dark:bg-[#12121C] border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]"
                  : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 hover:border-stone-900 dark:hover:border-white/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-700 dark:text-slate-300">
                    <Lock className="w-4 h-4 text-stone-700 dark:text-slate-300" />
                  </div>
                  {defaultVisibility === "private" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" />
                  )}
                </div>
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  {t.profile?.visibilityL1Title || "私密保护 (L1: Private)"}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t.profile?.visibilityL1Desc || "仅您本人在个人面板中可见，绝不投影至公开群体散点"}
                </p>
              </div>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-slate-200 w-max">
                L1 · PRIVATE
              </span>
            </div>

            {/* L2: Anonymous Codename */}
            <div
              onClick={() => setDefaultVisibility("anonymous")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                defaultVisibility === "anonymous"
                  ? "bg-amber-50 dark:bg-[#12121C] border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]"
                  : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 hover:border-stone-900 dark:hover:border-white/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-[#CCFF00]/15 flex items-center justify-center text-amber-800 dark:text-[#CCFF00]">
                    <EyeOff className="w-4 h-4 text-amber-600 dark:text-[#CCFF00]" />
                  </div>
                  {defaultVisibility === "anonymous" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" />
                  )}
                </div>
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  {t.profile?.visibilityL2Title || "匿名代号 (L2: Anonymous)"}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t.profile?.visibilityL2Desc || "推荐。以神话匿名星象代号投影至群体散点空间，抹除身份"}
                </p>
              </div>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-[#CCFF00]/20 text-amber-900 dark:text-[#CCFF00] w-max">
                L2 · ANONYMOUS
              </span>
            </div>

            {/* L3: Public */}
            <div
              onClick={() => setDefaultVisibility("public")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                defaultVisibility === "public"
                  ? "bg-amber-50 dark:bg-[#12121C] border-stone-900 dark:border-[#CCFF00] shadow-[0_3px_0_#1c1917] dark:shadow-[3px_3px_0px_#CCFF00]"
                  : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 hover:border-stone-900 dark:hover:border-white/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-[#38BDF8]/15 flex items-center justify-center text-sky-800 dark:text-[#38BDF8]">
                    <Globe className="w-4 h-4 text-sky-600 dark:text-[#38BDF8]" />
                  </div>
                  {defaultVisibility === "public" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#CCFF00]" />
                  )}
                </div>
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  {t.profile?.visibilityL3Title || "公开名片 (L3: Public)"}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t.profile?.visibilityL3Desc || "完全公开。在认知大盘展示您的头像、昵称与主页链接"}
                </p>
              </div>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-[#38BDF8]/20 text-sky-900 dark:text-[#38BDF8] w-max">
                L3 · PUBLIC
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Social Links */}
        <div className="rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          <div className="flex items-center gap-3 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
            <LinkIcon className="w-5 h-5 text-stone-900 dark:text-[#38BDF8]" />
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white tracking-wide">
                {t.profile?.socialLinksTitle || "社交网络链接"}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">
                {t.profile?.socialLinksDesc || "展示在您的认知名片或主页中"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GitHub */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-300">
                <GithubIcon className="w-3.5 h-3.5" />
                <span>{t.profile?.githubHandleLabel || "GitHub 用户名"}</span>
              </label>
              <input
                type="text"
                value={socialLinks.github || ""}
                onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                placeholder="torvalds"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all"
              />
            </div>

            {/* Linux Do */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-300">
                <LinuxDoIcon className="w-3.5 h-3.5" />
                <span>{t.profile?.linuxdoHandleLabel || "Linux Do 用户名"}</span>
              </label>
              <input
                type="text"
                value={socialLinks.linuxdo || ""}
                onChange={(e) => setSocialLinks({ ...socialLinks, linuxdo: e.target.value })}
                placeholder="neo"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all"
              />
            </div>

            {/* Twitter / X */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-300">
                <TwitterIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>{t.profile?.twitterHandleLabel || "X (Twitter) 用户名"}</span>
              </label>
              <input
                type="text"
                value={socialLinks.twitter || ""}
                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                placeholder="@username"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all"
              />
            </div>

            {/* Personal Website */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{t.profile?.websiteLabel || "个人独立主页"}</span>
              </label>
              <input
                type="url"
                value={socialLinks.website || ""}
                onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                placeholder="https://example.com"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-300 dark:border-white/20 text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 font-medium focus:outline-none focus:border-stone-900 dark:focus:border-[#CCFF00] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Connected Accounts (OAuth Matrix) */}
        <div className="rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          <div className="flex items-center gap-3 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
            <ExternalLink className="w-5 h-5 text-stone-900 dark:text-[#CCFF00]" />
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white tracking-wide">
                {t.profile?.connectedAccountsTitle || "已关联的第三方登录方式"}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">
                {t.profile?.connectedAccountsDesc || "管理 GitHub、Linux Do 与 Google 账号的多重绑定"}
              </p>
            </div>
          </div>

          <div className="divide-y-2 divide-stone-900/10 dark:divide-white/10">
            {connectedProviders.map((prov) => {
              const providerName =
                prov.provider === "github"
                  ? "GitHub"
                  : prov.provider === "linuxdo"
                  ? "Linux Do"
                  : "Google";

              return (
                <div key={prov.provider} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#12121C] border-2 border-stone-900/20 dark:border-white/20 flex items-center justify-center text-stone-800 dark:text-slate-200">
                      {prov.provider === "github" && <GithubIcon className="w-4 h-4 text-stone-900 dark:text-white" />}
                      {prov.provider === "linuxdo" && <LinuxDoIcon className="w-4 h-4" />}
                      {prov.provider === "google" && <GoogleIcon className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-stone-900 dark:text-white">{providerName}</span>
                        {prov.is_primary && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] dark:bg-[#12121C] text-stone-900 dark:text-[#CCFF00] border border-stone-900 dark:border-[#CCFF00]">
                            {t.profile?.primaryProviderBadge || "主登录方式"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                        {prov.linked
                          ? `${t.profile?.connectedStatus || "已关联"} ${prov.username ? `(${prov.username})` : ""}`
                          : t.profile?.unconnectedStatus || "未关联"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {prov.linked ? (
                      <button
                        type="button"
                        onClick={() => handleUnlink(prov.provider)}
                        disabled={totalLinked <= 1 || unlinkingProvider === prov.provider}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
                          totalLinked <= 1
                            ? "bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-slate-500 border border-stone-200 dark:border-white/5 cursor-not-allowed"
                            : "bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-500/40"
                        }`}
                        title={totalLinked <= 1 ? t.profile?.cannotUnlinkSoleProvider || "不可解绑唯一的登录方式" : undefined}
                      >
                        {unlinkingProvider === prov.provider ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlink className="w-3.5 h-3.5" />
                        )}
                        <span>{t.profile?.unlinkProviderBtn || "解除关联"}</span>
                      </button>
                    ) : (
                      <a
                        href={`/api/auth/link/${prov.provider}`}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-white dark:bg-[#12121C] hover:bg-stone-100 dark:hover:bg-white/10 border-2 border-stone-900 dark:border-white/20 text-xs font-black text-stone-900 dark:text-white transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_0_#1c1917] dark:shadow-none active:translate-y-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.profile?.linkProviderBtn || "立即关联"}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Interactive Motion & Acoustics (Game Effects & Accessibility) */}
        <div className="rounded-[24px] bg-white dark:bg-[#0E0E16] border-2 border-stone-900 dark:border-white/20 p-6 sm:p-8 space-y-6 shadow-[0_4px_0_#1c1917] dark:shadow-[4px_4px_0px_#CCFF00]">
          <div className="flex items-center gap-3 border-b-2 border-stone-900/10 dark:border-white/10 pb-4">
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-[#CCFF00]" />
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white tracking-wide">
                {t.gameEffects?.settingsAudioMotionTitle || "交互动效与声学体验"}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-medium">
                {t.gameEffects?.settingsAudioMotionDesc || "自定义系统交互手感、粒子流光视觉与 Web Audio 过程音效偏好"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Motion Mode */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-900/15 dark:border-white/20">
              <div className="text-xs font-black text-stone-900 dark:text-white">
                {t.gameEffects?.motionModeLabel || "过渡动效强度"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMotionMode("full");
                    playSound("tap");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    motionMode === "full"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.motionModeFull || "全量流光"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMotionMode("reduced");
                    playSound("tap");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    motionMode === "reduced"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.motionModeReduced || "极简减弱"}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
                {motionMode === "full"
                  ? t.gameEffects?.motionModeFullDesc || "启用星门穿梭、光幕流转、粒子消散与流形过渡"
                  : t.gameEffects?.motionModeReducedDesc || "遵循减弱动效偏好，消除剧烈位移与旋转，平滑淡入"}
              </p>
            </div>

            {/* Sound Mode */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-900/15 dark:border-white/20">
              <div className="text-xs font-black text-stone-900 dark:text-white">
                {t.gameEffects?.soundModeLabel || "交互音效 (Web Audio)"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSoundMode("enabled");
                    playSound("tap");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    soundMode === "enabled"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.soundModeEnabled || "开启音效"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSoundMode("muted");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    soundMode === "muted"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.soundModeMuted || "静音模式"}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
                {soundMode === "enabled"
                  ? "程序化合成晶体敲击与秘法和弦，零音频文件下载"
                  : "所有作答选择、押注模式切换与推演过程静音进行"}
              </p>
            </div>

            {/* Performance Mode */}
            <div className="space-y-2 p-4 rounded-2xl bg-stone-50 dark:bg-[#12121C] border-2 border-stone-900/15 dark:border-white/20">
              <div className="text-xs font-black text-stone-900 dark:text-white">
                {t.gameEffects?.perfModeLabel || "渲染性能偏好"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPerformanceMode("high");
                    playSound("tap");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    performanceMode === "high"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.perfModeHigh || "高清全效"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPerformanceMode("eco");
                    playSound("tap");
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center ${
                    performanceMode === "eco"
                      ? "bg-[#FBBF24] dark:bg-[#CCFF00] text-stone-950 dark:text-[#08080C] border-stone-900 dark:border-black shadow-[0_2px_0_#1c1917] dark:shadow-[2px_2px_0px_#FFFFFF]"
                      : "bg-white dark:bg-[#0E0E16] border-stone-300 dark:border-white/15 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {t.gameEffects?.perfModeEco || "节能降级"}
                </button>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400 leading-relaxed font-medium">
                {performanceMode === "high"
                  ? t.gameEffects?.perfModeHighDesc || "完整启用粒子光晕与星云混合滤镜"
                  : t.gameEffects?.perfModeEcoDesc || "关闭高算力粒子动画与复杂滤镜，保障移动端超高帧率"}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving || isNameInvalid}
            className={`min-h-[48px] w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black border-2 border-stone-900 dark:border-black transition-all duration-200 cursor-pointer ${
              saving || isNameInvalid
                ? "bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-slate-500 cursor-not-allowed opacity-60 shadow-none"
                : "bg-[#FBBF24] hover:bg-[#F59E0B] dark:bg-[#CCFF00] dark:hover:brightness-110 text-stone-950 dark:text-[#08080C] shadow-[0_4px_0_#1c1917] dark:shadow-[3px_3px_0px_#FFFFFF] active:translate-y-0.5 active:shadow-none"
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{t.profile?.saveProfileBtn || "保存资料与设置"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
