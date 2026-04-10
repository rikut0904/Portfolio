"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthUser = {
  uid: string;
  email: string;
  getIdToken: () => Promise<string>;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type Session = {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  uid: string;
  email: string;
};

const SESSION_KEY = "portfolio_admin_session_v1";
const REFRESH_MARGIN_SEC = 60;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Session;
    if (
      !parsed.idToken ||
      !parsed.refreshToken ||
      !parsed.uid ||
      !parsed.email
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function decodeJwtExp(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return 0;
    }
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Promise<string> | null>(null);

  const logAuthEvent = useCallback(
    async (action: "login" | "logout", token: string) => {
      try {
        await fetch("/api/admin-logs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        });
      } catch (error) {
        console.error("Auth log error:", error);
      }
    },
    [],
  );

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    writeSession(next);
  }, []);

  const refreshIdToken = useCallback(async (): Promise<string> => {
    if (!session) {
      throw new Error("Not authenticated");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (session.expiresAt - nowSec > REFRESH_MARGIN_SEC) {
      return session.idToken;
    }

    if (refreshing) {
      return refreshing;
    }

    const promise = (async () => {
      const refreshed = await fetchJSON<{
        idToken: string;
        refreshToken: string;
        expiresIn: string;
        user?: { uid?: string; email?: string };
      }>("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      const expiresInSec = parseInt(refreshed.expiresIn || "3600", 10);
      const exp = decodeJwtExp(refreshed.idToken);
      const next: Session = {
        idToken: refreshed.idToken,
        refreshToken: refreshed.refreshToken || session.refreshToken,
        expiresAt:
          exp ||
          Math.floor(Date.now() / 1000) +
            (Number.isFinite(expiresInSec) ? expiresInSec : 3600),
        uid: refreshed.user?.uid || session.uid,
        email: refreshed.user?.email || session.email,
      };
      applySession(next);
      return next.idToken;
    })();

    setRefreshing(promise);
    try {
      return await promise;
    } finally {
      setRefreshing(null);
    }
  }, [applySession, refreshing, session]);

  const authUser = useMemo<AuthUser | null>(() => {
    if (!session) {
      return null;
    }
    return {
      uid: session.uid,
      email: session.email,
      getIdToken: refreshIdToken,
    };
  }, [refreshIdToken, session]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const existing = readSession();
        if (!existing) {
          applySession(null);
          return;
        }
        applySession(existing);

        const token = await (async () => {
          const nowSec = Math.floor(Date.now() / 1000);
          if (existing.expiresAt - nowSec > REFRESH_MARGIN_SEC) {
            return existing.idToken;
          }
          const refreshed = await fetchJSON<{
            idToken: string;
            refreshToken: string;
            expiresIn: string;
            user?: { uid?: string; email?: string };
          }>("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: existing.refreshToken }),
          });
          const expiresInSec = parseInt(refreshed.expiresIn || "3600", 10);
          const exp = decodeJwtExp(refreshed.idToken);
          const next: Session = {
            idToken: refreshed.idToken,
            refreshToken: refreshed.refreshToken || existing.refreshToken,
            expiresAt:
              exp ||
              Math.floor(Date.now() / 1000) +
                (Number.isFinite(expiresInSec) ? expiresInSec : 3600),
            uid: refreshed.user?.uid || existing.uid,
            email: refreshed.user?.email || existing.email,
          };
          applySession(next);
          return next.idToken;
        })();

        const me = await fetchJSON<{ user: { uid: string; email: string } }>(
          "/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const current = readSession() || existing;
        applySession({
          ...current,
          uid: me.user.uid,
          email: me.user.email,
        });
      } catch (error) {
        console.error("Auth bootstrap error:", error);
        applySession(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await fetchJSON<{
        idToken: string;
        refreshToken: string;
        expiresIn: string;
        user: { uid: string; email: string };
      }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const expiresInSec = parseInt(result.expiresIn || "3600", 10);
      const exp = decodeJwtExp(result.idToken);
      const next: Session = {
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresAt:
          exp ||
          Math.floor(Date.now() / 1000) +
            (Number.isFinite(expiresInSec) ? expiresInSec : 3600),
        uid: result.user.uid,
        email: result.user.email,
      };
      applySession(next);
      await logAuthEvent("login", next.idToken);
    },
    [applySession, logAuthEvent],
  );

  const signOut = useCallback(async () => {
    try {
      if (session?.idToken) {
        await logAuthEvent("logout", session.idToken);
      }
    } finally {
      applySession(null);
    }
  }, [applySession, logAuthEvent, session?.idToken]);

  return (
    <AuthContext.Provider value={{ user: authUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
