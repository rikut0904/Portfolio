"use client";

import React, { useEffect, useState } from "react";
import FadeInSection from "../../components/FadeInSection";
import ProductCard from "../../components/ProductCard";
import SiteLayout from "../../components/layouts/SiteLayout";

interface Product {
  id: string;
  title: string;
  image: string;
  description: string;
  category?: string;
  technologies?: string[];
  status?: string;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 定数定義（管理画面と同じ）
const CATEGORIES = [
  "Webアプリケーション",
  "モバイルアプリ",
  "ツール・システム",
  "ゲーム",
  "その他"
];

const TECHNOLOGIES = [
  "React", "Next.js", "Vue.js", "Angular",
  "Flutter", "React Native", "Swift", "Kotlin",
  "Python", "Go", "Java", "C#", "PHP", "Ruby",
  "Node.js", "Firebase", "AWS", "Docker",
  "TypeScript", "JavaScript", "HTML/CSS"
];

const STATUSES = ["公開中", "非公開", "開発中"];

export default function ProductSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルター・ソート用のstate
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("公開中"); // デフォルトで公開中のみ
  const [filterYear, setFilterYear] = useState("");
  const [sortBy, setSortBy] = useState("createdAt-asc");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  // フィルター・ソート処理
  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];

    // カテゴリフィルター
    if (filterCategory) {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    // 使用技術フィルター
    if (filterTechnologies.length > 0) {
      filtered = filtered.filter(p =>
        p.technologies?.some(tech => filterTechnologies.includes(tech))
      );
    }

    // ステータスフィルター（デフォルトで公開中のみ）
    if (filterStatus) {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // 作成年フィルター
    if (filterYear) {
      filtered = filtered.filter(p => p.year?.toString() === filterYear);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "createdAt-asc":
          return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        case "createdAt-desc":
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        case "updatedAt-desc":
          return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredProducts = getFilteredAndSortedProducts();

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-color"></div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <FadeInSection>
        <section id="products">
          <h2>制作物一覧</h2>

          {/* フィルター・ソート */}
          <div className="card mb-8">
            <h3 className="text-lg font-semibold mb-4">フィルター・ソート</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* カテゴリフィルター */}
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 作成年フィルター */}
              <div>
                <label className="block text-sm font-medium mb-1">作成年</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              {/* ソート */}
              <div>
                <label className="block text-sm font-medium mb-1">並び順</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="createdAt-asc">作成日時（古い順）</option>
                  <option value="createdAt-desc">作成日時（新しい順）</option>
                  <option value="updatedAt-desc">更新日時（新しい順）</option>
                  <option value="title-asc">タイトル（あ→ん）</option>
                  <option value="title-desc">タイトル（ん→あ）</option>
                </select>
              </div>

              {/* 使用技術フィルター */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-2">使用技術</label>
                <div className="flex flex-wrap gap-2">
                  {TECHNOLOGIES.map((tech) => (
                    <button
                      key={tech}
                      onClick={() => {
                        if (filterTechnologies.includes(tech)) {
                          setFilterTechnologies(filterTechnologies.filter(t => t !== tech));
                        } else {
                          setFilterTechnologies([...filterTechnologies, tech]);
                        }
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filterTechnologies.includes(tech)
                          ? "bg-primary-color text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* フィルタークリアボタン */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilterCategory("");
                  setFilterTechnologies([]);
                  setFilterStatus("公開中");
                  setFilterYear("");
                  setSortBy("createdAt-asc");
                }}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                フィルターをクリア
              </button>
              <span className="ml-4 text-sm text-gray-600">
                {filteredProducts.length}件 / 全{products.length}件
              </span>
            </div>
          </div>

          {/* 作品一覧 */}
          <div className="grid-card">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">該当する作品がありません</p>
            ) : (
              filteredProducts.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  image={product.image}
                  description={product.description}
                />
              ))
            )}
          </div>
        </section>
      </FadeInSection>
    </SiteLayout>
  );
}
