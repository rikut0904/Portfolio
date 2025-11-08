import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "平田 陸翔 | ポートフォリオ",
  description: "金沢工業大学 平田陸翔のポートフォリオサイト",
  icons: {
    icon: "/img/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
