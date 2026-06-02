import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type AuthUser } from "./authTypes";
import { apiMe, apiLogin, apiRegister, apiLogout, apiUpdateLocale } from "../api/client";
import i18n from "../i18n/i18n";

export type { AuthUser } from "./authTypes";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: "en" | "ja") => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const me = await apiMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        await apiLogin({ email, password });
        await refreshUser();
      },
      async register(email, password, displayName) {
        await apiRegister({
          email,
          password,
          displayName,
          preferredLocale: i18n.language === "ja" ? "ja" : "en",
        });
        await refreshUser();
      },
      async logout() {
        await apiLogout();
        setUser(null);
      },
      async setLanguage(lang) {
        i18n.changeLanguage(lang);
        localStorage.setItem("lang", lang);
        if (user) {
          await apiUpdateLocale(lang);
          await refreshUser();
        }
      },
      refreshUser,
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

