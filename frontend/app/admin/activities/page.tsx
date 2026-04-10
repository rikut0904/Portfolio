"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  order: number;
}

function ActivitiesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/activity-categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingCategory(null);
    setNewCategoryName("");
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsAddingNew(false);
    setNewCategoryName(category.name);
  };

  const handleSave = async () => {
    if (!user || !newCategoryName.trim()) return;

    try {
      const token = await user.getIdToken();

      if (isAddingNew) {
        // 新規追加
        const response = await fetch("/api/activity-categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });

        if (response.ok) {
          await fetchCategories();
          setIsAddingNew(false);
          setNewCategoryName("");
          alert("カテゴリを追加しました");
        } else {
          alert("追加に失敗しました");
        }
      } else if (editingCategory) {
        // 編集
        const response = await fetch(
          `/api/activity-categories/${editingCategory.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: newCategoryName.trim() }),
          },
        );

        if (response.ok) {
          await fetchCategories();
          setEditingCategory(null);
          setNewCategoryName("");
          alert("カテゴリ名を更新しました");
        } else {
          alert("更新に失敗しました");
        }
      }
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("保存に失敗しました");
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setIsAddingNew(false);
    setNewCategoryName("");
  };

  const handleCategoryClick = (category: Category) => {
    router.push(`/admin/activities/${category.id}`);
  };

  const handleDelete = async (categoryId: string) => {
    if (!user) return;
    if (
      !confirm(
        "このカテゴリを削除しますか？関連する課外活動も削除される可能性があります。",
      )
    )
      return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activity-categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCategories();
        alert("カテゴリを削除しました");
      } else {
        alert("カテゴリの削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("カテゴリの削除に失敗しました");
    }
  };

  const handleMoveUp = async (category: Category) => {
    if (!user) return;

    const currentIndex = categories.findIndex((c) => c.id === category.id);
    if (currentIndex === 0) return;

    const targetCategory = categories[currentIndex - 1];

    // 楽観的更新
    const newCategories = [...categories];
    [newCategories[currentIndex - 1], newCategories[currentIndex]] = [
      newCategories[currentIndex],
      newCategories[currentIndex - 1],
    ];

    const tempOrder = newCategories[currentIndex - 1].order;
    newCategories[currentIndex - 1] = {
      ...newCategories[currentIndex - 1],
      order: newCategories[currentIndex].order,
    };
    newCategories[currentIndex] = {
      ...newCategories[currentIndex],
      order: tempOrder,
    };
    setCategories(newCategories);

    try {
      const token = await user.getIdToken();

      await Promise.all([
        fetch(`/api/activity-categories/${category.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetCategory.order }),
        }),
        fetch(`/api/activity-categories/${targetCategory.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: category.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move category up:", error);
      alert("順番の変更に失敗しました");
      await fetchCategories();
    }
  };

  const handleMoveDown = async (category: Category) => {
    if (!user) return;

    const currentIndex = categories.findIndex((c) => c.id === category.id);
    if (currentIndex === categories.length - 1) return;

    const targetCategory = categories[currentIndex + 1];

    // 楽観的更新
    const newCategories = [...categories];
    [newCategories[currentIndex], newCategories[currentIndex + 1]] = [
      newCategories[currentIndex + 1],
      newCategories[currentIndex],
    ];

    const tempOrder = newCategories[currentIndex].order;
    newCategories[currentIndex] = {
      ...newCategories[currentIndex],
      order: newCategories[currentIndex + 1].order,
    };
    newCategories[currentIndex + 1] = {
      ...newCategories[currentIndex + 1],
      order: tempOrder,
    };
    setCategories(newCategories);

    try {
      const token = await user.getIdToken();

      await Promise.all([
        fetch(`/api/activity-categories/${category.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetCategory.order }),
        }),
        fetch(`/api/activity-categories/${targetCategory.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: category.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move category down:", error);
      alert("順番の変更に失敗しました");
      await fetchCategories();
    }
  };

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
            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm mb-1 sm:mb-2 inline-block"
          >
            ← ダッシュボード
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">
              課外活動カテゴリ管理
            </h1>
            {!isAddingNew && !editingCategory && (
              <button
                onClick={handleAddNew}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm sm:text-base"
              >
                + 新規カテゴリ追加
              </button>
            )}
          </div>
        </div>

        {/* 新規追加フォーム */}
        {isAddingNew && (
          <div className="bg-white rounded-lg shadow p-3 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              新規カテゴリ追加
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  カテゴリ名
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="カテゴリ名を入力"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3 sm:mt-4">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm sm:text-base"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* カテゴリ一覧 */}
        <div className="space-y-2 sm:space-y-3">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {editingCategory?.id === category.id ? (
                // 編集モード（インライン編集）
                <div className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* 順番変更ボタン（編集中も表示） */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(category)}
                        disabled={index === 0}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(category)}
                        disabled={index === categories.length - 1}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          placeholder="カテゴリ名を入力"
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          ID: {category.id} | 順番: {category.order}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm sm:text-base"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // 通常表示モード
                <div className="p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* 順番変更ボタン */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(category)}
                        disabled={index === 0}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(category)}
                        disabled={index === categories.length - 1}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* カテゴリ情報 */}
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                            {category.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 truncate">
                            ID: {category.id} | 順番: {category.order}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded mt-0.5 sm:mt-1.5 flex-shrink-0"
                          title="カテゴリ名を編集"
                        >
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleCategoryClick(category)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <ProtectedRoute>
      <ActivitiesContent />
    </ProtectedRoute>
  );
}
