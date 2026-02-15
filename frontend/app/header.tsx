"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import SlideInMenu from "../components/SlideInMenu";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 p-4 bg-primary-light shadow-md">
      <div className="flex justify-between items-center">
        <div className="text-xl font-bold text-header-color">
          <Link href="/">平田 陸翔</Link>
        </div>
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          <span className="text-3xl">☰</span>
        </button>
        <nav className="hidden md:flex space-x-6">
          <Link href="/">Home</Link>
          <Link href="/activities">課外活動</Link>
          <Link href="/product">作品紹介</Link>
          <Link href="/contact">お問い合わせ</Link>
        </nav>
      </div>

      <SlideInMenu
        isOpen={isOpen}
        onClose={closeMenu}
        ariaLabel="メインメニュー"
      >
        <Link href="/" onClick={closeMenu}>
          Home
        </Link>
        <Link href="/activities" onClick={closeMenu}>
          課外活動
        </Link>
        <Link href="/product" onClick={closeMenu}>
          作品紹介
        </Link>
        <Link href="/contact" onClick={closeMenu}>
          お問い合わせ
        </Link>
      </SlideInMenu>
    </header>
  );
}
