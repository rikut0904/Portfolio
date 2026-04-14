import React from "react";
import Header from "../../app/header";

interface SiteLayoutProps {
  children: React.ReactNode;
  /** 週カレンダーなど横幅の広いコンテンツ向け */
  wide?: boolean;
}

export default function SiteLayout({ children, wide }: SiteLayoutProps) {
  return (
    <>
      <Header />
      <main
        className={`mx-auto px-6 pt-20 ${wide ? "max-w-7xl" : "max-w-5xl"}`}
      >
        {children}
      </main>
      <footer className="text-center py-6">&copy; 2025 平田 陸翔</footer>
    </>
  );
}
