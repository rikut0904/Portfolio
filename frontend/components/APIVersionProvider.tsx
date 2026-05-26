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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/app-mode", { cache: "no-store" });
      const data = await res.json();
      const nextVersion = data.apiVersion === "v2" ? "v2" : "v1";
      setVersionState(nextVersion);
      (window as any).__API_VERSION = nextVersion;
    } catch (err) {
      console.error("Failed to fetch API version:", err);
    }
  }, []);

  const setVersion = useCallback((v: APIVersion) => {
    setVersionState(v);
    (window as any).__API_VERSION = v;
  }, []);

  useEffect(() => {
    // Initial fetch
    fetch("/api/app-mode", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const v = data.apiVersion === "v2" ? "v2" : "v1";
        setVersionState(v);
        (window as any).__API_VERSION = v;
      })
      .catch((err) => console.error("Failed to fetch API version:", err));

    // Monkey-patch fetch to respect the version
    const originalFetch = window.fetch;
    window.fetch = async (url, init) => {
      let finalUrl = url;
      if (
        typeof url === "string" &&
        url.startsWith("/api/") &&
        !url.startsWith("/api/v2/") &&
        !url.includes("app-mode") &&
        !url.includes("auth")
      ) {
        const currentVersion = (window as any).__API_VERSION || "v1";
        if (currentVersion === "v2") {
          finalUrl = url.replace("/api/", "/api/v2/");
        }
      }
      return originalFetch(finalUrl, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
