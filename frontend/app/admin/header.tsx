"use client";

import { useCallback, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SlideInMenu from "../../components/SlideInMenu";

export default function AdminHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
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
    <header className="fixed inset-x-0 top-0 z-40 p-4 bg-primary-light shadow-md">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xl font-bold text-header-color">
            管理画面
          </Link>
        </div>
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          <span className="text-3xl">☰</span>
        </button>
        <nav className="hidden md:flex space-x-6">
          <Link href="/admin">ダッシュボード</Link>
          <Link href="/admin/products">作品管理</Link>
          <Link href="/admin/sections">セクション管理</Link>
          <Link href="/admin/inquiries">お問い合わせ管理</Link>
          <Link href="/admin/images">画像管理</Link>
          <Link href="/admin/logs">ログ一覧</Link>
          <Link href="/" target="_blank">
            サイトを見る
          </Link>
          <button onClick={handleSignOut}>ログアウト</button>
        </nav>
      </div>

      <SlideInMenu isOpen={isOpen} onClose={closeMenu} ariaLabel="管理メニュー">
        <Link href="/admin" onClick={closeMenu}>
          ダッシュボード
        </Link>
        <Link href="/admin/products" onClick={closeMenu}>
          作品管理
        </Link>
        <Link href="/admin/sections" onClick={closeMenu}>
          セクション管理
        </Link>
        <Link href="/admin/inquiries" onClick={closeMenu}>
          お問い合わせ管理
        </Link>
        <Link href="/admin/images" onClick={closeMenu}>
          画像管理
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
    </header>
  );
}
