"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";

interface Technology {
  id: string;
  name: string;
  category?: string;
  createdAt?: string;
}

// 技術カテゴリの定義
const TECH_CATEGORIES = [
  "プログラミング言語",
  "フレームワーク",
  "ライブラリ",
  "データベース",
  "クラウド・インフラ",
  "ツール",
  "その他",
];

function TechnologiesContent() {
  const { user } = useAuth();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTechName, setNewTechName] = useState("");
  const [newTechCategory, setNewTechCategory] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", category: "" });
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    fetchTechnologies();
  }, []);

  const fetchTechnologies = async () => {
    try {
      const response = await fetch("/api/technologies");
      const data = await response.json();
      setTechnologies(data.technologies || []);
    } catch (error) {
      console.error("Failed to fetch technologies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnology = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTechName.trim() || !user) return;

    const techName = newTechName.trim();
    const techCategory = newTechCategory;

    // フォームを即座にクリア
    setNewTechName("");
    setNewTechCategory("");
    setIsAdding(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/technologies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: techName,
          category: techCategory,
        }),
      });

      if (response.ok) {
        // 成功したらリストを再取得
        await fetchTechnologies();
      } else {
        const error = await response.json();
        // 失敗したらフォームの値を戻す
        setNewTechName(techName);
        setNewTechCategory(techCategory);
        alert(error.error || "Failed to add technology");
      }
    } catch (error) {
      console.error("Error adding technology:", error);
      // エラーが発生したらフォームの値を戻す
      setNewTechName(techName);
      setNewTechCategory(techCategory);
      alert("Failed to add technology");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditTechnology = async () => {
    if (!editingTech || !editFormData.name.trim() || !user) return;

    // 楽観的更新: UIを即座に更新
    const previousTechnologies = [...technologies];
    const updatedTech = {
      ...editingTech,
      name: editFormData.name.trim(),
      category: editFormData.category,
    };

    // UIを即座に更新
    setTechnologies((prevTechs) =>
      prevTechs.map((tech) =>
        tech.id === editingTech.id ? updatedTech : tech,
      ),
    );

    // モーダルを即座に閉じる
    setEditingTech(null);
    setEditFormData({ name: "", category: "" });

    // バックグラウンドでAPIを呼び出す
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/technologies/${editingTech.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          category: editFormData.category,
        }),
      });

      if (!response.ok) {
        // 失敗したら元に戻す
        setTechnologies(previousTechnologies);
        const error = await response.json();
        alert(error.error || "Failed to update technology");
      }
    } catch (error) {
      // エラーが発生したら元に戻す
      setTechnologies(previousTechnologies);
      console.error("Error updating technology:", error);
      alert("Failed to update technology");
    }
  };

  const handleDeleteTechnology = async (id: string, name: string) => {
    if (!confirm(`本当に「${name}」を削除しますか？`)) return;
    if (!user) return;

    // 楽観的更新: UIから即座に削除
    const previousTechnologies = [...technologies];
    setTechnologies((prevTechs) => prevTechs.filter((tech) => tech.id !== id));

    // バックグラウンドでAPIを呼び出す
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/technologies/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 失敗したら元に戻す
        setTechnologies(previousTechnologies);
        alert("Failed to delete technology");
      }
    } catch (error) {
      // エラーが発生したら元に戻す
      setTechnologies(previousTechnologies);
      console.error("Error deleting technology:", error);
      alert("Failed to delete technology");
    }
  };

  const startEditing = (tech: Technology) => {
    setEditingTech(tech);
    setEditFormData({ name: tech.name, category: tech.category || "" });
  };

  const cancelEditing = () => {
    setEditingTech(null);
    setEditFormData({ name: "", category: "" });
  };

  // フィルタリング
  const filteredTechnologies = filterCategory
    ? technologies.filter((tech) => tech.category === filterCategory)
    : technologies;

  // カテゴリごとにグループ化
  const groupedTechnologies = TECH_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = filteredTechnologies.filter(
        (tech) => tech.category === category,
      );
      return acc;
    },
    {} as Record<string, Technology[]>,
  );

  // カテゴリなしの技術
  const uncategorized = filteredTechnologies.filter((tech) => !tech.category);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
          >
            ← ダッシュボード
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
            技術管理
          </h1>
        </div>

        {/* 追加フォーム */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            新しい技術を追加
          </h2>
          <form
            onSubmit={handleAddTechnology}
            className="space-y-2 sm:space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="text"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                placeholder="技術名を入力（例: Vue.js）"
                className="flex-1 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                required
              />
              <select
                value={newTechCategory}
                onChange={(e) => setNewTechCategory(e.target.value)}
                className="px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="">カテゴリを選択</option>
                {TECH_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 sm:px-6 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium whitespace-nowrap text-sm sm:text-base"
              >
                {isAdding ? "追加中..." : "追加"}
              </button>
            </div>
          </form>
        </div>

        {/* フィルター */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            カテゴリでフィルター
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
          >
            <option value="">すべて表示</option>
            {TECH_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 技術リスト（カテゴリごと） */}
        <div className="space-y-4 sm:space-y-6">
          {TECH_CATEGORIES.map((category) => {
            const techs = groupedTechnologies[category];
            if (techs.length === 0 && filterCategory) return null;

            return (
              <div
                key={category}
                className="bg-white p-3 sm:p-6 rounded-lg shadow"
              >
                <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 truncate">
                  {category}（{techs.length}件）
                </h2>

                {techs.length === 0 ? (
                  <p className="text-gray-500 text-xs sm:text-sm">
                    このカテゴリには技術が登録されていません。
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {techs.map((tech) => (
                      <div
                        key={tech.id}
                        className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">
                          {tech.name}
                        </span>
                        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEditing(tech)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm px-1 sm:px-0"
                          >
                            編集
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteTechnology(tech.id, tech.name)
                            }
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-1 sm:px-0"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* カテゴリなし */}
          {uncategorized.length > 0 && (
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 truncate">
                カテゴリ未設定（{uncategorized.length}件）
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {uncategorized.map((tech) => (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">
                      {tech.name}
                    </span>
                    <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEditing(tech)}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm px-1 sm:px-0"
                      >
                        編集
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteTechnology(tech.id, tech.name)
                        }
                        className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-1 sm:px-0"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 編集モーダル */}
      {editingTech && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={cancelEditing}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                技術を編集
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    技術名
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="">カテゴリを選択</option>
                    {TECH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleEditTechnology}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                >
                  保存
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 sm:px-6 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TechnologiesPage() {
  return (
    <ProtectedRoute>
      <TechnologiesContent />
    </ProtectedRoute>
  );
}
