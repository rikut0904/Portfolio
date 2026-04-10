import React from "react";

interface HistoryItem {
  date: string;
  details: string[];
}

interface HistorySectionFormProps {
  formData: any;
  setFormData: (data: any) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => Promise<void>;
  sortHistories: (
    histories: HistoryItem[],
    order: "asc" | "desc",
  ) => HistoryItem[];
}

export default function HistorySectionForm({
  formData,
  setFormData,
  sortOrder,
  onSortOrderChange,
  sortHistories,
}: HistorySectionFormProps) {
  const histories = formData.histories || [];

  const addHistory = () => {
    setFormData({
      ...formData,
      histories: [...histories, { date: "", details: [""] }],
    });
  };

  const updateHistory = (
    index: number,
    field: "date" | "details",
    value: any,
  ) => {
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

  const updateDetail = (
    historyIndex: number,
    detailIndex: number,
    value: string,
  ) => {
    const newHistories = [...histories];
    newHistories[historyIndex].details[detailIndex] = value;
    setFormData({ ...formData, histories: newHistories });
  };

  const removeDetail = (historyIndex: number, detailIndex: number) => {
    const newHistories = [...histories];
    newHistories[historyIndex].details = newHistories[
      historyIndex
    ].details.filter((_: string, i: number) => i !== detailIndex);
    setFormData({ ...formData, histories: newHistories });
  };

  const handleSortHistories = () => {
    setFormData({
      ...formData,
      histories: sortHistories(histories, sortOrder),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-900">ソート設定</p>
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
              onChange={(e) =>
                onSortOrderChange(e.target.value as "asc" | "desc")
              }
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
              onChange={(e) =>
                onSortOrderChange(e.target.value as "asc" | "desc")
              }
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
        <div
          key={historyIndex}
          className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50"
        >
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={history.date || ""}
              onChange={(e) =>
                updateHistory(historyIndex, "date", e.target.value)
              }
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
                  onChange={(e) =>
                    updateDetail(historyIndex, detailIndex, e.target.value)
                  }
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
}
