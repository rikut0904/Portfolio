"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import Link from "next/link";

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
  const [editData, setEditData] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

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
    setEditData(JSON.stringify(section.data, null, 2));
  };

  const handleSave = async () => {
    if (!user || !editingSection) return;

    try {
      setSaveLoading(true);
      const parsedData = JSON.parse(editData);

      const token = await user.getIdToken();
      const response = await fetch(`/api/sections/${editingSection.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedData),
      });

      if (response.ok) {
        fetchSections();
        setEditingSection(null);
        setEditData("");
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save section:", error);
      alert("JSONの形式が正しくありません");
    } finally {
      setSaveLoading(false);
    }
  };

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
        <div className="py-4">
          <Link href="/admin" className="text-blue-800 hover:text-gray-900 mb-4">
            ← ダッシュボード
          </Link>
          <h1 className="text-2xl font-bold mb-4">セクション管理</h1>
        </div>
        {editingSection ? (
          /* 編集モード */
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingSection.meta.displayName}を編集
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                データ（JSON形式）
              </label>
              <textarea
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
                rows={20}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saveLoading ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => {
                  setEditingSection(null);
                  setEditData("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          /* 一覧モード */
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {section.meta.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ID: {section.id}
                    </p>
                  </div>
                  {section.meta.editable && (
                    <button
                      onClick={() => handleEdit(section)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      編集
                    </button>
                  )}
                </div>

                {/* データプレビュー */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(section.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
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
