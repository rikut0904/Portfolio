import React from "react";
import Header from "../../app/header";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-6 pt-20">{children}</main>
      <footer className="text-center py-6">&copy; 2025 平田 陸翔</footer>
    </>
  );
}
