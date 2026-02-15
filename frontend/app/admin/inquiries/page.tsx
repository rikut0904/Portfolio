"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";

type InquiryStatus = "pending" | "in_progress" | "resolved";

type AdminInquiry = {
  id: string;
  category?: string;
  subject?: string;
  contactName?: string;
  contactEmail?: string;
  status: InquiryStatus;
  createdAt: string;
};

const statusLabel = (status?: InquiryStatus) => {
  switch (status) {
    case "pending":
      return "対応前";
    case "in_progress":
      return "対応中";
    case "resolved":
      return "対応済み";
    default:
      return "-";
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
};

function InquiriesContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [statusFilters, setStatusFilters] = useState<InquiryStatus[]>([
    "pending",
    "in_progress",
  ]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/inquiries", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("お問い合わせ一覧の取得に失敗しました");
        }
        const data = await response.json();
        setItems(data.inquiries || []);
      } catch (err) {
        console.error("Failed to fetch inquiries", err);
        setError("お問い合わせ一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const categoryOptions = useMemo(() => {
    const values = new Set(items.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(values)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = userFilter.trim().toLowerCase();
    const hasQuery = query.length > 0;
    return items.filter((item) => {
      if (!statusFilters.includes(item.status)) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter)
        return false;
      if (!hasQuery) return true;
      const target = [item.contactName, item.contactEmail, item.subject]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return target.includes(query);
    });
  }, [items, userFilter, statusFilters, categoryFilter]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [filteredItems, sortDirection]);

  const toggleStatus = (status: InquiryStatus) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        return prev.filter((value) => value !== status);
      }
      return [...prev, status];
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                お問い合わせ一覧（管理者）
              </h1>
              <p className="text-sm text-gray-600">
                送信されたお問い合わせの内容を確認できます
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm text-blue-800 hover:text-gray-900"
            >
              ダッシュボードへ戻る
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="inquiry-user-filter"
              >
                検索
              </label>
              <input
                id="inquiry-user-filter"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder="名前・メール・件名で検索"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">対応状況</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {(
                  ["pending", "in_progress", "resolved"] as InquiryStatus[]
                ).map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={statusFilters.includes(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    {statusLabel(status)}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                カテゴリ
              </label>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "すべて" : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                表示順
              </label>
              <button
                type="button"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                {sortDirection === "asc" ? "古い順" : "新しい順"}
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && sortedItems.length === 0 && (
            <p className="text-sm text-gray-500">
              お問い合わせはまだありません
            </p>
          )}

          {sortedItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">受信日時</th>
                    <th className="px-3 py-2">対応状況</th>
                    <th className="px-3 py-2">カテゴリ</th>
                    <th className="px-3 py-2">件名</th>
                    <th className="px-3 py-2">連絡先</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-2">{statusLabel(item.status)}</td>
                      <td className="px-3 py-2">{item.category || "-"}</td>
                      <td className="px-3 py-2">{item.subject || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="text-gray-900">
                          {item.contactName || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.contactEmail || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/inquiries/${item.id}`}
                          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminInquiriesPage() {
  return (
    <ProtectedRoute>
      <InquiriesContent />
    </ProtectedRoute>
  );
}
