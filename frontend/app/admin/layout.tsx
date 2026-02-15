import type { Metadata } from "next";
import AdminHeader from "./header";

export const metadata: Metadata = {
  title: "管理画面 | 平田 陸翔",
  description: "ポートフォリオサイト管理画面",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin min-h-screen bg-gray-50 pt-20">
      <AdminHeader />
      {children}
    </div>
  );
}
