"use client";

import React, { useState, useEffect } from "react";

interface SectionFormProps {
  section: {
    id: string;
    meta: {
      displayName: string;
      type: string;
      order: number;
      editable: boolean;
      sortOrder?: "asc" | "desc"; // 履歴のソート順（asc: 昇順、desc: 降順）
    };
    data: any;
  };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onMetaUpdate?: (meta: any) => Promise<void>;
}

// リスト項目のインターフェース
interface ListItem {
  title?: string;
  items: string[];
}

interface HistoryItem {
  date: string;
  details: string[];
}

export default function SectionForm({ section, onSave, onCancel, onMetaUpdate }: SectionFormProps) {
  // データの初期化: 旧形式のitemsをhistoriesに変換
  const initializeFormData = () => {
    const data = section.data;

    // historyタイプで旧形式（items）の場合、historiesに変換
    if (section.meta.type === "history" && data?.items && !data?.histories) {
      return {
        ...data,
        histories: data.items
      };
    }

    return data;
  };

  const [formData, setFormData] = useState<any>(initializeFormData());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(section.meta.sortOrder || "asc");
  const [loading, setLoading] = useState(false);

  // 日付文字列をパース（YYYY年MM月 形式）
  const parseDate = (dateStr: string): number => {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月/);
    if (!match) return 0;
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    return year * 100 + month; // 例: 2024年03月 -> 202403
  };

  // 履歴データを年月順にソート
  const sortHistories = (histories: HistoryItem[], order: "asc" | "desc" = sortOrder): HistoryItem[] => {
    return [...histories].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (order === "asc") {
        return dateA - dateB; // 昇順（古い順）
      } else {
        return dateB - dateA; // 降順（新しい順）
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // historyタイプの場合、保存前に自動ソート
      let dataToSave = formData;
      if (section.meta.type === "history" && formData.histories) {
        dataToSave = {
          ...formData,
          histories: sortHistories(formData.histories, sortOrder)
        };
      }
      await onSave(dataToSave);
    } finally {
      setLoading(false);
    }
  };

  const handleSortOrderChange = async (newOrder: "asc" | "desc") => {
    setSortOrder(newOrder);
    // メタデータ更新用のコールバックがあれば呼び出す
    if (onMetaUpdate) {
      await onMetaUpdate({ sortOrder: newOrder });
    }
  };

  // プロフィールセクション（single/profile対応）
  const renderProfileForm = () => {
    // 旧形式: { data: { name, hometown, hobbies, university, profileImage } }
    // 新形式: { name, from, hobbies, affiliation, imageUrl }
    const profileData = formData.data || formData;

    const updateProfileData = (field: string, value: string) => {
      if (formData.data) {
        // 旧形式の場合
        setFormData({
          ...formData,
          data: { ...formData.data, [field]: value }
        });
      } else {
        // 新形式の場合
        setFormData({ ...formData, [field]: value });
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
          <input
            type="text"
            value={profileData.name || ""}
            onChange={(e) => updateProfileData("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">出身</label>
          <input
            type="text"
            value={profileData.hometown || profileData.from || ""}
            onChange={(e) => updateProfileData(formData.data ? "hometown" : "from", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">趣味</label>
          <input
            type="text"
            value={profileData.hobbies || ""}
            onChange={(e) => updateProfileData("hobbies", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所属・大学</label>
          <input
            type="text"
            value={profileData.university || profileData.affiliation || ""}
            onChange={(e) => updateProfileData(formData.data ? "university" : "affiliation", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">プロフィール画像URL</label>
          <input
            type="text"
            value={profileData.profileImage || profileData.imageUrl || ""}
            onChange={(e) => updateProfileData(formData.data ? "profileImage" : "imageUrl", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="/img/profile.jpg"
          />
        </div>
      </div>
    );
  };

  // categorizedタイプのGUI編集フォーム（専門領域形式）
  const renderCategorizedForm = () => {
    // 旧形式: { items: [{ title, items: [] }] } （専門領域）
    // または { categories: [], items: [{ category, name }] } （資格）

    // 専門領域形式の場合
    if (formData.items && Array.isArray(formData.items) && formData.items.length > 0 && formData.items[0]?.title !== undefined) {
      const lists = formData.items;

      const addList = () => {
        setFormData({
          ...formData,
          items: [...lists, { title: "", items: [""] }],
        });
      };

      const updateList = (index: number, field: "title" | "items", value: any) => {
        const newLists = [...lists];
        newLists[index] = { ...newLists[index], [field]: value };
        setFormData({ ...formData, items: newLists });
      };

      const removeList = (index: number) => {
        setFormData({
          ...formData,
          items: lists.filter((_: any, i: number) => i !== index),
        });
      };

      const addItem = (listIndex: number) => {
        const newLists = [...lists];
        newLists[listIndex].items.push("");
        setFormData({ ...formData, items: newLists });
      };

      const updateItem = (listIndex: number, itemIndex: number, value: string) => {
        const newLists = [...lists];
        newLists[listIndex].items[itemIndex] = value;
        setFormData({ ...formData, items: newLists });
      };

      const removeItem = (listIndex: number, itemIndex: number) => {
        const newLists = [...lists];
        newLists[listIndex].items = newLists[listIndex].items.filter(
          (_: string, i: number) => i !== itemIndex
        );
        setFormData({ ...formData, items: newLists });
      };

      const moveListUp = (index: number) => {
        if (index === 0) return;
        const newLists = [...lists];
        [newLists[index - 1], newLists[index]] = [newLists[index], newLists[index - 1]];
        setFormData({ ...formData, items: newLists });
      };

      const moveListDown = (index: number) => {
        if (index === lists.length - 1) return;
        const newLists = [...lists];
        [newLists[index], newLists[index + 1]] = [newLists[index + 1], newLists[index]];
        setFormData({ ...formData, items: newLists });
      };

      const moveItemUp = (listIndex: number, itemIndex: number) => {
        if (itemIndex === 0) return;
        const newLists = [...lists];
        const items = [...newLists[listIndex].items];
        [items[itemIndex - 1], items[itemIndex]] = [items[itemIndex], items[itemIndex - 1]];
        newLists[listIndex].items = items;
        setFormData({ ...formData, items: newLists });
      };

      const moveItemDown = (listIndex: number, itemIndex: number) => {
        const newLists = [...lists];
        if (itemIndex === newLists[listIndex].items.length - 1) return;
        const items = [...newLists[listIndex].items];
        [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
        newLists[listIndex].items = items;
        setFormData({ ...formData, items: newLists });
      };

      return (
        <div className="space-y-6">
          {lists.map((list: any, listIndex: number) => (
            <div key={listIndex} className="border border-gray-300 rounded-lg p-2 sm:p-4 bg-gray-50">
              <div className="flex items-start gap-1 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                    {/* 順番変更ボタン */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveListUp(listIndex)}
                        disabled={listIndex === 0}
                        className="p-0.5 sm:p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveListDown(listIndex)}
                        disabled={listIndex === lists.length - 1}
                        className="p-0.5 sm:p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <h3 className="text-xs sm:text-base font-medium whitespace-nowrap">カテゴリ</h3>
                    <button
                      type="button"
                      onClick={() => removeList(listIndex)}
                      className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-2 sm:mb-3">
                    <input
                      type="text"
                      value={list.title || ""}
                      onChange={(e) => updateList(listIndex, "title", e.target.value)}
                      placeholder="カテゴリ名"
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <h3 className="text-xs sm:text-base font-medium">項目</h3>
                    {list.items?.map((item: string, itemIndex: number) => (
                      <div key={itemIndex} className="flex items-center gap-1">
                        {/* 項目の順番変更ボタン */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => moveItemUp(listIndex, itemIndex)}
                            disabled={itemIndex === 0}
                            className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上に移動"
                          >
                            <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItemDown(listIndex, itemIndex)}
                            disabled={itemIndex === list.items.length - 1}
                            className="p-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下に移動"
                          >
                            <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateItem(listIndex, itemIndex, e.target.value)}
                          placeholder="項目"
                          className="flex-1 min-w-0 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(listIndex, itemIndex)}
                          className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs sm:text-sm flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addItem(listIndex)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs sm:text-base"
                    >
                      + 項目を追加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addList}
            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
          >
            + カテゴリを追加
          </button>
        </div>
      );
    }

    // 資格形式の場合（categories + items）
    // TODO: 必要に応じて実装
    return (
      <div>
        <p className="text-gray-500">この形式のデータは現在GUI編集に対応していません。</p>
      </div>
    );
  };

  // リスト形式セクション（新規作成用）
  const renderListForm = () => {
    const lists = formData.lists || [];

    const addList = () => {
      setFormData({
        ...formData,
        lists: [...lists, { title: "", items: [""] }],
      });
    };

    const updateList = (index: number, field: "title" | "items", value: any) => {
      const newLists = [...lists];
      newLists[index] = { ...newLists[index], [field]: value };
      setFormData({ ...formData, lists: newLists });
    };

    const removeList = (index: number) => {
      setFormData({
        ...formData,
        lists: lists.filter((_: any, i: number) => i !== index),
      });
    };

    const addItem = (listIndex: number) => {
      const newLists = [...lists];
      newLists[listIndex].items.push("");
      setFormData({ ...formData, lists: newLists });
    };

    const updateItem = (listIndex: number, itemIndex: number, value: string) => {
      const newLists = [...lists];
      newLists[listIndex].items[itemIndex] = value;
      setFormData({ ...formData, lists: newLists });
    };

    const removeItem = (listIndex: number, itemIndex: number) => {
      const newLists = [...lists];
      newLists[listIndex].items = newLists[listIndex].items.filter(
        (_: string, i: number) => i !== itemIndex
      );
      setFormData({ ...formData, lists: newLists });
    };

    return (
      <div className="space-y-6">
        {lists.map((list: ListItem, listIndex: number) => (
          <div key={listIndex} className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={list.title || ""}
                onChange={(e) => updateList(listIndex, "title", e.target.value)}
                placeholder="カテゴリ名（例：情報、電気）"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => removeList(listIndex)}
                className="px-2 py-2 sm:px-3 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-shrink-0 text-base sm:text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {list.items.map((item: string, itemIndex: number) => (
                <div key={itemIndex} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(listIndex, itemIndex, e.target.value)}
                    placeholder="項目を入力"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(listIndex, itemIndex)}
                    className="px-2 py-1 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(listIndex)}
                className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm sm:text-base"
              >
                + 項目を追加
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addList}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
        >
          + カテゴリを追加
        </button>
      </div>
    );
  };

  // 履歴形式セクション（学歴、イベント履歴など）
  const renderHistoryForm = () => {
    const histories = formData.histories || [];

    const addHistory = () => {
      setFormData({
        ...formData,
        histories: [...histories, { date: "", details: [""] }],
      });
    };

    const updateHistory = (index: number, field: "date" | "details", value: any) => {
      const newHistories = [...histories];
      newHistories[index] = { ...newHistories[index], [field]: value };
      setFormData({ ...formData, histories: newHistories });
    };

    const removeHistory = (index: number) => {
      setFormData({
        ...formData,
        histories: histories.filter((_: any, i: number) => i !== index),
      });
    };

    const addDetail = (historyIndex: number) => {
      const newHistories = [...histories];
      newHistories[historyIndex].details.push("");
      setFormData({ ...formData, histories: newHistories });
    };

    const updateDetail = (historyIndex: number, detailIndex: number, value: string) => {
      const newHistories = [...histories];
      newHistories[historyIndex].details[detailIndex] = value;
      setFormData({ ...formData, histories: newHistories });
    };

    const removeDetail = (historyIndex: number, detailIndex: number) => {
      const newHistories = [...histories];
      newHistories[historyIndex].details = newHistories[historyIndex].details.filter(
        (_: string, i: number) => i !== detailIndex
      );
      setFormData({ ...formData, histories: newHistories });
    };

    const handleSortHistories = () => {
      setFormData({
        ...formData,
        histories: sortHistories(histories, sortOrder)
      });
    };

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              ソート設定
            </p>
            <button
              type="button"
              onClick={handleSortHistories}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              今すぐソート
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="sortOrder"
                value="asc"
                checked={sortOrder === "asc"}
                onChange={(e) => handleSortOrderChange(e.target.value as "asc" | "desc")}
                className="mr-2"
              />
              <span className="text-sm text-blue-800">昇順（古い→新しい）</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="sortOrder"
                value="desc"
                checked={sortOrder === "desc"}
                onChange={(e) => handleSortOrderChange(e.target.value as "asc" | "desc")}
                className="mr-2"
              />
              <span className="text-sm text-blue-800">降順（新しい→古い）</span>
            </label>
          </div>
          <p className="text-xs text-blue-700">
            保存時に選択した順序で自動ソートされます
          </p>
        </div>
        {histories.map((history: HistoryItem, historyIndex: number) => (
          <div key={historyIndex} className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={history.date || ""}
                onChange={(e) => updateHistory(historyIndex, "date", e.target.value)}
                placeholder="日付（例：2024年04月）"
                className="flex-1 sm:w-48 sm:flex-initial px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => removeHistory(historyIndex)}
                className="px-2 py-2 sm:px-3 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 flex-shrink-0 text-base sm:text-lg font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {history.details.map((detail: string, detailIndex: number) => (
                <div key={detailIndex} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={detail}
                    onChange={(e) => updateDetail(historyIndex, detailIndex, e.target.value)}
                    placeholder="詳細を入力"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => removeDetail(historyIndex, detailIndex)}
                    className="px-2 py-1 sm:px-3 sm:py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addDetail(historyIndex)}
                className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm sm:text-base"
              >
                + 詳細を追加
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addHistory}
          className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
        >
          + 履歴を追加
        </button>
      </div>
    );
  };

  // セクションタイプに応じてフォームを表示
  const renderFormContent = () => {
    switch (section.meta.type) {
      case "profile":
      case "single":
        return renderProfileForm();
      case "list":
        return renderListForm();
      case "history":
        return renderHistoryForm();
      case "categorized":
        return renderCategorizedForm();
      default:
        // JSON形式の編集（フォールバック）
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              データ（JSON形式）
            </label>
            <textarea
              value={JSON.stringify(formData, null, 2)}
              onChange={(e) => {
                try {
                  setFormData(JSON.parse(e.target.value));
                } catch (error) {
                  // JSON解析エラーは無視
                }
              }}
              rows={20}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">{section.meta.displayName}を編集</h2>

      {renderFormContent()}

      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
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
