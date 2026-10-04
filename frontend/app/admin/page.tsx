"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/admin/ProtectedRoute";
import AdminLoading from "../../components/admin/AdminLoading";

interface Stats {
  productsCount: number;
  sectionsCount: number;
  publicProductsCount: number;
}

const primaryAdminLinks = [
  {
    href: "/admin/sections",
    label: "セクション管理",
    description: "プロフィール・資格・履歴を編集",
  },
  {
    href: "/admin/activities",
    label: "課外活動管理",
    description: "課外活動の追加・編集・公開状態を管理",
  },
  {
    href: "/admin/products",
    label: "作品管理",
    description: "制作物の追加・編集・公開状態を管理",
  },
  {
    href: "/admin/calendar",
    label: "予定管理",
    description: "Googleカレンダーの予定を確認",
  },
  {
    href: "/admin/contact",
    label: "お問い合わせ管理",
    description: "お問い合わせの確認と返信",
  },
] as const;

const utilityAdminLinks = [
  { href: "/admin/images", label: "画像管理" },
  { href: "/admin/technologies", label: "技術管理" },
  { href: "/admin/logs", label: "ログ一覧" },
] as const;

function DashboardContent() {
  const [stats, setStats] = useState<Stats>({
    productsCount: 0,
    sectionsCount: 0,
    publicProductsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [productsRes, sectionsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/sections"),
      ]);
      const productsData = await productsRes.json();
      const sectionsData = await sectionsRes.json();
      const products = productsData.products || [];
      const sections = sectionsData.sections || [];

      setStats({
        productsCount: products.length,
        sectionsCount: sections.length,
        publicProductsCount: products.filter(
          (product: { status?: string }) => product.status === "公開",
        ).length,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="admin-dashboard min-h-screen bg-gray-100">
      <main className="admin-dashboard__main">
        <header className="admin-dashboard__intro">
          <p className="section-kicker">Workspace</p>
          <h1>管理画面</h1>
        </header>

        <section aria-labelledby="admin-primary-heading">
          <div className="admin-dashboard__section-heading">
            <div>
              <p className="admin-dashboard__eyebrow">MAIN MENU</p>
              <h2 id="admin-primary-heading">主要メニュー</h2>
            </div>
            <span>{primaryAdminLinks.length}項目</span>
          </div>
          <div className="admin-dashboard__primary-grid">
            {primaryAdminLinks.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="admin-menu-card"
              >
                <span className="admin-menu-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="admin-menu-card__body">
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </span>
                <span className="admin-menu-card__arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="admin-dashboard__secondary"
          aria-labelledby="admin-secondary-heading"
        >
          <div className="admin-dashboard__section-heading">
            <div>
              <p className="admin-dashboard__eyebrow">TOOLS</p>
              <h2 id="admin-secondary-heading">その他の管理</h2>
            </div>
          </div>
          <div className="admin-dashboard__utility-grid">
            {utilityAdminLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="admin-utility-link"
              >
                <span>{item.label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="admin-dashboard__stats"
          aria-labelledby="admin-stats-heading"
        >
          <div className="admin-dashboard__section-heading">
            <div>
              <p className="admin-dashboard__eyebrow">OVERVIEW</p>
              <h2 id="admin-stats-heading">クイック情報</h2>
            </div>
          </div>
          {loading ? (
            <AdminLoading compact />
          ) : (
            <div className="admin-dashboard__stats-grid">
              <div>
                <strong>{stats.sectionsCount}</strong>
                <span>セクション</span>
              </div>
              <div>
                <strong>{stats.productsCount}</strong>
                <span>制作物（全体）</span>
              </div>
              <div>
                <strong>{stats.publicProductsCount}</strong>
                <span>公開中の作品</span>
              </div>
            </div>
          )}
        </section>
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
