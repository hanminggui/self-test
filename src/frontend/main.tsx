import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import { LegalPage } from "./legal/LegalPage";
import { LocaleProvider } from "./contexts/LocaleContext";
import { UserProvider } from "./contexts/UserContext";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const pathname = window.location.pathname;
const isAdmin = pathname.startsWith("/admin");
const isPrivacy = pathname.startsWith("/privacy");
const isTerms = pathname.startsWith("/terms");

const renderContent = () => {
  if (isAdmin) return <Admin />;
  if (isPrivacy) return <LegalPage type="privacy" />;
  if (isTerms) return <LegalPage type="terms" />;
  return <App />;
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider>
      <UserProvider>
        {renderContent()}
      </UserProvider>
    </LocaleProvider>
  </React.StrictMode>
);

