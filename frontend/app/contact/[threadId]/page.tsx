"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import FadeInSection from "../../../components/FadeInSection";
import SiteLayout from "../../../components/layouts/SiteLayout";

type InquiryStatus = "pending" | "in_progress" | "resolved";

type InquiryReply = {
  id: string;
  threadId: string;
  senderType: "admin" | "user";
  senderName?: string;
  message: string;
  createdAt: string;
};

type InquiryDetail = {
  id: string;
  threadId: string;
  threadUrl?: string;
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

export default function ContactThreadPage() {
  const params = useParams();
  const threadId = useMemo(() => {
    const value = params?.threadId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!threadId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/contact/thread/${threadId}`);
      if (!response.ok) {
        throw new Error("お問い合わせ内容の取得に失敗しました");
      }
      const data = await response.json();
      setDetail(data.contact || data.inquiry || null);
    } catch (fetchError) {
      console.error("Failed to fetch inquiry thread", fetchError);
      setError("お問い合わせ内容の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleReply = async () => {
    if (!threadId) return;
    setReplyError(null);
    setFeedback(null);

    if (!message.trim()) {
      setReplyError("返信内容を入力してください");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/contact/thread/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!response.ok) {
        throw new Error("返信の送信に失敗しました");
      }
      setMessage("");
      setFeedback("返信を送信しました");
      await fetchDetail();
    } catch (submitError) {
      console.error("Failed to reply inquiry thread", submitError);
      setReplyError("返信の送信に失敗しました");
    } finally {
      setSubmitting(false);
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
    <SiteLayout>
      <FadeInSection>
        <section className="py-8">
          <h1>お問い合わせスレッド</h1>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="card space-y-6">
              {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}

              {!loading && detail && (
                <>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-body)]">
                      <span>状態: {statusLabel(detail.status)}</span>
                      <span>受付日時: {formatDateTime(detail.createdAt)}</span>
                    </div>
                    <h2 className="mb-0 border-none p-0 text-2xl">
                      {detail.subject || "お問い合わせ"}
                    </h2>
                    <p className="mb-0 text-sm text-[var(--text-body)]">
                      カテゴリ: {detail.category || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] p-4">
                    <p className="mb-2 text-xs text-gray-500">お問い合わせ内容</p>
                    <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                      {detail.message || "-"}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-lg border border-[var(--card-border)] bg-[var(--card-background)] p-4"
                      >
                        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {reply.senderType === "admin"
                              ? "管理者"
                              : reply.senderName || "お問い合わせ者"}
                          </span>
                          <span>{formatDateTime(reply.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                    {replies.length === 0 && (
                      <p className="text-sm text-gray-500">
                        まだ返信はありません。
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[var(--text-body)]">
                      返信を追加する
                    </p>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="min-h-[140px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)]"
                      placeholder="追加のご連絡があればご記載ください"
                    />
                    {feedback && (
                      <p className="text-sm text-green-600">{feedback}</p>
                    )}
                    {replyError && (
                      <p className="text-sm text-red-600">{replyError}</p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleReply}
                        disabled={submitting}
                        className="rounded-md bg-[var(--primary-color)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "送信中..." : "返信を送信する"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside className="space-y-4">
              <div className="card">
                <h3 className="mb-3">使い方</h3>
                <p className="text-sm">
                  このページでは、送信済みのお問い合わせに対する返信確認と追加連絡ができます。
                </p>
              </div>

              <div className="card">
                <h3 className="mb-3">ご注意</h3>
                <p className="mb-0 text-sm">
                  このURLを知っている人は内容を確認できます。共有範囲にはご注意ください。
                </p>
              </div>
            </aside>
          </div>
        </section>
      </FadeInSection>
    </SiteLayout>
  );
}
