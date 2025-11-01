import type { Metadata } from "next";
import AdminHeader from "./header";

export const metadata: Metadata = {
  title: "管理画面 | 平田 陸翔",
  description: "ポートフォリオサイト管理画面",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      {children}
    </div>
  );
}
