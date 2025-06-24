import type { Metadata } from "next";
import Header from "./header";
import "./globals.css";

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
        <Header />
        <main className="max-w-5xl mx-auto px-6">{children}</main>
        <footer className="text-center py-6">&copy; 2025 平田 陸翔</footer>
      </body>
    </html>
  );
}
