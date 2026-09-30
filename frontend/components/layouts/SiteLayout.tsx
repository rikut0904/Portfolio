import React from "react";
import Header from "../../app/header";

interface SiteLayoutProps {
  children: React.ReactNode;
  /** 週カレンダーなど横幅の広いコンテンツ向け */
  wide?: boolean;
  className?: string;
}

export default function SiteLayout({
  children,
  wide = false,
  className = "",
}: SiteLayoutProps) {
  return (
    <>
      <Header />
      <main
        className={["site-main", wide ? "site-main--wide" : "", className]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      <footer className="site-footer">
        <p>&copy; 2025 - {new Date().getFullYear()} 平田 陸翔</p>
      </footer>
    </>
  );
}
