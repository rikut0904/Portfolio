"use client";

import React, { useState } from "react";

interface NewSectionFormProps {
  onSave: (sectionData: {
    id: string;
    displayName: string;
    type: string;
    order?: number;
    sortOrder?: "asc" | "desc";
    data: any;
  }) => Promise<void>;
  onCancel: () => void;
  existingSections?: Array<{
    id: string;
    meta: { displayName: string; order: number };
  }>;
}

export default function NewSectionForm({
  onSave,
  onCancel,
  existingSections = [],
}: NewSectionFormProps) {
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [type, setType] = useState("list");
  const [order, setOrder] = useState<number | "">(
    existingSections.length > 0
      ? Math.max(...existingSections.map((s) => s.meta.order)) + 1
      : 1,
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !displayName) {
      alert("IDと表示名は必須です");
      return;
    }

    // IDのバリデーション（英数字とハイフン、アンダースコアのみ）
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      alert("IDは英数字、ハイフン、アンダースコアのみ使用できます");
      return;
    }

    setLoading(true);
    try {
      // タイプに応じた初期データを作成
      let initialData = {};
      switch (type) {
        case "list":
          initialData = {
            lists: [],
          };
          break;
        case "history":
          initialData = {
            histories: [],
          };
          break;
      }

      await onSave({
        id,
        displayName,
        type,
        order: typeof order === "number" ? order : undefined,
        sortOrder: type === "history" ? sortOrder : undefined,
        data: initialData,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">新規セクションを作成</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            セクションID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="例: my-section"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            英数字、ハイフン、アンダースコアのみ使用可能（変更不可）
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            表示名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 自己紹介"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            表示順 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={order}
            onChange={(e) =>
              setOrder(e.target.value ? parseInt(e.target.value) : "")
            }
            placeholder="1"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            小さい数字ほど上に表示されます
            {existingSections.length > 0 && (
              <span className="block mt-1">
                現在のセクション数: {existingSections.length}
                （最大順番:{" "}
                {Math.max(...existingSections.map((s) => s.meta.order))}）
              </span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セクションタイプ <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value="list"
                checked={type === "list"}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">リスト形式</div>
                <div className="text-sm text-gray-600">
                  専門領域、資格など、カテゴリ別のリスト
                </div>
              </div>
            </label>

            <label className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="type"
                value="history"
                checked={type === "history"}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">履歴形式</div>
                <div className="text-sm text-gray-600">
                  学歴、イベント履歴など、日付と詳細を持つ履歴
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 履歴タイプの場合のみソート順設定を表示 */}
        {type === "history" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ソート順 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sortOrder"
                  value="asc"
                  checked={sortOrder === "asc"}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "asc" | "desc")
                  }
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">昇順（古い→新しい）</div>
                  <div className="text-sm text-gray-600">
                    2021年 → 2024年の順
                  </div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="sortOrder"
                  value="desc"
                  checked={sortOrder === "desc"}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "asc" | "desc")
                  }
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">降順（新しい→古い）</div>
                  <div className="text-sm text-gray-600">
                    2024年 → 2021年の順
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "作成中..." : "作成"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
