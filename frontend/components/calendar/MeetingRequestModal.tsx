"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type CalendarBusyEvent,
  getFreeSlotsInDisplayRange,
  MTG_DURATION_OPTIONS_MINUTES,
} from "../../lib/calendarAvailability";

function useModalBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

const DURATION_LABEL: Record<(typeof MTG_DURATION_OPTIONS_MINUTES)[number], string> = {
  30: "30分",
  60: "1時間",
  90: "1.5時間",
  120: "2時間",
  180: "3時間",
};

/** リストボックスの表示行数（超えるとセレクト内でスクロール） */
const DURATION_SELECT_ROWS = 5;
const SLOT_SELECT_MAX_VISIBLE_ROWS = 12;

function formatSlotRange(start: Date, end: Date) {
  const dFmt = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const tFmt = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dFmt.format(start)} ${tFmt.format(start)} 〜 ${tFmt.format(end)}`;
}

function nearestSlotIndex(slots: { start: Date }[], hint: Date): number {
  if (slots.length === 0) {
    return 0;
  }
  const t = hint.getTime();
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const d = Math.abs(slots[i].start.getTime() - t);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

type MeetingRequestModalProps = {
  open: boolean;
  onClose: () => void;
  day: Date | null;
  preferredHint: Date | null;
  timedEvents: CalendarBusyEvent[];
  allDayEvents: CalendarBusyEvent[];
  displayStartHour: number;
  displayEndHour: number;
};

export default function MeetingRequestModal({
  open,
  onClose,
  day,
  preferredHint,
  timedEvents,
  allDayEvents,
  displayStartHour,
  displayEndHour,
}: MeetingRequestModalProps) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hintKey = preferredHint?.getTime() ?? 0;

  const availableSlots = useMemo(
    () =>
      day
        ? getFreeSlotsInDisplayRange(
            day,
            timedEvents,
            allDayEvents,
            durationMinutes,
            displayStartHour,
            displayEndHour,
          )
        : [],
    [day, timedEvents, allDayEvents, durationMinutes, displayStartHour, displayEndHour],
  );

  const slotsKey = useMemo(
    () => availableSlots.map((s) => s.start.getTime()).join(","),
    [availableSlots],
  );

  useModalBodyLock(open);

  useEffect(() => {
    if (!open) {
      setContactName("");
      setContactEmail("");
      setMessage("");
      setError(null);
      setDone(false);
      setSubmitting(false);
      setSelectedIndex(0);
      setDurationMinutes(60);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !day) {
      return;
    }
    const slots60 = getFreeSlotsInDisplayRange(
      day,
      timedEvents,
      allDayEvents,
      60,
      displayStartHour,
      displayEndHour,
    );
    if (slots60.length > 0) {
      setDurationMinutes(60);
      return;
    }
    const first = MTG_DURATION_OPTIONS_MINUTES.find(
      (d) =>
        getFreeSlotsInDisplayRange(day, timedEvents, allDayEvents, d, displayStartHour, displayEndHour).length > 0,
    );
    if (first !== undefined) {
      setDurationMinutes(first);
    }
  }, [open, day, timedEvents, allDayEvents, displayStartHour, displayEndHour]);

  useEffect(() => {
    if (!open || availableSlots.length === 0) {
      return;
    }
    const hint = preferredHint ?? availableSlots[0].start;
    setSelectedIndex(nearestSlotIndex(availableSlots, hint));
  }, [open, slotsKey, hintKey, availableSlots, preferredHint]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !day) {
    return null;
  }

  const safeIndex = Math.min(selectedIndex, Math.max(0, availableSlots.length - 1));
  const slotStart = availableSlots[safeIndex]?.start;
  const slotEnd = availableSlots[safeIndex]?.end;
  const rangeLabel =
    slotStart && slotEnd ? formatSlotRange(slotStart, slotEnd) : "";
  const subject = slotStart && slotEnd ? `MTG依頼（${rangeLabel}）` : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contactEmail.trim()) {
      setError("メールアドレスは必須です");
      return;
    }
    if (!slotStart || !slotEnd) {
      setError("希望日時を選べません。この長さでは表示時間内に空きがありません。");
      return;
    }
    const bodyText = [
      `【希望日時】`,
      rangeLabel,
      ``,
      `【追加メッセージ】`,
      message.trim() || "（なし）",
    ].join("\n");

    try {
      setSubmitting(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "mtg",
          subject,
          message: bodyText,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "送信に失敗しました");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const titleId = "meeting-request-modal-title";
  const canSubmit = availableSlots.length > 0 && Boolean(slotStart && slotEnd);

  const slotSelectSize =
    availableSlots.length <= 1
      ? 1
      : Math.min(SLOT_SELECT_MAX_VISIBLE_ROWS, availableSlots.length);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="閉じる" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-[min(100%,26rem)] flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,235,255,0.96))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)] sm:max-h-[min(88vh,920px)] sm:rounded-[2rem] sm:shadow-[0_24px_80px_rgba(107,70,193,0.18)] md:max-w-[min(100%,48rem)] md:max-h-[min(90vh,720px)]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="relative shrink-0 border-b border-[var(--card-border)] px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-2 text-[var(--text-body)] hover:bg-[var(--primary-light)] sm:right-4 sm:top-4"
              aria-label="閉じる"
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
            </button>
            <h2 id={titleId} className="pr-10 text-base font-semibold text-[var(--text-heading)] sm:text-lg">
              打ち合わせの依頼
            </h2>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              カレンダーに表示している時間帯の範囲だけから、長さと開始時刻を選べます。
            </p>
          </header>

          {done ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <p className="text-sm text-[var(--text-heading)]">
                送信しました。内容を確認のうえ、メールにてご連絡します。
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-full bg-[var(--primary-color)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
              >
                閉じる
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
                <div className="flex flex-col gap-0 md:flex-row md:items-stretch md:gap-8">
                  <section
                    aria-labelledby="mtg-schedule-heading"
                    className="flex min-h-0 min-w-0 flex-1 flex-col md:basis-0"
                  >
                    <h3 id="mtg-schedule-heading" className="sr-only">
                      日時の選択
                    </h3>
                    <label className="block text-sm font-medium text-[var(--text-heading)]" htmlFor="mtg-duration">
                      打ち合わせの長さ
                    </label>
                    <div className="mt-2 max-h-[min(30vh,12rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--card-border)] bg-white [-webkit-overflow-scrolling:touch] md:max-h-[min(40vh,14rem)]">
                      <select
                        id="mtg-duration"
                        size={DURATION_SELECT_ROWS}
                        value={durationMinutes}
                        onChange={(ev) => setDurationMinutes(Number(ev.target.value))}
                        className="w-full border-0 bg-transparent px-3 py-1.5 text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/35 focus:ring-inset"
                      >
                        {MTG_DURATION_OPTIONS_MINUTES.map((m) => (
                          <option key={m} value={m}>
                            {DURATION_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="mt-4 block text-sm font-medium text-[var(--text-heading)]" htmlFor="mtg-slot">
                      希望の開始〜終了
                    </label>
                    <p className="mt-1 text-xs text-[var(--text-body)]">
                      表示中の時間帯に収まり、予定と重ならない候補だけが並びます（開始は30分刻み）。
                    </p>
                    {availableSlots.length > 0 ? (
                      <div className="mt-2 max-h-[min(40vh,16rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--card-border)] bg-white [-webkit-overflow-scrolling:touch] md:max-h-[min(50vh,22rem)]">
                        <select
                          id="mtg-slot"
                          size={slotSelectSize}
                          value={safeIndex}
                          onChange={(ev) => setSelectedIndex(Number(ev.target.value))}
                          className="w-full min-w-0 border-0 bg-transparent px-3 py-1.5 text-sm text-[var(--text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/35 focus:ring-inset"
                        >
                          {availableSlots.map((s, i) => (
                            <option key={s.start.getTime()} value={i}>
                              {formatSlotRange(s.start, s.end)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="mt-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                        この長さでは、表示時間内に空きがありません。別の長さを選ぶか、別の日をご検討ください。
                      </p>
                    )}
                  </section>

                  <section
                    aria-labelledby="mtg-contact-heading"
                    className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col border-t border-[var(--card-border)] pt-6 md:mt-0 md:basis-0 md:border-l md:border-t-0 md:pl-8 md:pt-0"
                  >
                    <h3 id="mtg-contact-heading" className="sr-only">
                      お名前・連絡先・内容
                    </h3>
                    <label className="block text-sm font-medium text-[var(--text-heading)]" htmlFor="mtg-name">
                      お名前
                    </label>
                    <input
                      id="mtg-name"
                      type="text"
                      value={contactName}
                      onChange={(ev) => setContactName(ev.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm"
                      autoComplete="name"
                    />

                    <label className="mt-4 block text-sm font-medium text-[var(--text-heading)]" htmlFor="mtg-email">
                      メールアドレス <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="mtg-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(ev) => setContactEmail(ev.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm"
                      autoComplete="email"
                    />

                    <label className="mt-4 block text-sm font-medium text-[var(--text-heading)]" htmlFor="mtg-msg">
                      ご用件・メモ
                    </label>
                    <textarea
                      id="mtg-msg"
                      rows={4}
                      value={message}
                      onChange={(ev) => setMessage(ev.target.value)}
                      placeholder="議題やご希望があればご記入ください"
                      className="mt-1 min-h-[6rem] w-full resize-y rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm md:min-h-[7.5rem]"
                    />
                  </section>
                </div>

                {error ? <p className="mt-4 text-sm text-red-600 md:mt-6">{error}</p> : null}
              </div>
              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[var(--card-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-heading)] hover:bg-[var(--primary-light)]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="rounded-full bg-[var(--primary-color)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? "送信中…" : "送信する"}
                </button>
              </footer>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
