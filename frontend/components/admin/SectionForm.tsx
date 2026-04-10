"use client";

import React, { useState } from "react";
import ProfileSectionForm from "./forms/ProfileSectionForm";
import CategorizedSectionForm from "./forms/CategorizedSectionForm";
import ListSectionForm from "./forms/ListSectionForm";
import HistorySectionForm from "./forms/HistorySectionForm";

interface SectionFormProps {
  section: {
    id: string;
    meta: {
      displayName: string;
      type: string;
      order: number;
      editable: boolean;
      sortOrder?: "asc" | "desc";
    };
    data: any;
  };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onMetaUpdate?: (meta: any) => Promise<void>;
}

interface HistoryItem {
  date: string;
  details: string[];
}

export default function SectionForm({
  section,
  onSave,
  onCancel,
  onMetaUpdate,
}: SectionFormProps) {
  const initializeFormData = () => {
    const data = section.data;
    if (section.meta.type === "history" && data?.items && !data?.histories) {
      return {
        ...data,
        histories: data.items,
      };
    }
    return data;
  };

  const [formData, setFormData] = useState<any>(initializeFormData());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    section.meta.sortOrder || "asc",
  );
  const [loading, setLoading] = useState(false);

  const parseDate = (dateStr: string): number => {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月/);
    if (!match) return 0;
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    return year * 100 + month;
  };

  const sortHistories = (
    histories: HistoryItem[],
    order: "asc" | "desc" = sortOrder,
  ): HistoryItem[] => {
    return [...histories].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (order === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let dataToSave = formData;
      if (section.meta.type === "history" && formData.histories) {
        dataToSave = {
          ...formData,
          histories: sortHistories(formData.histories, sortOrder),
        };
      }
      await onSave(dataToSave);
    } finally {
      setLoading(false);
    }
  };

  const handleSortOrderChange = async (newOrder: "asc" | "desc") => {
    setSortOrder(newOrder);
    if (onMetaUpdate) {
      await onMetaUpdate({ sortOrder: newOrder });
    }
  };

  const renderFormContent = () => {
    switch (section.meta.type) {
      case "profile":
      case "single":
        return (
          <ProfileSectionForm formData={formData} setFormData={setFormData} />
        );
      case "list":
        return (
          <ListSectionForm formData={formData} setFormData={setFormData} />
        );
      case "history":
        return (
          <HistorySectionForm
            formData={formData}
            setFormData={setFormData}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            sortHistories={sortHistories}
          />
        );
      case "categorized":
        return (
          <CategorizedSectionForm
            formData={formData}
            setFormData={setFormData}
          />
        );
      default:
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
      <h2 className="text-xl font-semibold mb-4">
        {section.meta.displayName}を編集
      </h2>

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
