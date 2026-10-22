import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "../../storage/user";
import { getLastCompletedSession, clearLastCompletedSession } from "../utils/sessionRoute";

export interface EnabledProviders {
  github: boolean;
  linuxdo: boolean;
  google: boolean;
}

export interface UserContextType {
  user: User | null;
  loading: boolean;
  enabledProviders: EnabledProviders;
  hasAnyProvider: boolean;
  login: (provider: "github" | "linuxdo" | "google") => void;
  logout: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  refreshUser: () => Promise<void>;
  refreshProviders: () => Promise<void>;
  sessionSyncVersion: number;
  notifySessionChanged: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [sessionSyncVersion, setSessionSyncVersion] = useState<number>(0);
  const [enabledProviders, setEnabledProviders] = useState<EnabledProviders>({
    github: true,
    linuxdo: true,
    google: true,
  });

  const notifySessionChanged = useCallback(() => {
    setSessionSyncVersion((v) => v + 1);
  }, []);

  // Automatically claim local unclaimed guest session when user logs in on this device
  const claimLocalUnclaimedSession = useCallback(async (loggedInUser: User) => {
    if (!loggedInUser) return;
    const localRecord = getLastCompletedSession();
    if (!localRecord?.sessionId) return;

    try {
      const res = await fetch("/api/sessions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ session_id: localRecord.sessionId }),
      });
      if (res.ok) {
        clearLastCompletedSession();
        setSessionSyncVersion((v) => v + 1);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("metacognitive:session-claimed", {
              detail: { sessionId: localRecord.sessionId },
            })
          );
        }
      }
    } catch {
      // Keep in localStorage to retry on next load if network failed
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const resolvedUser: User | null = data.user || null;
        setUser(resolvedUser);
        if (resolvedUser) {
          await claimLocalUnclaimedSession(resolvedUser);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [claimLocalUnclaimedSession]);

  const refreshProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/providers", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.providers) {
          setEnabledProviders({
            github: Boolean(data.providers.github),
            linuxdo: Boolean(data.providers.linuxdo),
            google: Boolean(data.providers.google),
          });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshUser();
    refreshProviders();
  }, [refreshUser, refreshProviders]);

  const hasAnyProvider = enabledProviders.github || enabledProviders.linuxdo || enabledProviders.google;

  const login = useCallback((provider: "github" | "linuxdo" | "google") => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        enabledProviders,
        hasAnyProvider,
        login,
        logout,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        refreshUser,
        refreshProviders,
        sessionSyncVersion,
        notifySessionChanged,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      enabledProviders: { github: true, linuxdo: true, google: true },
      hasAnyProvider: true,
      login: () => {},
      logout: async () => {},
      openAuthModal: () => {},
      closeAuthModal: () => {},
      isAuthModalOpen: false,
      refreshUser: async () => {},
      refreshProviders: async () => {},
      sessionSyncVersion: 0,
      notifySessionChanged: () => {},
    };
  }
  return ctx;
}
