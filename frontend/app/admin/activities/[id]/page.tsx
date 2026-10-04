"use client";

import React, { useState } from "react";
import ProtectedRoute from "../../../../components/admin/ProtectedRoute";
import Link from "next/link";
import {
  AdminPageContent,
  AdminPageHeader,
} from "../../../../components/admin/AdminPageShell";
import AdminLoading from "../../../../components/admin/AdminLoading";
import { useParams } from "next/navigation";
import DeleteConfirmModal from "../../../../components/admin/DeleteConfirmModal";
import ActivityForm from "../../../../components/admin/ActivityForm";
import ActivityList from "../../../../components/admin/ActivityList";
import {
  useCategoryActivities,
  Activity,
} from "../../../../hooks/useCategoryActivities";

function CategoryActivitiesContent() {
  const params = useParams();
  const categoryId = params.id as string;

  const {
    activities,
    category,
    loading,
    createActivity,
    updateActivity,
    deleteActivity,
    moveActivity,
    updateCategoryName,
  } = useCategoryActivities(categoryId);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(
    null,
  );
  const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    status: "公開",
  });

  const normalizeActivityImage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (
      trimmed.startsWith("/img/activity/") ||
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/")
    ) {
      return trimmed;
    }
    return `/img/activity/${trimmed}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      link: formData.link.trim(),
      image: normalizeActivityImage(formData.image),
    };

    let success = false;

    if (editingActivity) {
      success = await updateActivity(editingActivity.id, dataToSave);
      if (success) {
        alert("更新しました");
      } else {
        alert("更新に失敗しました");
      }
    } else {
      success = await createActivity(dataToSave);
      if (success) {
        alert("追加しました");
      } else {
        alert("追加に失敗しました");
      }
    }

    if (success) {
      handleCancel();
    }
  };

  const handleDeleteClick = (activity: Activity) => {
    setDeletingActivity(activity);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingActivity) return;

    const success = await deleteActivity(deletingActivity.id);
    if (success) {
      alert("削除しました");
    } else {
      alert("削除に失敗しました");
    }
    setDeletingActivity(null);
  };

  const handleDeleteCancel = () => {
    setDeletingActivity(null);
  };

  const handleMoveUp = async (activity: Activity) => {
    await moveActivity(activity.id, "up");
  };

  const handleMoveDown = async (activity: Activity) => {
    await moveActivity(activity.id, "down");
  };

  const handleEditCategoryName = () => {
    if (category) {
      setCategoryName(category.name);
      setIsEditingCategoryName(true);
    }
  };

  const handleSaveCategoryName = async () => {
    const success = await updateCategoryName(categoryName);
    if (success) {
      setIsEditingCategoryName(false);
      alert("カテゴリ名を更新しました");
    } else {
      alert("更新に失敗しました");
    }
  };

  const handleCancelCategoryEdit = () => {
    setIsEditingCategoryName(false);
    setCategoryName("");
  };

  if (loading) {
    return <AdminLoading />;
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            カテゴリが見つかりません
          </h1>
          <Link
            href="/admin/activities"
            className="text-blue-600 hover:text-blue-800"
          >
            ← カテゴリ一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminPageContent>
        <div className="py-2 sm:py-4">
          <AdminPageHeader
            page="activities"
            title={isEditingCategoryName ? "カテゴリ名を編集" : category.name}
            backHref="/admin/activities"
            backLabel="カテゴリ一覧"
            actions={
              !isEditingCategoryName ? (
                <button
                  onClick={handleEditCategoryName}
                  className="px-3 py-2 text-sm font-semibold text-[var(--primary-strong)]"
                >
                  カテゴリ名を編集
                </button>
              ) : null
            }
          />

          {isEditingCategoryName ? (
            <div className="mb-4 sm:mb-6 flex items-center gap-2">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-base sm:text-xl font-bold"
                placeholder="カテゴリ名を入力"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCategoryName}
                  className="admin-button admin-button--primary admin-button--compact"
                >
                  保存
                </button>
                <button
                  onClick={handleCancelCategoryEdit}
                  className="admin-button admin-button--secondary admin-button--compact"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : null}

          {!editingActivity && !isAddingNew && (
            <div className="mb-4 sm:mb-6">
              <button
                onClick={handleAddNew}
                className="admin-button admin-button--primary"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新規追加
              </button>
            </div>
          )}

          {(isAddingNew || editingActivity) && (
            <ActivityForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing={!!editingActivity}
            />
          )}

          <ActivityList
            activities={activities}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
        </div>

        <DeleteConfirmModal
          isOpen={!!deletingActivity}
          sectionName={deletingActivity?.title || ""}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
    </AdminPageContent>
  );
}

export default function CategoryActivitiesPage() {
  return (
    <ProtectedRoute>
      <CategoryActivitiesContent />
    </ProtectedRoute>
  );
}
