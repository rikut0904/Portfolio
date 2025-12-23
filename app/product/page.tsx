"use client";

import React, { useEffect, useState } from "react";
import FadeInSection from "../../components/FadeInSection";
import ProductCard from "../../components/ProductCard";
import SiteLayout from "../../components/layouts/SiteLayout";
import Accordion from "../../components/Accordion";
import Pagination from "../../components/Pagination";

interface Product {
  id: string;
  title: string;
  image: string;
  description: string;
  link?: string;
  githubUrl?: string;
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

export default function ProductSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルター・ソート用のstate
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState("");
  const [filterDeployStatus, setFilterDeployStatus] = useState(""); // デプロイステータスフィルター
  const [sortBy, setSortBy] = useState("createdYear-desc"); // 新しい順に変更
  const [isSortChanged, setIsSortChanged] = useState(false); // ソートが変更されたかを追跡

  // ページネーション用のstate
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
        // 各作品のstatus/deployStatusを確認
        data.products.forEach((p: Product, index: number) => {
          console.log(`作品${index + 1}: ${p.title}, status: ${p.status}, deployStatus: ${p.deployStatus}`);
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

    // statusで「公開」のもののみを表示（必須フィルター）
    filtered = filtered.filter(p => p.status === "公開");

    // デプロイステータスフィルター
    if (filterDeployStatus) {
      // ユーザーが明示的に選択した場合はそれを優先
      filtered = filtered.filter(p => p.deployStatus === filterDeployStatus);
    } else if (isSortChanged) {
      // フィルター未選択かつソートが変更されている場合は「公開中」のみ表示
      filtered = filtered.filter(p => p.deployStatus === "公開中");
    }

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

  // 実際に存在する年を取得（公開の作品から）
  const safeProducts = Array.isArray(products) ? products : [];
  const publicProducts = safeProducts.filter(p => p.status === "公開");
  const availableYears = Array.from(
    new Set(
      publicProducts
        .map(p => p.createdYear)
        .filter(Boolean)
    )
  ).sort((a, b) => b! - a!);

  // ページネーション計算
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterTechnologies, filterDeployStatus, filterYear, sortBy, isSortChanged]);

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
          <h2>制作物一覧　{filteredProducts.length}件 / 全{publicProducts.length}件</h2>

          {/* フィルター・ソート */}
          <Accordion title="フィルター・ソート" defaultOpen={false}>
            <div className="p-6 rounded-lg shadow mb-8" style={{ backgroundColor: 'var(--card-background)' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* カテゴリフィルター */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>カテゴリ</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: 'var(--input-background)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">すべて</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 作成年フィルター */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>作成年</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: 'var(--input-background)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">すべて</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>

                {/* デプロイステータスフィルター */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>デプロイ状況</label>
                  <select
                    value={filterDeployStatus}
                    onChange={(e) => setFilterDeployStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: 'var(--input-background)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">すべて</option>
                    <option value="公開中">公開中</option>
                    <option value="未公開">未公開</option>
                  </select>
                </div>

                {/* ソート */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>並び順</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setIsSortChanged(true);
                    }}
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                      backgroundColor: 'var(--input-background)',
                      borderColor: 'var(--input-border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="createdYear-asc">作成年月（古い順）</option>
                    <option value="createdYear-desc">作成年月（新しい順）</option>
                    <option value="title-asc">タイトル（あ→ん）</option>
                    <option value="title-desc">タイトル（ん→あ）</option>
                  </select>
                </div>

                {/* 使用技術フィルター */}
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>使用技術</label>
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
                        className="px-3 py-1 text-sm rounded-full transition-colors"
                        style={filterTechnologies.includes(tech)
                          ? {
                              backgroundColor: 'var(--primary-color)',
                              color: 'white'
                            }
                          : {
                              backgroundColor: 'var(--button-background)',
                              color: 'var(--button-text)'
                            }
                        }
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* フィルタークリアボタン */}
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={() => {
                    setFilterCategory("");
                    setFilterTechnologies([]);
                    setFilterYear("");
                    setFilterDeployStatus("");
                    setSortBy("createdYear-desc");
                    setIsSortChanged(false);
                  }}
                  className="px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--button-background)',
                    color: 'var(--button-text)'
                  }}
                >
                  フィルターをクリア
                </button>
                <span className="text-sm" style={{ color: 'var(--text-body)' }}>
                  {filteredProducts.length}件 / 全{publicProducts.length}件
                </span>
              </div>
            </div>
          </Accordion>


          {/* ページネーション */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              variant="public"
              className="mt-8 mb-4"
            />
          )}

          {/* 作品一覧 */}
          <div className="grid-card">
            {currentProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">該当する作品がありません</p>
            ) : (
              currentProducts.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  image={product.image}
                  description={product.description}
                  link={product.link}
                  githubUrl={product.githubUrl}
                  category={product.category}
                  technologies={product.technologies}
                  deployStatus={product.deployStatus}
                  createdYear={product.createdYear}
                  createdMonth={product.createdMonth}
                />
              ))
            )}
          </div>

          {/* ページネーション */}
          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              variant="public"
              className="mt-8 mb-4"
            />
          )}
        </section>
      </FadeInSection>
    </SiteLayout >
  );
}
