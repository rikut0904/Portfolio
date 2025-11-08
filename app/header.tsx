"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="p-4 bg-primary-light shadow-md">
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

      {isOpen && (
        <nav className="md:hidden mt-4 flex flex-col space-y-4">
          <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link href="/activities" onClick={() => setIsOpen(false)}>課外活動</Link>
          <Link href="/product" onClick={() => setIsOpen(false)}>作品紹介</Link>
          <Link href="/contact" onClick={() => setIsOpen(false)}>お問い合わせ</Link>
        </nav>
      )}
    </header>
  );
}