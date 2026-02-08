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
      <head>
        <script defer src="https://cloud.umami.is/script.js" data-website-id="21b7a828-5f59-42e8-94b6-8c62fd190fd5"></script>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-JTH2XG05YV"></script>
        <script>
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-JTH2XG05YV');
          `}
        </script>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
