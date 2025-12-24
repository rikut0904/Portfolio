"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 p-4 bg-primary-light shadow-md">
      <div className="flex justify-between items-center">
        <div className="text-xl font-bold text-header-color"><Link href="/">平田 陸翔</Link></div>
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

      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="absolute inset-0 bg-primary-color/15 backdrop-blur-sm"
          aria-label="メニューを閉じる"
          onClick={() => setIsOpen(false)}
        />
        <nav
          className={`absolute right-0 top-0 h-full w-80 bg-primary-light text-header-color shadow-lg pt-16 px-7 pb-7 flex flex-col space-y-6 text-xl transition-transform duration-200 ease-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-4xl text-header-color"
            aria-label="メニューを閉じる"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
          <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link href="/activities" onClick={() => setIsOpen(false)}>課外活動</Link>
          <Link href="/product" onClick={() => setIsOpen(false)}>作品紹介</Link>
          <Link href="/contact" onClick={() => setIsOpen(false)}>お問い合わせ</Link>
        </nav>
      </div>
    </header>
  );
}
