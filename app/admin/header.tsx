"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, signOut } = useAuth();
    const router = useRouter();

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
                    <Link href="/admin">
                        ダッシュボード
                    </Link>
                    <Link href="/admin/products">
                        作品管理
                    </Link>
                    <Link href="/admin/sections">
                        セクション管理
                    </Link>
                    <Link href="/admin/images">
                        画像管理
                    </Link>
                    <Link href="/admin/logs">
                        ログ一覧
                    </Link>
                    <Link href="/" target="_blank">
                        サイトを見る
                    </Link>
                    <button onClick={handleSignOut}>
                        ログアウト
                    </button>
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
                    <Link href="/admin" onClick={() => setIsOpen(false)}>
                        ダッシュボード
                    </Link>
                    <Link href="/admin/products" onClick={() => setIsOpen(false)}>
                        作品管理
                    </Link>
                    <Link href="/admin/sections" onClick={() => setIsOpen(false)}>
                        セクション管理
                    </Link>
                    <Link href="/admin/images" onClick={() => setIsOpen(false)}>
                        画像管理
                    </Link>
                    <Link href="/admin/logs" onClick={() => setIsOpen(false)}>
                        ログ一覧
                    </Link>
                    <Link href="/" onClick={() => setIsOpen(false)} target="_blank">
                        サイトを見る
                    </Link>
                    <button onClick={handleSignOut} className="text-left">
                        ログアウト
                    </button>
                </nav>
            </div>
        </header>
    );
}
