"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import FadeInSection from "../../components/FadeInSection";
import SiteLayout from "../../components/layouts/SiteLayout";

const CATEGORY_OPTIONS = [
  {
    value: "general",
    label: "ご相談・ご質問",
    description: "活動や制作物について聞きたい",
  },
  {
    value: "project",
    label: "制作依頼について",
    description: "Webサイトやシステムを相談したい",
  },
  {
    value: "bug",
    label: "不具合報告",
    description: "表示や動作の問題を知らせたい",
  },
  {
    value: "other",
    label: "その他",
    description: "上記に当てはまらないご連絡",
  },
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
    <SiteLayout className="contact-page">
      <FadeInSection>
        <section id="contact" className="contact-section">
          <h1>お問い合わせ</h1>
          <p className="contact-intro">
            制作のご相談、不具合のご報告、そのほかのご質問をこちらからお送りいただけます。
          </p>

          <div className="contact-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="contact-form-card card p-0 overflow-hidden">
              <form
                onSubmit={handleSubmit}
                className="contact-form space-y-6 px-6 py-6"
              >
                <div className="contact-form-summary">
                  <p>
                    必要事項をご入力ください。内容を確認後、メールで返信します。
                  </p>
                  <div
                    className="contact-form-meta"
                    aria-label="お問い合わせのご案内"
                  >
                    <span>メールで返信</span>
                    <span>返信目安 1週間以内</span>
                  </div>
                </div>

                <fieldset className="contact-category-group">
                  <legend>
                    カテゴリ
                    <span className="contact-required">必須</span>
                  </legend>
                  <div className="contact-category-grid">
                    {CATEGORY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="contact-category-option"
                        data-selected={category === option.value}
                      >
                        <input
                          type="radio"
                          name="contact-category"
                          value={option.value}
                          checked={category === option.value}
                          onChange={(event) => setCategory(event.target.value)}
                        />
                        <span className="contact-category-option__title">
                          {option.label}
                        </span>
                        <span className="contact-category-option__description">
                          {option.description}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="contact-field">
                  <label
                    className="text-sm font-medium text-[var(--text-body)]"
                    htmlFor="contact-subject"
                  >
                    件名
                    <span className="contact-required">必須</span>
                  </label>
                  <input
                    id="contact-subject"
                    required
                    maxLength={100}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="例: MTGのご相談"
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                </div>

                <div className="contact-field">
                  <label
                    className="text-sm font-medium text-[var(--text-body)]"
                    htmlFor="contact-message"
                  >
                    内容
                    <span className="contact-required">必須</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    maxLength={2000}
                    aria-describedby="contact-message-help"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="ご相談の背景、希望納期、困っていることなどを具体的にご記載ください。"
                    className="min-h-[180px] w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                  />
                  <p id="contact-message-help" className="contact-field-help">
                    <span>
                      個人情報や機密情報は、必要最小限の範囲でご記載ください。
                    </span>
                    <span className="contact-field-count">
                      {message.length} / 2000
                    </span>
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="contact-field">
                    <label
                      className="text-sm font-medium text-[var(--text-body)]"
                      htmlFor="contact-name"
                    >
                      お名前
                      <span className="contact-optional">任意</span>
                    </label>
                    <input
                      id="contact-name"
                      autoComplete="name"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      placeholder="例: 山田 太郎"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                  </div>

                  <div className="contact-field">
                    <label
                      className="text-sm font-medium text-[var(--text-body)]"
                      htmlFor="contact-email"
                    >
                      返信用メールアドレス
                      <span className="contact-required">必須</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="example@email.com"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="contact-notice contact-notice--error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {feedback && (
                  <div
                    className="contact-notice contact-notice--success"
                    role="status"
                  >
                    {feedback}
                  </div>
                )}

                <div className="contact-submit-row">
                  <p className="contact-submit-note">
                    送信前に、メールアドレスとお問い合わせ内容をご確認ください。
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting || !canSubmit}
                    className="contact-primary-action rounded-md bg-[var(--primary-color)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "送信中..." : "内容を送信する"}
                  </button>
                </div>
              </form>
            </div>

            <aside className="contact-aside space-y-4">
              <div className="contact-guide-card card">
                <h3 className="mb-4">お問い合わせの流れ</h3>
                <ol className="contact-process">
                  <li>
                    <span>01</span>
                    <p>フォームから内容を送信します。</p>
                  </li>
                  <li>
                    <span>02</span>
                    <p>内容を確認し、返信を準備します。</p>
                  </li>
                  <li>
                    <span>03</span>
                    <p>通常1週間以内にメールで返信します。</p>
                  </li>
                </ol>
              </div>

              <div className="contact-guide-card card">
                <h3 className="mb-3">送信時のお願い</h3>
                <ul className="mb-0 list-disc space-y-2 pl-5 text-sm text-[var(--text-body)]">
                  <li>用途や希望時期があると、より具体的に回答できます。</li>
                  <li>不具合報告には、発生手順や表示内容を添えてください。</li>
                  <li>メールアドレスに誤りがないかご確認ください。</li>
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
                        className="contact-primary-action inline-flex rounded-md bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
