import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Compass,
  Sparkles,
  Activity,
  Crown,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Globe,
  Shield,
  ChevronUp,
  Clock,
  Menu,
  X,
  FileText,
  Layers,
} from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { useLocale } from "../../contexts/LocaleContext";
import { getArchetypeDefinition } from "../../../backend/archetype_matrix";
import type { SubjectPoint } from "../../types/admin";
import { GameQuickControls } from "../game/GameQuickControls";

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "metacognitive_sidebar_collapsed";

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const { user, logout, sessionSyncVersion } = useUser();
  const { locale, setLocale, t } = useLocale();
  const isEn = String(locale).toLowerCase().startsWith("en");

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [recentSessions, setRecentSessions] = useState<SubjectPoint[]>([]);
  const [unlockedCount, setUnlockedCount] = useState<number>(0);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recent sessions & unlocked archetype count for sidebar
  const fetchSidebarSummary = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/me/sessions?lang=${encodeURIComponent(locale)}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SubjectPoint[] = data.sessions || [];
        setRecentSessions(list.slice(0, 12));
        const uniqueCodes = new Set(list.map((s) => s.quadrant_code || "Q1-CAL"));
        setUnlockedCount(uniqueCodes.size);
      }
    } catch {}
  }, [user, locale]);

  useEffect(() => {
    fetchSidebarSummary();
  }, [fetchSidebarSummary, sessionSyncVersion, currentPath]);

  useEffect(() => {
    const handleSessionClaimed = () => {
      fetchSidebarSummary();
    };
    window.addEventListener("metacognitive:session-claimed", handleSessionClaimed);
    return () => window.removeEventListener("metacognitive:session-claimed", handleSessionClaimed);
  }, [fetchSidebarSummary]);

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const cleanPath = (currentPath || "/").replace(/\/+$/, "") || "/";
  const isTestActive = cleanPath === "/" || cleanPath === "/test";
  const isHistoryActive = cleanPath === "/history" || cleanPath === "/me";
  const isAssetsActive = cleanPath === "/assets";
  const isSettingsActive = cleanPath === "/settings" || cleanPath === "/me/settings";

  const navItems = [
    {
      key: "test",
      path: "/",
      active: isTestActive,
      icon: Sparkles,
      label: isEn ? "New Assessment" : "开启新评测",
      accent: "text-amber-400",
      badge: null,
    },
    {
      key: "history",
      path: "/history",
      active: isHistoryActive,
      icon: Activity,
      label: t.profile?.tabHistory || (isEn ? "Manifold & History" : "评测历史与流形"),
      accent: "text-indigo-400",
      badge: recentSessions.length > 0 ? String(recentSessions.length) : null,
    },
    {
      key: "assets",
      path: "/assets",
      active: isAssetsActive,
      icon: Crown,
      label: isEn ? "Cognitive Assets" : "认知资产与图鉴",
      accent: "text-purple-400",
      badge: `${unlockedCount}/8`,
    },
    {
      key: "settings",
      path: "/settings",
      active: isSettingsActive,
      icon: Settings,
      label: t.profile?.tabSettings || (isEn ? "Preferences" : "个人偏好设置"),
      accent: "text-cyan-400",
      badge: null,
    },
  ];

  const trustLevel = user?.metadata?.trust_level;
  const badge = user?.metadata?.badge;

  return (
    <div className="h-screen w-full overflow-hidden bg-[#080a10] text-slate-100 flex selection:bg-amber-500/30 selection:text-amber-200">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Collapsible Sidebar (ChatGPT / Gemini Style) */}
      <aside
        aria-label={isEn ? "Primary Sidebar Navigation" : "应用主导航侧边栏"}
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between bg-[#0c0f17] border-r border-white/[0.08] transition-[width,transform] duration-200 ease-out select-none ${
          mobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-[68px]" : "md:w-[272px]"}`}
      >
        {/* 1. TOP: Brand Logo & Collapse/Expand Button */}
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick("/")}
            className={`flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/[0.05] transition-colors cursor-pointer min-w-0 ${
              isCollapsed ? "md:justify-center md:w-full" : ""
            }`}
            title="Self-Test · 思维星图"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/30 via-indigo-500/30 to-purple-500/30 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md shadow-indigo-950/50">
              <Compass className="w-4 h-4 text-amber-300" />
            </div>
            {(!isCollapsed || mobileMenuOpen) && (
              <div className="text-left truncate">
                <div className="text-xs font-extrabold tracking-wide text-white truncate">
                  Self-Test · {isEn ? "Manifold" : "思维星图"}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {isEn ? "Metacognitive OS" : "二元认知工作台"}
                </div>
              </div>
            )}
          </button>

          {/* Desktop Collapse Button */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!isCollapsed}
              aria-label={isEn ? "Collapse sidebar" : "收起侧边栏"}
              className="hidden md:flex w-8 h-8 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white items-center justify-center transition-colors cursor-pointer shrink-0"
              title={isEn ? "Collapse sidebar" : "收起侧边栏"}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden w-8 h-8 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsed state expand button directly below logo */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center pt-2 px-2 shrink-0">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!isCollapsed}
              aria-label={isEn ? "Expand sidebar" : "展开侧边栏"}
              className="w-10 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isEn ? "Expand sidebar" : "展开侧边栏"}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. MIDDLE: Functional Routes + Expandable Assets & Recent History Stream */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-5">
          {/* Primary Functional Route Zone */}
          <nav className="space-y-1" aria-label={isEn ? "Workspace Routes" : "核心功能路由"}>
            {(!isCollapsed || mobileMenuOpen) && (
              <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {isEn ? "Workspace" : "功能导航"}
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isCollapsed && !mobileMenuOpen ? "md:justify-center md:px-0" : ""
                  } ${
                    item.active
                      ? "bg-white/[0.09] text-white border border-white/15 shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${item.active ? item.accent : "text-slate-400"}`} />
                    {(!isCollapsed || mobileMenuOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {(!isCollapsed || mobileMenuOpen) && item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-slate-300 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Expandable Recent History & Assets Stream (Visible when expanded) */}
          {(!isCollapsed || mobileMenuOpen) && (
            <div className="space-y-4 pt-2 border-t border-white/[0.06]">
              {/* Recent Assessment History Section */}
              <div className="space-y-1.5">
                <div className="px-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{isEn ? "Recent Reports" : "最近评测档案"}</span>
                  </span>
                  {recentSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleNavClick("/history")}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {isEn ? "All" : "全部"}
                    </button>
                  )}
                </div>

                {recentSessions.length === 0 ? (
                  <div className="px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-500 leading-relaxed">
                    {isEn
                      ? "No assessment reports yet. Start a test to map your cognitive manifold."
                      : "尚无历史记录，开启首次评测后在此快速回溯报告。"}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {recentSessions.map((sess) => {
                      const code = sess.quadrant_code || "Q1-CAL";
                      const def = getArchetypeDefinition(code, locale);
                      const reportPath = `/report/${sess.id}`;
                      const isReportSelected = cleanPath === reportPath;
                      const dateShort = sess.created_at
                        ? new Date(sess.created_at).toLocaleDateString(locale, {
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "";

                      return (
                        <button
                          key={sess.id}
                          type="button"
                          onClick={() => handleNavClick(reportPath)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isReportSelected
                              ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                              : "text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shrink-0" />
                            <span className="truncate font-medium">
                              {sess.role_title || def.role_title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">{code}</span>
                            {dateShort && (
                              <span className="text-[10px] font-mono text-slate-600">{dateShort}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Expandable Cognitive Assets & Future Realms Slot */}
              <div className="px-2">
                <div
                  onClick={() => handleNavClick("/assets")}
                  className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-indigo-950/30 border border-purple-500/20 hover:border-purple-400/40 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isEn ? "Archetype Codex" : "八大认知图鉴资产"}</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {unlockedCount} / 8
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-indigo-400 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (unlockedCount / 8) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">
                    {isEn
                      ? "Collect all 8 cognitive archetypes & innate skill matrices"
                      : "点亮八大认知流派化身，解锁专属心智特技矩阵"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. BOTTOM: User Avatar & Popover Component */}
        <div className="p-2.5 border-t border-white/[0.06] relative shrink-0" ref={userMenuRef}>
          {user && (
            <>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer ${
                  isCollapsed && !mobileMenuOpen ? "md:justify-center md:p-1.5" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-200 text-xs font-bold shrink-0">
                      {user.display_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}

                  {(!isCollapsed || mobileMenuOpen) && (
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">
                          {user.display_name}
                        </span>
                        {user.primary_provider === "linuxdo" && badge && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {user.email || user.primary_provider}
                      </div>
                    </div>
                  )}
                </div>

                {(!isCollapsed || mobileMenuOpen) && (
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                )}
              </button>

              {/* Upward User Popover Menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-2.5 right-2.5 mb-2 min-w-[220px] rounded-2xl bg-[#111622] border border-white/15 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <div className="text-xs font-bold text-white truncate">{user.display_name}</div>
                    {user.email && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</div>
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

                  {/* Language Switcher inside Avatar Popover */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isEn ? "Language" : "界面语言"}</span>
                    </span>
                    <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setLocale("zh-CN")}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          locale === "zh-CN"
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        中文
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocale("en-US")}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          locale === "en-US"
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  {/* Audio & Motion Quick Controls inside Avatar Popover */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 border-b border-white/[0.06] pb-2 mb-1">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEn ? "Effects" : "视听动效"}</span>
                    </span>
                    <GameQuickControls compact />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleNavClick("/settings");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.profile?.tabSettings || (isEn ? "Preferences" : "个人偏好设置")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleNavClick("/assets");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? "Cognitive Assets" : "认知资产与图鉴"}</span>
                  </button>

                  <div className="border-t border-white/[0.06] my-1 pt-1 flex items-center justify-between px-3 py-1 text-[11px] text-slate-500">
                    <a
                      href="/privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        setUserMenuOpen(false);
                        handleNavClick("/privacy");
                      }}
                      className="hover:text-slate-300 flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{t.legal?.privacyPolicy || "隐私政策"}</span>
                    </a>
                    <span>·</span>
                    <a
                      href="/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        setUserMenuOpen(false);
                        handleNavClick("/terms");
                      }}
                      className="hover:text-slate-300"
                    >
                      {t.legal?.termsOfService || "服务条款"}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.auth?.signOut || (isEn ? "Sign Out" : "退出登录")}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area (No Top Fixed Header Bar) */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto relative">
        {/* Mobile-only floating sidebar drawer button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 rounded-xl bg-slate-900/90 border border-white/15 text-slate-200 flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>

        {children}
      </div>
    </div>
  );
};
