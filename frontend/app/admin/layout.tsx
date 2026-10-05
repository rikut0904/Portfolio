import type { Metadata } from "next";
import AdminPageShell from "../../components/admin/AdminPageShell";

export const metadata: Metadata = {
  title: "管理画面 | 平田 陸翔",
  description: "ポートフォリオサイト管理画面",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPageShell>{children}</AdminPageShell>;
}
