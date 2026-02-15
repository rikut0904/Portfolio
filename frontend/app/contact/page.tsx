"use client";

import { FormEvent, useMemo, useState } from "react";
import FadeInSection from "../../components/FadeInSection";
import SiteLayout from "../../components/layouts/SiteLayout";

const CATEGORY_OPTIONS = [
  { value: "general", label: "全般" },
  { value: "project", label: "制作物について" },
  { value: "bug", label: "不具合報告" },
  { value: "other", label: "その他" },
];

export default function ContactPage() {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      subject.trim().length > 0 &&
      message.trim().length > 0 &&
      contactEmail.trim().length > 0
    );
  }, [subject, message, contactEmail]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!canSubmit) {
      setError("件名・内容・メールアドレスは必須です");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "送信に失敗しました");
      }

      setSuccess(true);
      setSubject("");
      setMessage("");
    } catch (submitError) {
      console.error("Failed to submit inquiry", submitError);
      setError("送信に失敗しました。時間をおいて再度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <FadeInSection>
        <section id="contact" className="py-8">
          <h1>お問い合わせ</h1>
          <div className="grid gap-6">
            <div className="card">
              <p className="text-sm text-[var(--text-body)]">
                ご質問・ご相談など、お気軽にご連絡ください。
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--text-body)]"
                    htmlFor="contact-category"
                  >
                    カテゴリ
                  </label>
                  <select
                    id="contact-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--text-body)]"
                    htmlFor="contact-subject"
                  >
                    件名
                  </label>
                  <input
                    id="contact-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="例: Web制作の相談をしたい"
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--text-body)]"
                    htmlFor="contact-message"
                  >
                    内容
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="できるだけ具体的に状況をご記載ください"
                    className="min-h-[160px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                  <p className="text-xs text-gray-500">
                    個人情報は必要最小限の範囲でご記載ください。
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[var(--text-body)]"
                      htmlFor="contact-name"
                    >
                      お名前
                    </label>
                    <input
                      id="contact-name"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      placeholder="例: 山田 太郎"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[var(--text-body)]"
                      htmlFor="contact-email"
                    >
                      返信用メールアドレス
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="example@email.com"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && (
                  <p className="text-sm text-green-600">
                    お問い合わせを送信しました。内容を確認のうえ順次ご連絡します。
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "送信中..." : "送信する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </FadeInSection>
    </SiteLayout>
  );
}
