"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import FadeInSection from "../../components/FadeInSection";
import SiteLayout from "../../components/layouts/SiteLayout";

const CATEGORY_OPTIONS = [
  { value: "general", label: "ご相談・ご質問" },
  { value: "project", label: "制作依頼について" },
  { value: "bug", label: "不具合報告" },
  { value: "other", label: "その他" },
];

const SUPPORT_GUIDANCE_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_GUIDANCE_EMAIL || "";

export default function ContactPage() {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [threadPath, setThreadPath] = useState("");

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
    setFeedback(null);
    setIsComplete(false);
    setThreadPath("");

    if (!canSubmit) {
      setError("件名・内容・メールアドレスは必須です");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/contact", {
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

      const data = (await response.json().catch(() => ({}))) as {
        threadId?: string;
      };

      setFeedback(
        "お問い合わせを送信しました。内容を確認のうえ、順次メールでご連絡します。",
      );
      setIsComplete(true);
      if (data.threadId) {
        setThreadPath(`/contact/${data.threadId}`);
      }
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="card p-0 overflow-hidden">
              <div className="border-b border-[var(--card-border)] bg-[var(--primary-light)] px-6 py-5">
                <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-[var(--text-heading)] uppercase">
                  Contact
                </p>
                <h2 className="mb-2 border-none p-0 text-2xl">
                  ご相談内容を直接お送りください
                </h2>
                <p className="mb-0 text-sm text-[var(--text-body)]">
                  内容を確認後、通常1週間以内を目安に返信します。
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
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
                    placeholder="例: MTGのご相談"
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
                    placeholder="ご相談の背景、希望納期、困っていることなどを具体的にご記載ください。"
                    className="min-h-[180px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                  <p className="mb-0 text-xs text-gray-500">
                    個人情報や機密情報は、必要最小限の範囲でご記載ください。
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

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {feedback && (
                  <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {feedback}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-[var(--primary-color)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "送信中..." : "送信する"}
                  </button>
                </div>
              </form>
            </div>

            <aside className="space-y-4">
              <div className="card">
                <h3 className="mb-3">返信の目安</h3>
                <p className="text-sm">
                  内容を確認後、通常1週間以内にメールで返信します。営業日や内容によっては前後する場合があります。
                </p>
              </div>

              <div className="card">
                <h3 className="mb-3">送信時のお願い</h3>
                <ul className="mb-0 list-disc space-y-2 pl-5 text-sm text-[var(--text-body)]">
                  <li>
                    制作のご相談は、用途や希望時期があると回答しやすくなります。
                  </li>
                  <li>
                    不具合報告は、発生手順や表示メッセージを添えてください。
                  </li>
                  <li>返信先メールアドレスに誤りがあると返答できません。</li>
                </ul>
              </div>

              {isComplete && (
                <div className="card border border-[var(--primary-color)]">
                  <h3 className="mb-3">受付完了</h3>
                  <p className="text-sm">
                    {contactEmail || "入力いただいたメールアドレス"}
                    宛てに返信します。
                  </p>
                  <p className="mb-0 text-sm">
                    1週間を過ぎても返信がない場合
                    {SUPPORT_GUIDANCE_EMAIL
                      ? `は、${SUPPORT_GUIDANCE_EMAIL} までご連絡ください。`
                      : "は、メールアドレスの入力内容をご確認のうえ再送してください。"}
                  </p>
                  {threadPath && (
                    <div className="mt-4">
                      <Link
                        href={threadPath}
                        className="inline-flex rounded-md bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        お問い合わせスレッドを確認する
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </section>
      </FadeInSection>
    </SiteLayout>
  );
}
