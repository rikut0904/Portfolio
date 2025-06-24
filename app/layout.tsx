import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "平田 陸翔 | ポートフォリオ",
  description: "金沢工業大学 平田陸翔のポートフォリオサイト",
  icons: {
    icon: "/img/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}>
        <header className="p-4">
          <div className="flex justify-end">
            <nav>
              <Link href="/" className="ml-4 hover:underline ">Home</Link>
              <Link href="/Activities" className="ml-4 hover:underline">課外活動</Link>
              <Link href="/Product" className="ml-4 hover:underline">作品紹介</Link>
              <Link href="/Contact" className="ml-4 hover:underline">お問い合わせ</Link>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        <footer className="text-center py-6">
          &copy; 2025 平田 陸翔
        </footer>
      </body>
    </html>
  );
}
