"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";
import SectionForm from "../../../components/admin/SectionForm";
import NewSectionForm from "../../../components/admin/NewSectionForm";
import DeleteConfirmModal from "../../../components/admin/DeleteConfirmModal";

interface Section {
  id: string;
  meta: {
    displayName: string;
    type: string;
    order: number;
    editable: boolean;
  };
  data: unknown;
}

function SectionsContent() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/sections");
      const data = await response.json();
      setSections(data.sections);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
  };

  const handleSave = async (data: any) => {
    if (!user || !editingSection) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchSections();
        setEditingSection(null);
        alert("保存しました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save section:", error);
      alert("保存に失敗しました");
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
  };

  const handleCreate = async (sectionData: {
    id: string;
    displayName: string;
    type: string;
    sortOrder?: "asc" | "desc";
    data: any;
  }) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
      });

      if (response.ok) {
        await fetchSections();
        setIsCreating(false);
        alert("セクションを作成しました");
      } else {
        const errorData = await response.json();
        alert(`作成に失敗しました: ${errorData.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Failed to create section:", error);
      alert("作成に失敗しました");
    }
  };

  const handleMetaUpdate = async (meta: any) => {
    if (!user || !editingSection) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/sections/${editingSection.id}/meta`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meta),
      });

      if (response.ok) {
        await fetchSections();
      } else {
        console.error("Failed to update meta");
      }
    } catch (error) {
      console.error("Failed to update meta:", error);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleDeleteClick = (section: Section) => {
    setDeletingSection(section);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deletingSection) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/sections/${deletingSection.id}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchSections();
        setDeletingSection(null);
        alert("セクションを削除しました");
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete section:", error);
      alert("削除に失敗しました");
    }
  };

  const handleDeleteCancel = () => {
    setDeletingSection(null);
  };

  const handleMoveUp = async (section: Section) => {
    if (!user) return;

    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (currentIndex === 0) return; // 既に一番上

    const targetSection = sections[currentIndex - 1];

    // 楽観的更新: UIを即座に更新
    const newSections = [...sections];

    // 先にorder値を保存
    const currentOrder = section.meta.order;
    const targetOrder = targetSection.meta.order;

    // セクションオブジェクトを複製してorder値を入れ替え
    const updatedCurrent = {
      ...section,
      meta: { ...section.meta, order: targetOrder }
    };
    const updatedTarget = {
      ...targetSection,
      meta: { ...targetSection.meta, order: currentOrder }
    };

    // 配列内の位置を入れ替え
    newSections[currentIndex - 1] = updatedCurrent;
    newSections[currentIndex] = updatedTarget;

    setSections(newSections);

    try {
      const token = await user.getIdToken();

      // バックグラウンドで2つのセクションの順番を入れ替え
      await Promise.all([
        fetch(`/api/sections/${section.id}/meta`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetSection.meta.order }),
        }),
        fetch(`/api/sections/${targetSection.id}/meta`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: section.meta.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move section up:", error);
      alert("順番の変更に失敗しました");
      // エラー時は元に戻す
      await fetchSections();
    }
  };

  const handleMoveDown = async (section: Section) => {
    if (!user) return;

    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (currentIndex === sections.length - 1) return; // 既に一番下

    const targetSection = sections[currentIndex + 1];

    // 楽観的更新: UIを即座に更新
    const newSections = [...sections];

    // 先にorder値を保存
    const currentOrder = section.meta.order;
    const targetOrder = targetSection.meta.order;

    // セクションオブジェクトを複製してorder値を入れ替え
    const updatedCurrent = {
      ...section,
      meta: { ...section.meta, order: targetOrder }
    };
    const updatedTarget = {
      ...targetSection,
      meta: { ...targetSection.meta, order: currentOrder }
    };

    // 配列内の位置を入れ替え
    newSections[currentIndex] = updatedTarget;
    newSections[currentIndex + 1] = updatedCurrent;

    setSections(newSections);

    try {
      const token = await user.getIdToken();

      // バックグラウンドで2つのセクションの順番を入れ替え
      await Promise.all([
        fetch(`/api/sections/${section.id}/meta`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: targetSection.meta.order }),
        }),
        fetch(`/api/sections/${targetSection.id}/meta`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ order: section.meta.order }),
        }),
      ]);
    } catch (error) {
      console.error("Failed to move section down:", error);
      alert("順番の変更に失敗しました");
      // エラー時は元に戻す
      await fetchSections();
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
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="py-2 sm:py-4">
          <Link href="/admin" className="text-blue-800 hover:text-gray-900 mb-2 sm:mb-4 inline-block text-sm sm:text-base">
            ← ダッシュボード
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-2xl font-bold">セクション管理</h1>
            {!editingSection && !isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新規セクションを作成
              </button>
            )}
          </div>
        </div>
        {isCreating ? (
          /* 新規作成モード */
          <NewSectionForm
            onSave={handleCreate}
            onCancel={handleCancelCreate}
            existingSections={sections}
          />
        ) : editingSection ? (
          /* 編集モード */
          <SectionForm
            section={editingSection}
            onSave={handleSave}
            onCancel={handleCancel}
            onMetaUpdate={handleMetaUpdate}
          />
        ) : (
          /* 一覧モード */
          <div className="space-y-3 sm:space-y-4">
            {sections.map((section, index) => (
              <div key={section.id} className="bg-white p-3 sm:p-6 rounded-lg shadow">
                <div className="flex items-start gap-2 sm:gap-4">
                  {/* 順番変更ボタン */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMoveUp(section)}
                      disabled={index === 0}
                      className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="上に移動"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(section)}
                      disabled={index === sections.length - 1}
                      className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="下に移動"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* セクション情報 */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {section.meta.displayName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      ID: {section.id} | 順番: {section.meta.order}
                    </p>
                  </div>

                  {/* 編集・削除ボタン（縦並び） */}
                  {section.meta.editable && (
                    <div className="flex flex-col gap-1.5 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(section)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteClick(section)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base whitespace-nowrap"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 削除確認モーダル */}
        <DeleteConfirmModal
          isOpen={!!deletingSection}
          sectionName={deletingSection?.meta.displayName || ""}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </main>
    </div>
  );
}

export default function SectionsPage() {
  return (
    <ProtectedRoute>
      <SectionsContent />
    </ProtectedRoute>
  );
}
