import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import { LocaleProvider } from "./contexts/LocaleContext";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const isAdmin = window.location.pathname.startsWith("/admin");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider>
      {isAdmin ? <Admin /> : <App />}
    </LocaleProvider>
  </React.StrictMode>
);

