"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../../lib/auth/AuthContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import DeleteConfirmModal from "../../../../components/admin/DeleteConfirmModal";

interface Activity {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  category: string;
  status?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

function CategoryActivitiesContent() {
  const { user } = useAuth();
  const params = useParams();
  const categoryId = params.id as string;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    status: "公開",
  });

  useEffect(() => {
    fetchCategoryAndActivities();
  }, [categoryId]);

  const fetchCategoryAndActivities = async () => {
    try {
      // 並列でデータ取得
      const [categoryResponse, activitiesResponse] = await Promise.all([
        fetch("/api/activity-categories"),
        fetch("/api/activities"),
      ]);

      const [categoryData, activitiesData] = await Promise.all([
        categoryResponse.json(),
        activitiesResponse.json(),
      ]);

      const foundCategory = categoryData.categories.find((c: Category) => c.id === categoryId);

      if (!foundCategory) {
        setLoading(false);
        return;
      }

      setCategory(foundCategory);

      const filtered = (activitiesData.activities || [])
        .filter((a: Activity) => a.category === foundCategory.name)
        .sort((a: Activity, b: Activity) => a.order - b.order);

      setActivities(filtered);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingActivity(null);
    setFormData({
      title: "",
      description: "",
      image: "",
      link: "",
      status: "公開",
    });
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsAddingNew(false);
    setFormData({
      title: activity.title,
      description: activity.description,
      image: activity.image,
      link: activity.link,
      status: activity.status || "公開",
    });
  };

  const handleCancel = () => {
    setEditingActivity(null);
    setIsAddingNew(false);
    setFormData({
      title: "",
      description: "",
      image: "",
      link: "",
      status: "公開",
    });
  };

  const handleSave = async () => {
    if (!user || !category) return;

    try {
      const token = await user.getIdToken();
      const url = editingActivity
        ? `/api/activities/${editingActivity.id}`
        : "/api/activities";
      const method = editingActivity ? "PATCH" : "POST";

      const maxOrder = activities.length > 0 ? Math.max(...activities.map((a) => a.order)) : 0;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          category: category.name,
          order: editingActivity ? editingActivity.order : maxOrder + 1,
        }),
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        handleCancel();
        alert(editingActivity ? "更新しました" : "追加しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save activity:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeleteClick = (activity: Activity) => {
    setDeletingActivity(activity);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deletingActivity) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activities/${deletingActivity.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        setDeletingActivity(null);
        alert("削除しました");
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete activity:", error);
      alert("削除に失敗しました");
    }
  };

  const handleMoveUp = async (activity: Activity) => {
    if (!user) return;

    const currentIndex = activities.findIndex((a) => a.id === activity.id);
    if (currentIndex === 0) return;

    const targetActivity = activities[currentIndex - 1];

    const newActivities = [...activities];
    [newActivities[currentIndex - 1], newActivities[currentIndex]] = [
      newActivities[currentIndex],
      newActivities[currentIndex - 1],
    ];

    const tempOrder = newActivities[currentIndex - 1].order;
    newActivities[currentIndex - 1] = {
      ...newActivities[currentIndex - 1],
      order: newActivities[currentIndex].order,
    };
    newActivities[currentIndex] = {
      ...newActivities[currentIndex],
      order: tempOrder,
    };
    setActivities(newActivities);

    try {
      const token = await user.getIdToken();

      await Promise.all([
        fetch(`/api/activities/${activity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetActivity.order }),
        }),
        fetch(`/api/activities/${targetActivity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: activity.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move activity up:", error);
      alert("順番の変更に失敗しました");
      await fetchCategoryAndActivities();
    }
  };

  const handleMoveDown = async (activity: Activity) => {
    if (!user) return;

    const currentIndex = activities.findIndex((a) => a.id === activity.id);
    if (currentIndex === activities.length - 1) return;

    const targetActivity = activities[currentIndex + 1];

    const newActivities = [...activities];
    [newActivities[currentIndex], newActivities[currentIndex + 1]] = [
      newActivities[currentIndex + 1],
      newActivities[currentIndex],
    ];

    const tempOrder = newActivities[currentIndex].order;
    newActivities[currentIndex] = {
      ...newActivities[currentIndex],
      order: newActivities[currentIndex + 1].order,
    };
    newActivities[currentIndex + 1] = {
      ...newActivities[currentIndex + 1],
      order: tempOrder,
    };
    setActivities(newActivities);

    try {
      const token = await user.getIdToken();

      await Promise.all([
        fetch(`/api/activities/${activity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetActivity.order }),
        }),
        fetch(`/api/activities/${targetActivity.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: activity.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move activity down:", error);
      alert("順番の変更に失敗しました");
      await fetchCategoryAndActivities();
    }
  };

  const handleEditCategoryName = () => {
    if (category) {
      setCategoryName(category.name);
      setIsEditingCategoryName(true);
    }
  };

  const handleSaveCategoryName = async () => {
    if (!user || !category || !categoryName.trim()) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/activity-categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      if (response.ok) {
        await fetchCategoryAndActivities();
        setIsEditingCategoryName(false);
        alert("カテゴリ名を更新しました");
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update category name:", error);
      alert("更新に失敗しました");
    }
  };

  const handleCancelCategoryEdit = () => {
    setIsEditingCategoryName(false);
    setCategoryName("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">カテゴリが見つかりません</p>
          <Link href="/admin/activities" className="text-blue-600 hover:text-blue-800">
            カテゴリ一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <Link href="/admin/activities" className="text-blue-600 hover:underline text-sm sm:text-base">
            ← 課外活動管理に戻る
          </Link>
          {!editingActivity && !isAddingNew && (
            <button
              onClick={handleAddNew}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm sm:text-base"
            >
              + 新規追加
            </button>
          )}
        </div>

        {editingActivity || isAddingNew ? (
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              {isAddingNew ? "新規追加" : "編集"}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  画像URL
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  リンクURL
                </label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="公開">公開</option>
                  <option value="非公開">非公開</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 sm:pt-4">
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
          </div>
        ) : (
          <div>
            {isEditingCategoryName ? (
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2 text-xl sm:text-2xl font-bold border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="カテゴリ名を入力"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCategoryName}
                    className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                  >
                    保存
                  </button>
                  <button
                    onClick={handleCancelCategoryEdit}
                    className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm sm:text-base"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-2xl font-bold">
                  {category.name}
                </h1>
                <button
                  onClick={handleEditCategoryName}
                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded mt-1 sm:mt-2.5"
                  title="カテゴリ名を編集"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}

            {activities.length === 0 ? (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow text-center text-gray-600 text-sm sm:text-base">
                アクティビティがありません
              </div>
            ) : (
              activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="bg-white p-3 sm:p-6 rounded-lg shadow mb-3 sm:mb-4"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* 順番変更ボタン */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(activity)}
                        disabled={index === 0}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(activity)}
                        disabled={index === activities.length - 1}
                        className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* アクティビティ情報 */}
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                          {activity.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                        {activity.image && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                            画像: {activity.image}
                          </p>
                        )}
                        {activity.link && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                            リンク:{" "}
                            <a
                              href={activity.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {activity.link}
                            </a>
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                          ステータス: {activity.status || "公開"} | 順番: {activity.order}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleEdit(activity)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteClick(activity)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <DeleteConfirmModal
          isOpen={!!deletingActivity}
          sectionName={deletingActivity?.title || ""}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingActivity(null)}
        />
      </main>
    </div>
  );
}

export default function CategoryActivitiesPage() {
  return (
    <ProtectedRoute>
      <CategoryActivitiesContent />
    </ProtectedRoute>
  );
}
