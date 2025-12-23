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
        <header className="p-4 bg-primary-light shadow-md">
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

            {isOpen && (
                <nav className="md:hidden mt-4 flex flex-col space-y-4">
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
            )}
        </header>
    );
}
