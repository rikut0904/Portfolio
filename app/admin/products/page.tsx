"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";
import ProductForm from "../../../components/admin/ProductForm";
import ProductFilters from "../../../components/admin/ProductFilters";
import ProductListItem from "../../../components/admin/ProductListItem";
import StatusModal from "../../../components/admin/StatusModal";
import DeployStatusModal from "../../../components/admin/DeployStatusModal";

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

      // 画像パスにプレフィックスを付加（まだ付いていない場合）
      const dataToSave = {
        ...formData,
        image: formData.image.startsWith('/img/product/')
          ? formData.image
          : `/img/product/${formData.image}`
      };

      if (editingProduct) {
        // 更新
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSave),
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
          body: JSON.stringify(dataToSave),
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
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="py-2 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="w-full sm:w-auto">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
            >
              ← ダッシュボード
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">作品管理</h1>
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
            className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md text-sm sm:text-base"
          >
            + 新しい作品を追加
          </button>
        </div>

        {/* フォームモーダル */}
        {(isAddingNew || editingProduct) && (
          <ProductForm
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            technologies={technologies}
            newTechName={newTechName}
            setNewTechName={setNewTechName}
            isAddingTech={isAddingTech}
            handleAddTechnology={handleAddTechnology}
            handleSubmit={handleSubmit}
            onCancel={handleCancel}
            categories={CATEGORIES}
            statuses={STATUSES}
            deployStatuses={DEPLOY_STATUSES}
          />
        )}

        {/* フィルター・ソート */}
        <ProductFilters
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterDeployStatus={filterDeployStatus}
          setFilterDeployStatus={setFilterDeployStatus}
          filterCreatedYear={filterCreatedYear}
          setFilterCreatedYear={setFilterCreatedYear}
          filterCreatedMonth={filterCreatedMonth}
          setFilterCreatedMonth={setFilterCreatedMonth}
          filterTechnologies={filterTechnologies}
          setFilterTechnologies={setFilterTechnologies}
          sortBy={sortBy}
          setSortBy={setSortBy}
          categories={CATEGORIES}
          statuses={STATUSES}
          deployStatuses={DEPLOY_STATUSES}
          technologies={technologies}
          availableYears={availableYears}
          availableMonths={availableMonths}
          onClearFilters={() => {
            setFilterCategory("");
            setFilterTechnologies([]);
            setFilterStatus("");
            setFilterDeployStatus("");
            setFilterCreatedYear("");
            setFilterCreatedMonth("");
            setSortBy("createdYear-asc");
          }}
        />

        {/* 作品一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-3 py-3 sm:px-6 sm:py-4 border-b">
            <h2 className="text-base sm:text-xl font-semibold truncate">作品一覧（{filteredProducts.length}件 / 全{safeProducts.length}件）</h2>
          </div>
          <div className="divide-y">
            {filteredProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusClick={setStatusModalProduct}
                onDeployStatusClick={setDeployStatusModalProduct}
              />
            ))}
          </div>
        </div>

        {/* ステータス変更モーダル */}
        {statusModalProduct && (
          <StatusModal
            product={statusModalProduct}
            statuses={STATUSES}
            onStatusChange={handleQuickStatusChange}
            onClose={() => setStatusModalProduct(null)}
          />
        )}

        {/* デプロイステータス変更モーダル */}
        {deployStatusModalProduct && (
          <DeployStatusModal
            product={deployStatusModalProduct}
            deployStatuses={DEPLOY_STATUSES}
            onDeployStatusChange={handleQuickDeployStatusChange}
            onClose={() => setDeployStatusModalProduct(null)}
          />
        )}
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
