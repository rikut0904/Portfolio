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
  apiPath: (path: string) => string;
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
    } catch (err) {
      console.error("Failed to fetch API version:", err);
    }
  }, []);

  const apiPath = useCallback(
    (path: string) => {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      if (version === "v2") {
        return `/api/v2${cleanPath}`;
      }
      return `/api${cleanPath}`;
    },
    [version],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setVersion = useCallback((v: APIVersion) => {
    setVersionState(v);
  }, []);

  return (
    <APIVersionContext.Provider
      value={{ version, setVersion, refresh, apiPath }}
    >
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
