"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSignInForm from "../../../components/admin/AdminSignInForm";

export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const resolveMode = async () => {
      try {
        const res = await fetch("/api/app-mode", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          appMode?: boolean;
        };
        if (!active) {
          return;
        }
        if (res.ok && body.appMode) {
          router.replace("/admin/signin");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch app mode:", error);
      }
      if (active) {
        setReady(true);
      }
    };

    resolveMode();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        読み込み中...
      </div>
    );
  }

  return <AdminSignInForm />;
}
