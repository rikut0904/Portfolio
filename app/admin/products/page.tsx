"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Accordion from "../../../components/Accordion";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category?: string;
  technologies?: string[];
  status?: string; // 公開ステータス（公開、非公開）
  deployStatus?: string; // デプロイ状況（デプロイ済み、未公開、デプロイ中）
  createdYear?: number; // 作品作成年
  createdMonth?: number; // 作品作成月
  createdAt?: string; // 登録日時
  updatedAt?: string; // 更新日時
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

const STATUSES = ["公開", "非公開"];
const DEPLOY_STATUSES = ["公開中", "未公開"];

function ProductsContent() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
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
    status: "公開",
    deployStatus: "未公開",
    createdYear: new Date().getFullYear(),
    createdMonth: new Date().getMonth() + 1, // 1-12
  });

  // フィルター・ソート用のstate
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTechnologies, setFilterTechnologies] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDeployStatus, setFilterDeployStatus] = useState("");
  const [filterCreatedYear, setFilterCreatedYear] = useState(""); // 作成年フィルター
  const [filterCreatedMonth, setFilterCreatedMonth] = useState(""); // 作成月フィルター
  const [sortBy, setSortBy] = useState("createdYear-asc");

  // 技術追加用のstate
  const [newTechName, setNewTechName] = useState("");
  const [isAddingTech, setIsAddingTech] = useState(false);

  // ステータスクイック変更用のstate
  const [statusModalProduct, setStatusModalProduct] = useState<Product | null>(null);
  const [deployStatusModalProduct, setDeployStatusModalProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchTechnologies();
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

  const fetchTechnologies = async () => {
    try {
      const response = await fetch("/api/technologies");
      const data = await response.json();
      setTechnologies(data.technologies.map((t: any) => t.name));
    } catch (error) {
      console.error("Failed to fetch technologies:", error);
    }
  };

  const handleAddTechnology = async () => {
    if (!newTechName.trim() || !user) return;

    const techName = newTechName.trim();

    // フォームを即座にクリア
    setNewTechName("");
    setIsAddingTech(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/technologies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: techName }),
      });

      if (response.ok) {
        await fetchTechnologies(); // 技術リストを再取得
        alert(`「${techName}」を追加しました`);
      } else {
        const error = await response.json();
        // 失敗したらフォームの値を戻す
        setNewTechName(techName);
        alert(error.error || "Failed to add technology");
      }
    } catch (error) {
      console.error("Error adding technology:", error);
      // エラーが発生したらフォームの値を戻す
      setNewTechName(techName);
      alert("Failed to add technology");
    } finally {
      setIsAddingTech(false);
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
          await fetchProducts();
          setEditingProduct(null);
          setFormData({
            title: "",
            description: "",
            image: "",
            link: "",
            category: "",
            technologies: [],
            status: "公開",
            deployStatus: "未公開",
            createdYear: new Date().getFullYear(),
            createdMonth: new Date().getMonth() + 1,
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
          await fetchProducts();
          setIsAddingNew(false);
          setFormData({
            title: "",
            description: "",
            image: "",
            link: "",
            category: "",
            technologies: [],
            status: "公開",
            deployStatus: "未公開",
            createdYear: new Date().getFullYear(),
            createdMonth: new Date().getMonth() + 1,
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
      status: product.status || "公開",
      deployStatus: product.deployStatus || "未公開",
      createdYear: product.createdYear || new Date().getFullYear(),
      createdMonth: product.createdMonth || new Date().getMonth() + 1,
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    if (!user) return;

    // 楽観的更新: UIから即座に削除
    const previousProducts = [...products];
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));

    // バックグラウンドでAPIを呼び出す
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 失敗したら元に戻す
        setProducts(previousProducts);
        alert("削除に失敗しました");
      }
    } catch (error) {
      // エラーが発生したら元に戻す
      setProducts(previousProducts);
      console.error("Failed to delete product:", error);
      alert("削除に失敗しました");
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
      status: "公開",
      deployStatus: "未公開",
      createdYear: new Date().getFullYear(),
      createdMonth: new Date().getMonth() + 1,
    });
  };

  // 公開ステータスをクイック変更
  const handleQuickStatusChange = async (productId: string, newStatus: string) => {
    if (!user) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 楽観的更新: UIを即座に更新
    const previousProducts = [...products];
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, status: newStatus } : p
      )
    );

    // モーダルを即座に閉じる
    setStatusModalProduct(null);

    // バックグラウンドでAPIを呼び出す
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...product,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        // 失敗したら元に戻す
        setProducts(previousProducts);
        alert("公開ステータスの更新に失敗しました");
      }
    } catch (error) {
      // エラーが発生したら元に戻す
      setProducts(previousProducts);
      console.error("Failed to update status:", error);
      alert("公開ステータスの更新に失敗しました");
    }
  };

  // デプロイ状況をクイック変更
  const handleQuickDeployStatusChange = async (productId: string, newDeployStatus: string) => {
    if (!user) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 楽観的更新: UIを即座に更新
    const previousProducts = [...products];
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, deployStatus: newDeployStatus } : p
      )
    );

    // モーダルを即座に閉じる
    setDeployStatusModalProduct(null);

    // バックグラウンドでAPIを呼び出す
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...product,
          deployStatus: newDeployStatus,
        }),
      });

      if (!response.ok) {
        // 失敗したら元に戻す
        setProducts(previousProducts);
        alert("デプロイ状況の更新に失敗しました");
      }
    } catch (error) {
      // エラーが発生したら元に戻す
      setProducts(previousProducts);
      console.error("Failed to update deploy status:", error);
      alert("デプロイ状況の更新に失敗しました");
    }
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

    // ステータスフィルター
    if (filterStatus) {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // 作成年フィルター
    if (filterCreatedYear) {
      filtered = filtered.filter(p => p.createdYear?.toString() === filterCreatedYear);
    }

    // 作成月フィルター
    if (filterCreatedMonth) {
      filtered = filtered.filter(p => p.createdMonth?.toString() === filterCreatedMonth);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "createdYear-asc": {
          // 作成年（古い順）→ 年が同じ場合は月でソート
          const yearDiff = (a.createdYear || 0) - (b.createdYear || 0);
          if (yearDiff !== 0) return yearDiff;
          return (a.createdMonth || 0) - (b.createdMonth || 0);
        }
        case "createdYear-desc": {
          // 作成年（新しい順）→ 年が同じ場合は月でソート（降順）
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

  // 実際に存在する年と月を取得（productsが配列でない場合は空配列を使用）
  const safeProducts = Array.isArray(products) ? products : [];
  const availableYears = Array.from(new Set(safeProducts.map(p => p.createdYear).filter(Boolean))).sort((a, b) => b! - a!);
  const availableMonths = Array.from(new Set(safeProducts.map(p => p.createdMonth).filter(Boolean))).sort((a, b) => a! - b!);

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
                status: "公開",
                deployStatus: "未公開",
                createdYear: new Date().getFullYear(),
                createdMonth: new Date().getMonth() + 1,
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

                      {/* 画像名 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          画像名
                        </label>
                        <input
                          type="text"
                          value={("/img/product/" + formData.image)}
                          onChange={(e) =>
                            setFormData({ ...formData, image: e.target.value })
                          }
                          placeholder="example.jpg"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          画像アップロードは「画像管理」から行えます
                        </p>
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

                      {/* リンク */}
                      <div>
                        {formData.category === "Webアプリケーション" && (
                          <>
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
                          </>
                        )}
                      </div>

                      {/* 使用技術 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          使用技術（複数選択可）
                        </label>

                        {/* 新しい技術を追加 */}
                        <div className="mb-2 flex gap-2">
                          <input
                            type="text"
                            value={newTechName}
                            onChange={(e) => setNewTechName(e.target.value)}
                            placeholder="新しい技術を追加（例: Vue.js）"
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddTechnology();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddTechnology}
                            disabled={isAddingTech || !newTechName.trim()}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium whitespace-nowrap"
                          >
                            {isAddingTech ? "追加中..." : "+ 追加"}
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                          {technologies.map((tech) => (
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            公開ステータス
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            デプロイ状況
                          </label>
                          <select
                            value={formData.deployStatus}
                            onChange={(e) =>
                              setFormData({ ...formData, deployStatus: e.target.value })
                            }
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {DEPLOY_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 作成年月 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            作成年
                          </label>
                          <input
                            type="number"
                            value={formData.createdYear}
                            onChange={(e) =>
                              setFormData({ ...formData, createdYear: parseInt(e.target.value) })
                            }
                            min="2000"
                            max="2100"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            作成月
                          </label>
                          <select
                            value={formData.createdMonth}
                            onChange={(e) =>
                              setFormData({ ...formData, createdMonth: parseInt(e.target.value) })
                            }
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                              <option key={month} value={month}>{month}月</option>
                            ))}
                          </select>
                        </div>
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
        <Accordion title="フィルター・ソート" defaultOpen={false}>
          <div className="bg-white p-6 rounded-lg shadow mb-8">
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

              {/* 公開ステータスフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公開ステータス</label>
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

              {/* デプロイ状況フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">デプロイ状況</label>
                <select
                  value={filterDeployStatus}
                  onChange={(e) => setFilterDeployStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {DEPLOY_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* 作成年フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作成年</label>
                <select
                  value={filterCreatedYear}
                  onChange={(e) => setFilterCreatedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              {/* 作成月フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作成月</label>
                <select
                  value={filterCreatedMonth}
                  onChange={(e) => setFilterCreatedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">すべて</option>
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>{month}月</option>
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
                  <option value="createdYear-asc">作成年月（古い順）</option>
                  <option value="createdYear-desc">作成年月（新しい順）</option>
                  <option value="title-asc">タイトル（あ→ん）</option>
                  <option value="title-desc">タイトル（ん→あ）</option>
                </select>
              </div>

              {/* 使用技術フィルター */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">使用技術</label>
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
                  setFilterDeployStatus("");
                  setFilterCreatedYear("");
                  setFilterCreatedMonth("");
                  setSortBy("createdYear-asc");
                }}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                フィルターをクリア
              </button>
            </div>
          </div>
        </Accordion>

        {/* 作品一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">作品一覧（{filteredProducts.length}件 / 全{safeProducts.length}件）</h2>
          </div>
          <div className="divide-y">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{product.title}</h3>
                    {/* 公開ステータスバッジ（クリック可能） */}
                    <button
                      onClick={() => setStatusModalProduct(product)}
                      className={`px-2 py-0.5 text-xs rounded-full hover:opacity-80 ${product.status === "公開"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                      title="クリックして公開ステータスを変更"
                    >
                      {product.status || "公開"}
                    </button>
                    {/* デプロイ状況バッジ（クリック可能） */}
                    <button
                      onClick={() => setDeployStatusModalProduct(product)}
                      className={`px-2 py-0.5 text-xs rounded-full hover:opacity-80 ${product.deployStatus === "公開中"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                        }`}
                      title="クリックしてデプロイ状況を変更"
                    >
                      {product.deployStatus || "未公開"}
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  <div className="flex flex-col gap-1 text-xs text-gray-400 mt-1">
                    {product.link && product.category === "Webアプリケーション" && (
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        🔗 {product.title}
                      </a>
                    )}
                    <div className="flex gap-3">
                      {product.image && <span>画像: {product.image}</span>}
                      {product.createdYear && product.createdMonth && (
                        <span>作成: {product.createdYear}年{product.createdMonth}月</span>
                      )}
                    </div>
                  </div>
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

        {/* 公開ステータス変更モーダル */}
        {
          statusModalProduct && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setStatusModalProduct(null)}
              ></div>

              {/* モーダルコンテナ */}
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                {/* モーダルコンテンツ */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">
                    公開ステータスを変更
                  </h3>

                  <p className="text-sm text-gray-600 mb-4">
                    作品: <span className="font-medium">{statusModalProduct.title}</span>
                  </p>

                  <p className="text-sm text-gray-700 mb-3">
                    現在のステータス: <span className="font-semibold">{statusModalProduct.status || "公開"}</span>
                  </p>

                  <div className="space-y-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleQuickStatusChange(statusModalProduct.id, status)}
                        className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${statusModalProduct.status === status
                          ? status === "公開"
                            ? "border-green-500 bg-green-50 text-green-900 font-semibold"
                            : "border-gray-500 bg-gray-50 text-gray-900 font-semibold"
                          : status === "公開"
                            ? "border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setStatusModalProduct(null)}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }

        {/* デプロイ状況変更モーダル */}
        {
          deployStatusModalProduct && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setDeployStatusModalProduct(null)}
              ></div>

              {/* モーダルコンテナ */}
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                {/* モーダルコンテンツ */}
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">
                    デプロイ状況を変更
                  </h3>

                  <p className="text-sm text-gray-600 mb-4">
                    作品: <span className="font-medium">{deployStatusModalProduct.title}</span>
                  </p>

                  <p className="text-sm text-gray-700 mb-3">
                    現在のステータス: <span className="font-semibold">{deployStatusModalProduct.deployStatus || "未公開"}</span>
                  </p>

                  <div className="space-y-2">
                    {DEPLOY_STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleQuickDeployStatusChange(deployStatusModalProduct.id, status)}
                        className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${deployStatusModalProduct.deployStatus === status
                          ? status === "公開中"
                            ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold"
                            : "border-orange-500 bg-orange-50 text-orange-900 font-semibold"
                          : status === "公開中"
                            ? "border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700"
                            : "border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700"
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setDeployStatusModalProduct(null)}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }
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
