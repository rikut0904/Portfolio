"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type APIVersion = "v1" | "v2";

type APIVersionContextType = {
  version: APIVersion;
  setVersion: (v: APIVersion) => void;
  refresh: () => Promise<void>;
};

const APIVersionContext = createContext<APIVersionContextType | undefined>(
  undefined,
);

export function APIVersionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [version, setVersionState] = useState<APIVersion>("v1");

  const updateGlobalVersion = (v: APIVersion) => {
    if (typeof window !== "undefined") {
      (window as any).__API_VERSION = v;
    }
  };

  const refresh = useCallback(async () => {
    try {
      // 常に明示的に v1 (legacy) のエンドポイントを確認する
      const res = await fetch("/api/app-mode", { cache: "no-store" });
      const data = await res.json();
      const nextVersion = data.apiVersion === "v2" ? "v2" : "v1";
      setVersionState(nextVersion);
      updateGlobalVersion(nextVersion);
    } catch (err) {
      console.error("Failed to fetch API version:", err);
    }
  }, []);

  const setVersion = useCallback((v: APIVersion) => {
    setVersionState(v);
    updateGlobalVersion(v);
  }, []);

  useEffect(() => {
    // 初回読み込み
    void refresh();

    // fetch をラップして v2 へ自動リダイレクトする仕組み
    const originalFetch = window.fetch;
    window.fetch = async (url, init) => {
      let finalUrl = url;
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : "";

      if (
        urlStr.startsWith("/api/") &&
        !urlStr.startsWith("/api/v2/") &&
        !urlStr.includes("app-mode") &&
        !urlStr.includes("auth")
      ) {
        const currentVersion = (window as any).__API_VERSION || "v1";
        if (currentVersion === "v2") {
          finalUrl = urlStr.replace("/api/", "/api/v2/");
          console.log(`[API Proxy] Redirecting ${urlStr} -> ${finalUrl}`);
        }
      }
      return originalFetch(finalUrl, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [refresh]);

  return (
    <APIVersionContext.Provider value={{ version, setVersion, refresh }}>
      {children}
    </APIVersionContext.Provider>
  );
}

export function useAPIVersion() {
  const context = useContext(APIVersionContext);
  if (context === undefined) {
    throw new Error("useAPIVersion must be used within an APIVersionProvider");
  }
  return context;
}
