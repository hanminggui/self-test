import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import ProfileDashboard from "./ProfileDashboard";
import { LegalPage } from "./legal/LegalPage";
import { SharePage } from "./pages/SharePage";
import { DuelPage } from "./pages/DuelPage";
import { GuestLandingPage } from "./pages/GuestLandingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AppLayout } from "./components/layout/AppLayout";
import { LocaleProvider } from "./contexts/LocaleContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import { GameEffectsProvider } from "./contexts/GameEffectsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { resolveRouteView } from "./utils/sessionRoute";
import { AuthModal } from "./components/auth/AuthModal";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const AppRouter: React.FC = () => {
  const { user, loading, isAuthModalOpen, closeAuthModal, login } = useUser();

  const [locationState, setLocationState] = useState(() => ({
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    search: typeof window !== "undefined" ? window.location.search : "",
    hash: typeof window !== "undefined" ? window.location.hash : "",
  }));

  const syncLocation = useCallback(() => {
    if (typeof window === "undefined") return;
    setLocationState({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
    };
  }, [syncLocation]);

  const navigate = useCallback(
    (path: string) => {
      if (typeof window === "undefined") return;
      if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({}, "", path);
      }
      syncLocation();
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [syncLocation]
  );

  const isAuthenticated = Boolean(user);
  const resolved = resolveRouteView(
    locationState.pathname,
    isAuthenticated,
    locationState.search,
    locationState.hash
  );

  // Seamless compatibility redirect for legacy /me and /me/settings paths
  useEffect(() => {
    if (resolved.redirectTo && typeof window !== "undefined") {
      const searchSuffix = window.location.search || "";
      window.history.replaceState({}, "", `${resolved.redirectTo}${searchSuffix}`);
      syncLocation();
    }
  }, [resolved.redirectTo, syncLocation]);

  // 3. Render target page view
  const renderViewContent = () => {
    switch (resolved.view) {
      case "history":
        return <ProfileDashboard />;
      case "settings":
        return <SettingsPage />;
      case "assets":
        return <AssetsPage onNavigate={navigate} />;
      case "test":
      case "report":
      default:
        return <App inAppLayout={resolved.inAppLayout} onNavigate={navigate} />;
    }
  };

  // 1. Standalone Public & Admin Surfaces (Always outside AppLayout)
  let content: React.ReactNode;
  if (resolved.view === "admin") {
    content = <Admin />;
  } else if (resolved.view === "privacy") {
    content = <LegalPage type="privacy" />;
  } else if (resolved.view === "terms") {
    content = <LegalPage type="terms" />;
  } else if (resolved.view === "share") {
    content = <SharePage />;
  } else if (resolved.view === "duel") {
    content = <DuelPage />;
  } else if (loading && locationState.pathname === "/") {
    // Avoid flashing Guest Landing Page while checking initial auth cookie on "/"
    content = (
      <div className="min-h-screen bg-[#06080f] text-slate-200 flex items-center justify-center">
        <div className="w-8 h-8 rounded-xl border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
      </div>
    );
  } else if (resolved.view === "landing") {
    // 2. Guest Official Landing Page (Unauthenticated "/")
    content = <GuestLandingPage onNavigate={navigate} />;
  } else if (resolved.inAppLayout) {
    // 4. Unified App Layout Criterion: (isAuthenticated && route supports AppLayout)
    content = (
      <AppLayout currentPath={locationState.pathname} onNavigate={navigate}>
        {renderViewContent()}
      </AppLayout>
    );
  } else {
    content = renderViewContent();
  }

  return (
    <>
      {content}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onSelectProvider={login}
      />
    </>
  );
};

const Root: React.FC = () => {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <UserProvider>
          <GameEffectsProvider>
            <AppRouter />
          </GameEffectsProvider>
        </UserProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
