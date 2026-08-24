"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = { uid: string; email: string; getAuthHeader: () => Promise<string> };
type AuthContextType = { user: AuthUser | null; loading: boolean; signIn: (username: string, password: string) => Promise<void>; signOut: () => Promise<void> };
type Session = { credential: string; uid: string; email: string };

const LEGACY_SESSION_KEY = "portfolio_admin_basic_session_v1";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function basicAuthHeader(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : `HTTP ${res.status}`);
  return body as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const logAuthEvent = useCallback(async (action: "login" | "logout", credential: string) => {
    try {
      await fetch("/api/admin-logs", {
        method: "POST",
        headers: { Authorization: credential, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch (error) { console.error("Auth log error:", error); }
  }, []);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
  }, []);

  const authUser = useMemo<AuthUser | null>(() => session ? {
    uid: session.uid,
    email: session.email,
    getAuthHeader: async () => session.credential,
  } : null, [session]);

  useEffect(() => {
    // Remove credentials stored by the previous implementation.
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();
    const credential = basicAuthHeader(normalizedUsername, normalizedPassword);
    const result = await fetchJSON<{ user: { uid: string; email: string } }>("/api/auth/login", {
      method: "POST",
      headers: { Authorization: credential, "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
    });
    const next = { credential, uid: result.user.uid, email: result.user.email };
    applySession(next);
    await logAuthEvent("login", credential);
  }, [applySession, logAuthEvent]);

  const signOut = useCallback(async () => {
    try { if (session?.credential) await logAuthEvent("logout", session.credential); }
    finally { applySession(null); }
  }, [applySession, logAuthEvent, session?.credential]);

  return <AuthContext.Provider value={{ user: authUser, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
