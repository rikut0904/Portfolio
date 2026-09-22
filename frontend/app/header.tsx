"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SlideInMenu from "../components/SlideInMenu";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/activities", label: "Activities" },
  { href: "/product", label: "Works" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setIsOpen(false), []);

  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-brand" aria-label="平田陸翔のホーム">
          RIKUTO HIRATA
        </Link>

        <button
          type="button"
          className="menu-button md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={isOpen}
        >
          <span aria-hidden="true">{isOpen ? "×" : "☰"}</span>
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
            {item.label}
          </Link>
        ))}
      </SlideInMenu>
    </header>
  );
}
