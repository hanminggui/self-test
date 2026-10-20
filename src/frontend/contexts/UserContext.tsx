import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "../../storage/user";

export interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (provider: "github" | "linuxdo" | "google") => void;
  logout: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((provider: "github" | "linuxdo" | "google") => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        refreshUser,
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
      login: () => {},
      logout: async () => {},
      openAuthModal: () => {},
      closeAuthModal: () => {},
      isAuthModalOpen: false,
      refreshUser: async () => {},
    };
  }
  return ctx;
}
