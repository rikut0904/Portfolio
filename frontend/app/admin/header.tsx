"use client";

import { useCallback, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SlideInMenu from "../../components/SlideInMenu";

export default function AdminHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();
  const closeMenu = useCallback(() => setIsOpen(false), []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/admin/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <>
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="admin-header__brand">
              管理画面
            </Link>
          </div>
          <button
            type="button"
            className={`admin-header__menu-button ${isOpen ? "is-open" : ""}`}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? "管理メニューを閉じる" : "管理メニューを開く"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <nav className="admin-header__nav" aria-label="管理メニュー">
            <Link href="/admin/sections">セクション管理</Link>
            <Link href="/admin/activities">課外活動管理</Link>
            <Link href="/admin/products">作品管理</Link>
            <Link href="/admin/calendar">予定管理</Link>
            <Link href="/admin/contact">お問い合わせ管理</Link>
            <Link href="/admin/logs">ログ一覧</Link>
            <Link href="/" target="_blank">
              サイトを見る
            </Link>
            <button onClick={handleSignOut}>ログアウト</button>
          </nav>
        </div>
      </header>

      <SlideInMenu isOpen={isOpen} onClose={closeMenu} ariaLabel="管理メニュー">
        <Link href="/admin/sections" onClick={closeMenu}>
          セクション管理
        </Link>
        <Link href="/admin/activities" onClick={closeMenu}>
          課外活動管理
        </Link>
        <Link href="/admin/products" onClick={closeMenu}>
          作品管理
        </Link>
        <Link href="/admin/calendar" onClick={closeMenu}>
          予定管理
        </Link>
        <Link href="/admin/contact" onClick={closeMenu}>
          お問い合わせ管理
        </Link>
        <Link href="/admin/logs" onClick={closeMenu}>
          ログ一覧
        </Link>
        <Link href="/" onClick={closeMenu} target="_blank">
          サイトを見る
        </Link>
        <button onClick={handleSignOut} className="text-left">
          ログアウト
        </button>
      </SlideInMenu>
    </>
  );
}
