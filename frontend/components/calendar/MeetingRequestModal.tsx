"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const DURATION_LABEL: Record<
  (typeof MTG_DURATION_OPTIONS_MINUTES)[number],
  string
> = {
  30: "30分",
  60: "1時間",
  90: "1.5時間",
};

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
  const [customDurationHours, setCustomDurationHours] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    [
      day,
      timedEvents,
      allDayEvents,
      durationMinutes,
      displayStartHour,
      displayEndHour,
    ],
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
      setCustomDurationHours("");
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
        getFreeSlotsInDisplayRange(
          day,
          timedEvents,
          allDayEvents,
          d,
          displayStartHour,
          displayEndHour,
        ).length > 0,
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
    const onKey = (e: globalThis.KeyboardEvent) => {
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

  const safeIndex = Math.min(
    selectedIndex,
    Math.max(0, availableSlots.length - 1),
  );
  const slotStart = availableSlots[safeIndex]?.start;
  const slotEnd = availableSlots[safeIndex]?.end;
  const rangeLabel =
    slotStart && slotEnd ? formatSlotRange(slotStart, slotEnd) : "";
  const subject = slotStart && slotEnd ? `MTG依頼（${rangeLabel}）` : "";

  const moveToSlot = (index: number) => {
    setSelectedIndex(index);
    requestAnimationFrame(() => slotRefs.current[index]?.focus());
  };

  const handleSlotKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (availableSlots.length === 0) {
      return;
    }

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = Math.min(index + 1, availableSlots.length - 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = availableSlots.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setSelectedIndex(index);
        return;
      default:
        return;
    }

    event.preventDefault();
    if (nextIndex !== null) {
      moveToSlot(nextIndex);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contactEmail.trim()) {
      setError("メールアドレスは必須です");
      return;
    }
    if (!slotStart || !slotEnd) {
      setError(
        "希望日時を選べません。この長さでは表示時間内に空きがありません。",
      );
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
          requestedStart: slotStart.toISOString(),
          requestedEnd: slotEnd.toISOString(),
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
  const isCustomDuration = customDurationHours !== "";

  const handleCustomDurationChange = (value: string) => {
    setCustomDurationHours(value);
    const hours = Number(value);
    if (Number.isFinite(hours) && hours >= 0.5 && hours <= 8) {
      setDurationMinutes(Math.round(hours * 60));
      return;
    }
    setDurationMinutes(0);
  };

  return (
    <div className="meeting-request-overlay fixed inset-0 z-[100] flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="meeting-request-panel relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-[min(100%,26rem)] flex-col overflow-hidden sm:max-h-[min(88vh,920px)] md:max-w-[min(100%,48rem)] md:max-h-[min(90vh,720px)]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="meeting-request-header relative shrink-0 px-4 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
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
            <h2
              id={titleId}
              className="pr-10 text-base font-semibold text-[var(--text-heading)] sm:text-lg"
            >
              打ち合わせの依頼
            </h2>
            <p className="meeting-request-subtitle mt-2 text-sm text-[var(--text-body)]">
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
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="meeting-request-body min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
                <div className="flex flex-col gap-0 md:flex-row md:items-stretch md:gap-8">
                  <section
                    aria-labelledby="mtg-schedule-heading"
                    className="meeting-request-section flex min-h-0 min-w-0 flex-1 flex-col md:basis-0"
                  >
                    <h3 id="mtg-schedule-heading" className="sr-only">
                      打ち合わせ日時
                    </h3>
                    <div className="meeting-request-label">
                      打ち合わせの長さ
                    </div>
                    <div
                      className="meeting-request-duration-grid mt-2"
                      aria-label="打ち合わせの長さ"
                    >
                      {MTG_DURATION_OPTIONS_MINUTES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="meeting-request-choice"
                          data-selected={
                            !isCustomDuration && durationMinutes === m
                          }
                          aria-pressed={
                            !isCustomDuration && durationMinutes === m
                          }
                          onClick={() => {
                            setCustomDurationHours("");
                            setDurationMinutes(m);
                          }}
                        >
                          {DURATION_LABEL[m]}
                        </button>
                      ))}
                    </div>
                    <label className="meeting-request-custom-duration mt-2">
                      <span>任意の長さ</span>
                      <span className="meeting-request-custom-duration__input">
                        <input
                          type="number"
                          min="0.5"
                          max="8"
                          step="0.5"
                          value={customDurationHours}
                          onChange={(event) =>
                            handleCustomDurationChange(event.target.value)
                          }
                          placeholder="例: 2"
                          aria-label="任意の打ち合わせ時間（時間）"
                        />
                        <span>時間</span>
                      </span>
                    </label>

                    <div className="meeting-request-label mt-5">
                      希望の開始〜終了
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-body)]">
                      表示中の時間帯に収まり、予定と重ならない候補だけが並びます（開始は30分刻み）。
                    </p>
                    {availableSlots.length > 0 ? (
                      <div
                        className="meeting-request-slot-list mt-2"
                        role="listbox"
                        aria-label="希望の開始時刻"
                      >
                        {availableSlots.map((s, i) => (
                          <button
                            key={s.start.getTime()}
                            type="button"
                            role="option"
                            tabIndex={safeIndex === i ? 0 : -1}
                            aria-selected={safeIndex === i}
                            className="meeting-request-slot"
                            data-selected={safeIndex === i}
                            ref={(element) => {
                              slotRefs.current[i] = element;
                            }}
                            onClick={() => setSelectedIndex(i)}
                            onKeyDown={(event) => handleSlotKeyDown(event, i)}
                          >
                            <span>{formatSlotRange(s.start, s.end)}</span>
                            <span className="meeting-request-slot__mark">
                              {safeIndex === i ? "選択中" : "選択"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                        この長さでは、表示時間内に空きがありません。別の長さを選ぶか、別の日をご検討ください。
                      </p>
                    )}
                  </section>

                  <section
                    aria-labelledby="mtg-contact-heading"
                    className="meeting-request-section mt-6 flex min-h-0 min-w-0 flex-1 flex-col border-t border-[var(--card-border)] pt-6 md:mt-0 md:basis-0 md:border-l md:border-t-0 md:pl-8 md:pt-0"
                  >
                    <h3 id="mtg-contact-heading" className="sr-only">
                      連絡先
                    </h3>
                    {rangeLabel ? (
                      <div className="meeting-request-selection mt-4 mb-4">
                        <span>選択中の候補</span>
                        <strong>{rangeLabel}</strong>
                      </div>
                    ) : null}
                    <label
                      className="block text-sm font-medium text-[var(--text-heading)]"
                      htmlFor="mtg-name"
                    >
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

                    <label
                      className="mt-4 block text-sm font-medium text-[var(--text-heading)]"
                      htmlFor="mtg-email"
                    >
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

                    <label
                      className="mt-4 block text-sm font-medium text-[var(--text-heading)]"
                      htmlFor="mtg-msg"
                    >
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

                {error ? (
                  <p className="mt-4 text-sm text-red-600 md:mt-6">{error}</p>
                ) : null}
              </div>
              <footer className="meeting-request-footer flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-7 sm:py-4">
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
