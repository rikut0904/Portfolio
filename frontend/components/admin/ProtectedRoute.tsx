"use client";

import { useAuth } from "../../lib/auth/AuthContext";
import AdminLoading from "./AdminLoading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <AdminLoading />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
