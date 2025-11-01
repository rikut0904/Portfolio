"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category?: string;
  technologies?: string[];
  status?: string;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 定数定義
const CATEGORIES = [
  "Webアプリケーション",
  "モバイルアプリ",
  "デスクトップアプリ",
  "ツール・システム",
  "ゲーム",
  "その他"
];

const TECHNOLOGIES = [
  "React", "Next.js", "Flutter", "Swift", "Kotlin",
  "Python", "Go", "Java", "Ruby", "Node.js", "Firebase",
  "AWS", "Docker", "TypeScript", "JavaScript", "HTML/CSS"
];

const STATUSES = ["公開中", "非公開", "開発中"];

function ProductsContent() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    category: "",
    technologies: [] as string[],
    status: "公開中",
    year: new Date().getFullYear(),
  });

  // フィルター・ソート用のstate
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      const token = await user.getIdToken();

      if (editingProduct) {
        // 更新
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          fetchProducts();
          setEditingProduct(null);
          setFormData({
            title: "",
            description: "",
            image: "",
            link: "",
            category: "",
            technologies: [],
            status: "公開中",
            year: new Date().getFullYear(),
          });
        }
      } else {
        // 新規作成
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          fetchProducts();
          setIsAddingNew(false);
          setFormData({
            title: "",
            description: "",
            image: "",
            link: "",
            category: "",
            technologies: [],
            status: "公開中",
            year: new Date().getFullYear(),
          });
        }
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      image: product.image,
      link: product.link,
      category: product.category || "",
      technologies: product.technologies || [],
      status: product.status || "公開中",
      year: product.year || new Date().getFullYear(),
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleCancel = () => {
    setEditingProduct(null);
    setIsAddingNew(false);
    setFormData({
      title: "",
      description: "",
      image: "",
      link: "",
      category: "",
      technologies: [],
      status: "公開中",
      year: new Date().getFullYear(),
    });
  };

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isAddingNew || editingProduct)) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAddingNew, editingProduct]);

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

    // ステータスフィルター
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex justify-between items-center">
          <div>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800"
            >
              ← ダッシュボード
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">作品管理</h1>
          </div>
          <button
            onClick={() => {
              setIsAddingNew(true);
              setEditingProduct(null);
              setFormData({
                title: "",
                description: "",
                image: "",
                link: "",
                category: "",
                technologies: [],
                status: "公開中",
                year: new Date().getFullYear(),
              });
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md"
          >
            + 新しい作品を追加
          </button>
        </div>

        {/* モーダル */}
        {
          (isAddingNew || editingProduct) && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-40 bg-black/50"
                aria-hidden="true"
                onClick={handleCancel}
              ></div>

              {/* モーダルコンテナ */}
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                {/* モーダルコンテンツ */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
                  {/* ヘッダー */}
                  <div className="bg-white px-6 pt-5 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {editingProduct ? "作品を編集" : "新しい作品を追加"}
                      </h2>
                      <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">閉じる</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* フォーム */}
                  <form onSubmit={handleSubmit} className="bg-white px-6 pt-5 pb-6">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    タイトル *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    説明 *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    画像パス
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    placeholder="/img/product/example.jpg"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    画像アップロードは「画像管理」から行えます
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    リンク
                  </label>
                  <input
                    type="text"
                    value={formData.link}
                    onChange={(e) =>
                      setFormData({ ...formData, link: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* カテゴリ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    カテゴリ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">選択してください</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 使用技術 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    使用技術（複数選択可）
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {TECHNOLOGIES.map((tech) => (
                      <label key={tech} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.technologies.includes(tech)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                technologies: [...formData.technologies, tech]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                technologies: formData.technologies.filter(t => t !== tech)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{tech}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ステータス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ステータス
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* 作成年 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    作成年
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    min="2000"
                    max="2100"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                    </div>

                    {/* ボタン */}
                    <div className="mt-6 flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                      >
                        キャンセル
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )
        }

        {/* フィルター・ソート */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">フィルター・ソート</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* カテゴリフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
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

            {/* ステータスフィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
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

            {/* 作成年フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作成年</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">使用技術</label>
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
                    className={`px-3 py-1 text-sm rounded-full ${filterTechnologies.includes(tech)
                        ? "bg-blue-600 text-white"
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
                setSortBy("createdAt-asc");
              }}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              フィルターをクリア
            </button>
          </div>
        </div>

        {/* 作品一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">作品一覧（{filteredProducts.length}件 / 全{products.length}件）</h2>
          </div>
          <div className="divide-y">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{product.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  {product.image && (
                    <p className="text-gray-400 text-xs mt-1">画像: {product.image}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main >
    </div >
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}
