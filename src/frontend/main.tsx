import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import ProfileDashboard from "./ProfileDashboard";
import { LegalPage } from "./legal/LegalPage";
import { SharePage } from "./pages/SharePage";
import { GuestLandingPage } from "./pages/GuestLandingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AppLayout } from "./components/layout/AppLayout";
import { LocaleProvider } from "./contexts/LocaleContext";
import { UserProvider, useUser } from "./contexts/UserContext";
import { resolveRouteView } from "./utils/sessionRoute";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const AppRouter: React.FC = () => {
  const { user, loading } = useUser();

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

  // 1. Standalone Public & Admin Surfaces (Always outside AppLayout)
  if (resolved.view === "admin") {
    return <Admin />;
  }
  if (resolved.view === "privacy") {
    return <LegalPage type="privacy" />;
  }
  if (resolved.view === "terms") {
    return <LegalPage type="terms" />;
  }
  if (resolved.view === "share") {
    return <SharePage />;
  }

  // Avoid flashing Guest Landing Page while checking initial auth cookie on "/"
  if (loading && locationState.pathname === "/") {
    return (
      <div className="min-h-screen bg-[#06080f] text-slate-200 flex items-center justify-center">
        <div className="w-8 h-8 rounded-xl border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
      </div>
    );
  }

  // 2. Guest Official Landing Page (Unauthenticated "/")
  if (resolved.view === "landing") {
    return <GuestLandingPage onNavigate={navigate} />;
  }

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

  // 4. Unified App Layout Criterion: (isAuthenticated && route supports AppLayout)
  if (resolved.inAppLayout) {
    return (
      <AppLayout currentPath={locationState.pathname} onNavigate={navigate}>
        {renderViewContent()}
      </AppLayout>
    );
  }

  return renderViewContent();
};

const Root: React.FC = () => {
  return (
    <LocaleProvider>
      <UserProvider>
        <AppRouter />
      </UserProvider>
    </LocaleProvider>
  );
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
