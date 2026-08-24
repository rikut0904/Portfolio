"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = { uid: string; email: string; getAuthHeader: () => Promise<string> };
type AuthContextType = { user: AuthUser | null; loading: boolean; signIn: (username: string, password: string) => Promise<void>; signOut: () => Promise<void> };
type Session = { credential: string; uid: string; email: string };

const SESSION_KEY = "portfolio_admin_basic_session_v1";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return parsed.credential && parsed.uid && parsed.email ? parsed : null;
  } catch { return null; }
}

function writeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
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
    writeSession(next);
  }, []);

  const authUser = useMemo<AuthUser | null>(() => session ? {
    uid: session.uid,
    email: session.email,
    getAuthHeader: async () => session.credential,
  } : null, [session]);

  useEffect(() => {
    const bootstrap = async () => {
      const existing = readSession();
      if (!existing) { applySession(null); setLoading(false); return; }
      try {
        const me = await fetchJSON<{ user: { uid: string; email: string } }>("/api/auth/me", { headers: { Authorization: existing.credential } });
        applySession({ ...existing, uid: me.user.uid, email: me.user.email });
      } catch (error) {
        console.error("Auth bootstrap error:", error);
        applySession(null);
      } finally { setLoading(false); }
    };
    bootstrap();
  }, [applySession]);

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
