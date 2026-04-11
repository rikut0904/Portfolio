"use client";

import { useEffect, useState } from "react";
import SiteLayout from "../../components/layouts/SiteLayout";
import {
  type CalendarAvailabilityResponse,
  type CalendarView,
  formatHeaderRange,
  formatMonthDay,
  formatTime,
  getViewRange,
  shiftAnchor,
  toApiDateTime,
} from "../../lib/calendar";

const PUBLIC_VIEWS: CalendarView[] = ["day", "week", "month"];

export default function AvailabilityPage() {
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<CalendarAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError("");
      try {
        const range = getViewRange(view, anchor);
        const res = await fetch(
          `/api/calendar/availability?from=${encodeURIComponent(toApiDateTime(range.start))}&to=${encodeURIComponent(toApiDateTime(range.end))}`,
        );
        const body = (await res.json().catch(() => ({}))) as
          | CalendarAvailabilityResponse
          | { error?: string };
        if (!res.ok) {
          throw new Error(body && "error" in body ? body.error || "取得に失敗しました" : "取得に失敗しました");
        }
        setData(body as CalendarAvailabilityResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchAvailability();
  }, [anchor, view]);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(245,235,255,0.96))] px-6 py-8 shadow-[0_24px_80px_rgba(107,70,193,0.12)]">
        <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-[rgba(107,70,193,0.12)] blur-3xl" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-body)]">
                Availability
              </p>
              <h1 className="mb-3 border-none pl-0">空いている時間</h1>
              <p className="max-w-2xl text-[var(--text-body)]">
                Google カレンダーから予定を読み込み、空き時間だけをまとめて表示しています。打ち合わせや相談の候補確認に使えます。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PUBLIC_VIEWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    view === item
                      ? "bg-[var(--primary-color)] text-white"
                      : "bg-white/80 text-[var(--text-body)] hover:bg-white"
                  }`}
                >
                  {item === "day" ? "日" : item === "week" ? "週" : "月"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-white/75 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                前へ
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                今日
              </button>
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                次へ
              </button>
            </div>
            <p className="text-sm font-medium text-[var(--text-heading)]">
              {formatHeaderRange(view, anchor)}
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-white/80 p-8 text-center text-[var(--text-body)]">
              読み込み中...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              {error}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data?.days.map((day) => (
                <article
                  key={day.date}
                  className="rounded-2xl border border-[var(--card-border)] bg-white/85 p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-body)]">
                        {day.weekday}
                      </p>
                      <h2 className="my-1 border-none pl-0 text-2xl">
                        {formatMonthDay(new Date(`${day.date}T00:00:00`))}
                      </h2>
                    </div>
                    <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs text-[var(--text-heading)]">
                      {day.freeSlots.length} slots
                    </span>
                  </div>
                  {day.freeSlots.length === 0 ? (
                    <p className="rounded-xl bg-[var(--primary-light)] px-4 py-6 text-sm text-[var(--text-body)]">
                      この日は空き時間がありません。
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {day.freeSlots.map((slot) => (
                        <div
                          key={`${slot.start}-${slot.end}`}
                          className="rounded-xl border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,235,255,0.9))] px-4 py-3"
                        >
                          <p className="text-sm font-semibold text-[var(--text-heading)]">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-body)]">
                            相談や打ち合わせ候補として利用できます。
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
