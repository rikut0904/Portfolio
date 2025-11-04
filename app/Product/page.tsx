"use client";

import React, { useEffect, useState } from "react";
import FadeInSection from "../../components/FadeInSection";
import ProductCard from "../../components/ProductCard";
import SiteLayout from "../../components/layouts/SiteLayout";
import Accordion from "../../components/Accordion";

interface Product {
  id: string;
  title: string;
  image: string;
  description: string;
  link?: string;
  category?: string;
  technologies?: string[];
  status?: string; // 公開ステータス
  deployStatus?: string; // デプロイ状況
  createdYear?: number; // 作品作成年
  createdMonth?: number; // 作品作成月
  createdAt?: string; // 登録日時
  updatedAt?: string; // 更新日時
}

// 定数定義（管理画面と同じ）
const CATEGORIES = [
  "Webアプリケーション",
  "モバイルアプリ",
  "デスクトップアプリ",
  "ツール・システム",
  "ゲーム",
  "その他"
];

const STATUSES = ["公開", "非公開"];
const DEPLOY_STATUSES = ["公開中", "未公開"];

export default function ProductSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルター・ソート用のstate
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState(""); // 一旦すべて表示
  const [filterYear, setFilterYear] = useState("");
  const [sortBy, setSortBy] = useState("createdYear-desc"); // 新しい順に変更

  useEffect(() => {
    fetchProducts();
    fetchTechnologies();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // データが正しい形式かチェック
      if (data && Array.isArray(data.products)) {
        console.log("取得した作品データ:", data.products);
        console.log("作品数:", data.products.length);
        // 各作品のstatusを確認
        data.products.forEach((p: Product, index: number) => {
          console.log(`作品${index + 1}: ${p.title}, status: ${p.status}`);
        });
        setProducts(data.products);
      } else {
        console.error("Invalid products data format:", data);
        setProducts([]);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnologies = async () => {
    try {
      const response = await fetch("/api/technologies");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // データが正しい形式かチェック
      if (data && Array.isArray(data.technologies)) {
        setTechnologies(data.technologies.map((t: any) => t.name));
      } else {
        console.error("Invalid technologies data format:", data);
        setTechnologies([]);
      }
    } catch (error) {
      console.error("Failed to fetch technologies:", error);
      setTechnologies([]);
    }
  };

  // フィルター・ソート処理
  const getFilteredAndSortedProducts = () => {
    // productsが配列でない場合は空配列を返す
    if (!Array.isArray(products)) {
      return [];
    }

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
      filtered = filtered.filter(p => p.createdYear?.toString() === filterYear);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "createdYear-asc": {
          // 作成年月（古い順）
          const yearDiff = (a.createdYear || 0) - (b.createdYear || 0);
          if (yearDiff !== 0) return yearDiff;
          return (a.createdMonth || 0) - (b.createdMonth || 0);
        }
        case "createdYear-desc": {
          // 作成年月（新しい順）
          const yearDiff = (b.createdYear || 0) - (a.createdYear || 0);
          if (yearDiff !== 0) return yearDiff;
          return (b.createdMonth || 0) - (a.createdMonth || 0);
        }
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

  // 実際に存在する年を取得（全作品から）
  const safeProducts = Array.isArray(products) ? products : [];
  const availableYears = Array.from(
    new Set(
      safeProducts
        .map(p => p.createdYear)
        .filter(Boolean)
    )
  ).sort((a, b) => b! - a!);

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
          <Accordion title="フィルター・ソート" defaultOpen={false}>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
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
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>

                {/* ステータスフィルター */}
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">すべて</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
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
                    <option value="createdYear-asc">作成年月（古い順）</option>
                    <option value="createdYear-desc">作成年月（新しい順）</option>
                    <option value="title-asc">タイトル（あ→ん）</option>
                    <option value="title-desc">タイトル（ん→あ）</option>
                  </select>
                </div>

                {/* 使用技術フィルター */}
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium mb-2">使用技術</label>
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                      <button
                        key={tech}
                        onClick={() => {
                          if (filterTechnologies.includes(tech)) {
                            setFilterTechnologies(filterTechnologies.filter(t => t !== tech));
                          } else {
                            setFilterTechnologies([...filterTechnologies, tech]);
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${filterTechnologies.includes(tech)
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
                    setFilterStatus("");
                    setFilterYear("");
                    setSortBy("createdYear-desc");
                  }}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  フィルターをクリア
                </button>
                <span className="ml-4 text-sm text-gray-600">
                  {filteredProducts.length}件 / 全{safeProducts.length}件
                </span>
              </div>
            </div>
          </Accordion>

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
                  link={product.link}
                  category={product.category}
                  technologies={product.technologies}
                  deployStatus={product.deployStatus}
                  createdYear={product.createdYear}
                  createdMonth={product.createdMonth}
                />
              ))
            )}
          </div>
        </section>
      </FadeInSection>
    </SiteLayout >
  );
}
