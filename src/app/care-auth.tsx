"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

interface CareAuthValue {
  authenticated: boolean;
  isInitializing: boolean;
  username: string;
  token: string | null;
  secureFetch: ((url: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>) | null;
  demoMode: boolean;
  login: (role?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CareAuthContext = createContext<CareAuthValue | null>(null);

export function CareAuthProvider({
  children,
  demoMode,
}: {
  children: ReactNode;
  demoMode: boolean;
}) {
  return demoMode
    ? <LocalDemoAuth>{children}</LocalDemoAuth>
    : <TideAuth>{children}</TideAuth>;
}

function LocalDemoAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/demo-session", { cache: "no-store" });
      if (!response.ok) throw new Error(`Demo session check failed (${response.status}).`);
      const result: unknown = await response.json();
      if (result && typeof result === "object" && "session" in result) {
        const value = result.session;
        if (
          value &&
          typeof value === "object" &&
          "email" in value &&
          typeof value.email === "string" &&
          "role" in value &&
          typeof value.role === "string"
        ) {
          setSession({ email: value.email, role: value.role });
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (role?: string, email?: string) => {
    if (!role || !email) throw new Error("Select a demo role and enter an email address.");
    const response = await fetch("/api/demo-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, email }),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = result && typeof result === "object" && "error" in result
        ? String(result.error)
        : `Demo sign-in failed (${response.status}).`;
      throw new Error(message);
    }
    setSession({ email: email.trim().toLowerCase(), role });
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch("/api/demo-session", { method: "DELETE" });
    if (!response.ok) throw new Error(`Demo sign-out failed (${response.status}).`);
    setSession(null);
  }, []);

  const value: CareAuthValue = {
    authenticated: session !== null,
    isInitializing,
    username: session?.email ?? "",
    token: null,
    secureFetch: null,
    demoMode: true,
    login,
    logout,
  };

  return <CareAuthContext.Provider value={value}>{children}</CareAuthContext.Provider>;
}

function TideAuth({ children }: { children: ReactNode }) {
  const tide = useTideCloak();
  const value: CareAuthValue = {
    authenticated: tide.authenticated,
    isInitializing: tide.isInitializing,
    username: String(tide.getValueFromIdToken("preferred_username") || ""),
    token: tide.token,
    secureFetch: tide.secureFetch,
    demoMode: false,
    login: async () => { await tide.login(); },
    logout: async () => { await tide.logout(); },
  };
  return <CareAuthContext.Provider value={value}>{children}</CareAuthContext.Provider>;
}

export function useCareAuth(): CareAuthValue {
  const value = useContext(CareAuthContext);
  if (!value) throw new Error("useCareAuth must be used inside CareAuthProvider.");
  return value;
}
