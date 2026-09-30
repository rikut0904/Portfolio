"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SlideInMenu from "../components/SlideInMenu";

const navigation = [
  { href: "/", label: "ホーム" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/activities", label: "課外活動" },
  { href: "/product", label: "作品紹介" },
  { href: "/contact", label: "お問い合わせ" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setIsOpen(false), []);

  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="site-brand" aria-label="平田陸翔のホーム">
            平田 陸翔
          </Link>

          <button
            type="button"
            className={`menu-button ${isOpen ? "menu-button--open" : ""}`}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            <span className="menu-button__icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <nav className="site-nav" aria-label="メインナビゲーション">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <SlideInMenu
        isOpen={isOpen}
        onClose={closeMenu}
        ariaLabel="メインメニュー"
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMenu}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <span>{item.label}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </SlideInMenu>
    </>
  );
}
