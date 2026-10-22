import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import ProfileDashboard from "./ProfileDashboard";
import { LegalPage } from "./legal/LegalPage";
import { LocaleProvider } from "./contexts/LocaleContext";
import { UserProvider } from "./contexts/UserContext";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const Root: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const isAdmin = currentPath.startsWith("/admin");
  const isMe = currentPath === "/me" || currentPath.startsWith("/me/");
  const isPrivacy = currentPath.startsWith("/privacy");
  const isTerms = currentPath.startsWith("/terms");

  const renderContent = () => {
    if (isAdmin) return <Admin />;
    if (isMe) return <ProfileDashboard />;
    if (isPrivacy) return <LegalPage type="privacy" />;
    if (isTerms) return <LegalPage type="terms" />;
    return <App />;
  };

  return (
    <LocaleProvider>
      <UserProvider>
        {renderContent()}
      </UserProvider>
    </LocaleProvider>
  );
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

