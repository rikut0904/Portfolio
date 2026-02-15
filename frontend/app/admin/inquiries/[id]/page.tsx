"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "../../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../../lib/auth/AuthContext";

type InquiryStatus = "pending" | "in_progress" | "resolved";

type InquiryReply = {
  id: string;
  message: string;
  senderType: "admin" | "user";
  senderName?: string;
  createdAt: string;
};

type InquiryDetail = {
  id: string;
  category?: string;
  subject?: string;
  message?: string;
  contactName?: string;
  contactEmail?: string;
  status: InquiryStatus;
  createdAt: string;
  replies: InquiryReply[];
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

function InquiryDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const inquiryId = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!user || !inquiryId) return;
    try {
      setError(null);
      const token = await user.getIdToken();
      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("お問い合わせ詳細の取得に失敗しました");
      }
      const data = await response.json();
      setDetail(data.inquiry || null);
    } catch (err) {
      console.error("Failed to fetch inquiry detail", err);
      setError("お問い合わせ詳細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [user, inquiryId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusUpdate = async (status: InquiryStatus) => {
    if (!user || !detail) return;
    try {
      setStatusLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/inquiries/${detail.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("対応状況の更新に失敗しました");
      }
      await fetchDetail();
    } catch (err) {
      console.error("Failed to update status", err);
      setError("対応状況の更新に失敗しました");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReply = async () => {
    if (!user || !detail) return;
    setReplyError(null);
    if (!replyMessage.trim()) {
      setReplyError("返信内容を入力してください");
      return;
    }

    try {
      setReplyLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/inquiries/${detail.id}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      if (!response.ok) {
        throw new Error("返信の送信に失敗しました");
      }
      setReplyMessage("");
      await fetchDetail();
    } catch (err) {
      console.error("Failed to send reply", err);
      setReplyError("返信の送信に失敗しました");
    } finally {
      setReplyLoading(false);
    }
  };

  const replies = useMemo(() => {
    if (!detail?.replies) return [];
    return [...detail.replies].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }, [detail?.replies]);

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                お問い合わせ詳細
              </h1>
              <p className="text-sm text-gray-600">
                やり取りの履歴を確認できます
              </p>
            </div>
            <Link
              href="/admin/inquiries"
              className="text-sm text-blue-800 hover:text-gray-900"
            >
              一覧へ戻る
            </Link>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <p className="text-sm text-gray-500">読み込み中...</p>}

          {!loading && detail && (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>状態: {statusLabel(detail.status)}</span>
                  <span>受付日時: {formatDateTime(detail.createdAt)}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {detail.subject || "-"}
                </h2>
                <p className="text-sm text-gray-500">
                  カテゴリ: {detail.category || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 mb-2">お問い合わせ内容</p>
                <p className="whitespace-pre-wrap text-sm text-gray-900">
                  {detail.message || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 mb-2">連絡先</p>
                <p className="text-sm text-gray-900">
                  {detail.contactName || "-"}
                </p>
                <p className="text-xs text-gray-500">
                  {detail.contactEmail || "-"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  対応状況を更新
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["pending", "in_progress", "resolved"] as InquiryStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusUpdate(status)}
                      disabled={statusLoading}
                      className={`rounded-md px-3 py-1 text-sm font-medium border ${
                        detail.status === status
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">返信内容</p>
                <textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  className="min-h-[140px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="回答内容を記載してください"
                />
                {replyError && (
                  <p className="text-sm text-red-600">{replyError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={replyLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {replyLoading ? "送信中..." : "返信を送信する"}
                  </button>
                </div>
              </div>

              {replies.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">返信履歴</p>
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-lg border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>
                          {reply.senderType === "admin"
                            ? "運営"
                            : reply.senderName || "お問い合わせ者"}
                        </span>
                        <span>{formatDateTime(reply.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-900">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminInquiryDetailPage() {
  return (
    <ProtectedRoute>
      <InquiryDetailContent />
    </ProtectedRoute>
  );
}
