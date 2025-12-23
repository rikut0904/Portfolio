"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../components/admin/ProtectedRoute";
import Link from "next/link";

interface Stats {
  productsCount: number;
  sectionsCount: number;
  publicProductsCount: number;
}

function DashboardContent() {
  const [stats, setStats] = useState<Stats>({
    productsCount: 0,
    sectionsCount: 0,
    publicProductsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 作品数を取得
      const productsRes = await fetch("/api/products");
      const productsData = await productsRes.json();
      const products = productsData.products || [];

      // セクション数を取得
      const sectionsRes = await fetch("/api/sections");
      const sectionsData = await sectionsRes.json();
      const sections = sectionsData.sections || [];

      // 公開中の作品数
      const publicProducts = products.filter((p: any) => p.status === "公開");

      setStats({
        productsCount: products.length,
        sectionsCount: sections.length,
        publicProductsCount: publicProducts.length,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* セクション管理 */}
          <Link
            href="/admin/sections"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">セクション管理</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  プロフィール、資格、履歴などのセクションを編集
                </p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </Link>

          {/* 作品管理 */}
          <Link
            href="/admin/products"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">作品管理</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">制作物の追加・編集・削除</p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </Link>

          {/* 画像管理 */}
          <Link
            href="/admin/images"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">画像管理</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  画像のアップロード・管理（GitHub連携）
                </p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </Link>

          {/* 技術管理 */}
          <Link
            href="/admin/technologies"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">技術管理</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  使用技術の追加・削除
                </p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
          </Link>

          {/* 課外活動管理 */}
          <Link
            href="/admin/activities"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">課外活動管理</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  課外活動カテゴリと参加活動の管理
                </p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </Link>

          {/* ログ一覧 */}
          <Link
            href="/admin/logs"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">ログ一覧</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  管理操作のログを確認
                </p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h10"
                />
              </svg>
            </div>
          </Link>

          {/* プレビュー */}
          <Link
            href="/"
            target="_blank"
            className="bg-white p-3 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 truncate">サイトを表示</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">公開ページを別タブで開く</p>
              </div>
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* 統計情報 */}
        <div className="mt-4 sm:mt-8 bg-white p-3 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">クイック情報</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.sectionsCount}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">セクション</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.productsCount}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">制作物（全体）</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.publicProductsCount}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">公開中の作品</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
