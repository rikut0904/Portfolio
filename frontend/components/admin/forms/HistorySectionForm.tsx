import React from "react";

interface LinkableText {
  text?: string;
  url?: string;
}

interface HistoryItem {
  date: string;
  url?: string;
  details?: Array<string | LinkableText>;
}

interface HistorySectionFormProps {
  formData: { histories?: HistoryItem[] };
  setFormData: (data: { histories?: HistoryItem[] }) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => Promise<void>;
  sortHistories: (
    histories: HistoryItem[],
    order: "asc" | "desc",
  ) => HistoryItem[];
}

const normalizeDetails = (details: Array<string | LinkableText> = []) =>
  details.map((detail) =>
    typeof detail === "string"
      ? { text: detail, url: "" }
      : { text: detail?.text || "", url: detail?.url || "" },
  );

const normalizeHistory = (history: HistoryItem) => ({
  date: history?.date || "",
  url: history?.url || "",
  details: normalizeDetails(history?.details || []),
});

export default function HistorySectionForm({
  formData,
  setFormData,
  sortOrder,
  onSortOrderChange,
  sortHistories,
}: HistorySectionFormProps) {
  const histories = Array.isArray(formData.histories) ? formData.histories : [];

  const commitHistories = (
    nextHistories: ReturnType<typeof normalizeHistory>[],
  ) => {
    setFormData({
      ...formData,
      histories: nextHistories.map((history) => ({
        date: history.date,
        url: history.url,
        details: history.details,
      })),
    });
  };

  const addHistory = () => {
    commitHistories([
      ...histories.map(normalizeHistory),
      { date: "", url: "", details: [{ text: "", url: "" }] },
    ]);
  };

  const updateHistory = (
    index: number,
    field: "date" | "url" | "details",
    value: string | LinkableText[],
  ) => {
    const nextHistories = histories.map(normalizeHistory);
    nextHistories[index] = { ...nextHistories[index], [field]: value };
    commitHistories(nextHistories);
  };

  const removeHistory = (index: number) => {
    commitHistories(
      histories
        .map(normalizeHistory)
        .filter(
          (_: ReturnType<typeof normalizeHistory>, i: number) => i !== index,
        ),
    );
  };

  const addDetail = (historyIndex: number) => {
    const nextHistories = histories.map(normalizeHistory);
    nextHistories[historyIndex] = {
      ...nextHistories[historyIndex],
      details: [...nextHistories[historyIndex].details, { text: "", url: "" }],
    };
    commitHistories(nextHistories);
  };

  const updateDetail = (
    historyIndex: number,
    detailIndex: number,
    field: "text" | "url",
    value: string,
  ) => {
    const nextHistories = histories.map(normalizeHistory);
    const nextDetails = [...nextHistories[historyIndex].details];
    nextDetails[detailIndex] = { ...nextDetails[detailIndex], [field]: value };
    updateHistory(historyIndex, "details", nextDetails);
  };

  const removeDetail = (historyIndex: number, detailIndex: number) => {
    const nextHistories = histories.map(normalizeHistory);
    nextHistories[historyIndex] = {
      ...nextHistories[historyIndex],
      details: nextHistories[historyIndex].details.filter(
        (_: LinkableText, i: number) => i !== detailIndex,
      ),
    };
    commitHistories(nextHistories);
  };

  const handleSortHistories = () => {
    setFormData({
      ...formData,
      histories: sortHistories(histories.map(normalizeHistory), sortOrder),
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
      {histories.map((rawHistory: HistoryItem, historyIndex: number) => {
        const history = normalizeHistory(rawHistory);
        return (
          <div
            key={historyIndex}
            className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50"
          >
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={history.date}
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
            <input
              type="url"
              value={history.url}
              onChange={(e) =>
                updateHistory(historyIndex, "url", e.target.value)
              }
              placeholder="カードURL（任意）"
              className="mb-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
            />
            <div className="space-y-2">
              {history.details.map((detail, detailIndex: number) => (
                <div
                  key={detailIndex}
                  className="rounded-md border border-gray-200 bg-white p-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={detail.text || ""}
                      onChange={(e) =>
                        updateDetail(
                          historyIndex,
                          detailIndex,
                          "text",
                          e.target.value,
                        )
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
                  <input
                    type="url"
                    value={detail.url || ""}
                    onChange={(e) =>
                      updateDetail(
                        historyIndex,
                        detailIndex,
                        "url",
                        e.target.value,
                      )
                    }
                    placeholder="詳細URL（任意）"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                  />
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
        );
      })}
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
