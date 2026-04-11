"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import {
  type CalendarColorMap,
  type CalendarEvent,
  type CalendarEventsResponse,
  enumerateDays,
  formatHeaderRange,
  formatMonthDay,
  formatTime,
  getCalendarColorStyle,
  getViewRange,
  shiftAnchor,
  startOfDay,
  toApiDateTime,
} from "../../../lib/calendar";

const WEEK_VIEW = "week" as const;

type NormalizedEvent = CalendarEvent & {
  startDate: Date;
  endDate: Date;
};

function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const startDate = event.isAllDay ? new Date(`${event.start}T00:00:00`) : new Date(event.start);
  const endDate = event.isAllDay ? new Date(`${event.end}T00:00:00`) : new Date(event.end);
  return { ...event, startDate, endDate };
}

function intersectsDay(event: NormalizedEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return event.endDate > dayStart && event.startDate < dayEnd;
}

function clipEventToDay(event: NormalizedEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return {
    start: event.startDate > dayStart ? event.startDate : dayStart,
    end: event.endDate < dayEnd ? event.endDate : dayEnd,
  };
}

function dayTimestamp(d: Date) {
  const x = startOfDay(d);
  return x.getTime();
}

function isInSelectedWeek(day: Date, rangeStart: Date, rangeEnd: Date) {
  const t = dayTimestamp(day);
  return t >= rangeStart.getTime() && t < rangeEnd.getTime();
}

function areSameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

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

function WeekPickerModal({
  open,
  anchor,
  onClose,
  onPickDay,
}: {
  open: boolean;
  anchor: Date;
  onClose: () => void;
  onPickDay: (day: Date) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));

  useEffect(() => {
    if (open) {
      setVisibleMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
  }, [open, anchor]);

  useModalBodyLock(open);

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

  const weekRange = useMemo(() => getViewRange(WEEK_VIEW, anchor), [anchor]);
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const gridDays = useMemo(() => {
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const startOffset = start.getDay() === 0 ? 6 : start.getDay() - 1;
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [visibleMonth]);

  if (!open) {
    return null;
  }

  const monthLabel = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }).format(visibleMonth);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="閉じる" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-picker-title"
        className="relative z-10 w-full max-w-md rounded-t-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,235,255,0.96))] p-4 shadow-[0_-12px_48px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:shadow-[0_24px_80px_rgba(107,70,193,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
            className="rounded-full border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
          >
            ←
          </button>
          <h2 id="week-picker-title" className="text-center text-base font-semibold text-[var(--text-heading)]">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
            className="rounded-full border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
          >
            →
          </button>
        </div>
        <p className="mb-3 text-center text-xs text-[var(--text-body)]">日付をタップすると、その日を含む週が表示されます。</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-body)]">
          {["月", "火", "水", "木", "金", "土", "日"].map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {gridDays.map((day) => {
            const inMonth = day.getMonth() === visibleMonth.getMonth();
            const inWeek = isInSelectedWeek(day, weekRange.start, weekRange.end);
            const isToday = dayTimestamp(day) === todayStart.getTime();
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onPickDay(day);
                  onClose();
                }}
                className={`flex aspect-square min-h-[2.5rem] items-center justify-center rounded-lg text-sm transition ${
                  inWeek
                    ? "bg-[var(--primary-color)] font-semibold text-white"
                    : inMonth
                      ? "border border-[var(--card-border)] bg-white/90 text-[var(--text-heading)] hover:bg-[var(--primary-light)]"
                      : "border border-transparent text-gray-400 hover:bg-white/50"
                } ${isToday && !inWeek ? "ring-2 ring-[var(--primary-color)] ring-offset-1" : ""} ${
                  isToday && inWeek ? "ring-2 ring-white/80 ring-offset-1 ring-offset-[var(--primary-color)]" : ""
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-[var(--card-border)] py-2.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--primary-light)]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function WeekTimeList({
  range,
  events,
}: {
  range: { start: Date; end: Date };
  events: NormalizedEvent[];
}) {
  const days = enumerateDays(range.start, range.end);

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayTimed: { start: Date; end: Date }[] = [];
        const dayAllDayCount = events.filter((e) => e.isAllDay && intersectsDay(e, day)).length;

        for (const event of events) {
          if (event.isAllDay) {
            continue;
          }
          if (!intersectsDay(event, day)) {
            continue;
          }
          dayTimed.push(clipEventToDay(event, day));
        }

        dayTimed.sort((a, b) => a.start.getTime() - b.start.getTime());

        const hasAny = dayAllDayCount > 0 || dayTimed.length > 0;

        return (
          <section
            key={day.toISOString()}
            className="rounded-2xl border border-[var(--card-border)] bg-white/85 p-4 sm:rounded-3xl sm:p-5"
          >
            <h3 className="border-b border-[var(--card-border)] pb-2 text-sm font-semibold text-[var(--text-heading)] sm:text-base">
              {formatMonthDay(day)}
            </h3>
            {!hasAny ? (
              <p className="mt-3 text-sm text-[var(--text-body)]">予定はありません</p>
            ) : (
              <ul className="mt-3 list-none space-y-2 text-sm text-[var(--text-heading)]">
                {Array.from({ length: dayAllDayCount }, (_, i) => (
                  <li key={`allday-${i}`} className="rounded-lg bg-[var(--primary-light)]/40 px-3 py-2 font-medium">
                    終日
                  </li>
                ))}
                {dayTimed.map((slot, i) => (
                  <li key={`${slot.start.getTime()}-${slot.end.getTime()}-${i}`} className="rounded-lg border border-[var(--card-border)] px-3 py-2">
                    {formatTime(slot.start.toISOString())} – {formatTime(slot.end.toISOString())}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CalendarAdminContent() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const range = getViewRange(WEEK_VIEW, anchor);
        const token = user ? await user.getIdToken() : "";
        const query = new URLSearchParams({
          from: toApiDateTime(range.start),
          to: toApiDateTime(range.end),
        });
        for (const calendarId of selectedCalendarIds) {
          query.append("calendarId", calendarId);
        }
        const res = await fetch(`/api/calendar/events?${query.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await res.json().catch(() => ({}))) as
          | CalendarEventsResponse
          | { error?: string };
        if (!res.ok) {
          throw new Error(body && "error" in body ? body.error || "取得に失敗しました" : "取得に失敗しました");
        }
        setData(body as CalendarEventsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchEvents();
  }, [anchor, selectedCalendarIds, user]);

  useEffect(() => {
    if (!data?.calendarIds?.length) {
      return;
    }
    setSelectedCalendarIds((current) => {
      const fallback = data.calendarIds || [];
      if (current.length > 0) {
        const next = current.filter((calendarId) => data.calendarIds?.includes(calendarId));
        return areSameStringArray(current, next) ? current : next;
      }
      return areSameStringArray(current, fallback) ? current : fallback;
    });
  }, [data?.calendarIds]);

  const events = useMemo(() => (data?.events || []).map(normalizeEvent), [data]);
  const range = useMemo(() => getViewRange(WEEK_VIEW, anchor), [anchor]);
  const allCalendarIds = data?.calendarIds || [];
  const calendarColors = data?.calendarColors || {};
  const calendarDisplayNames = data?.calendarDisplayNames || {};

  const toggleCalendarId = (calendarId: string) => {
    setSelectedCalendarIds((current) => {
      if (current.includes(calendarId)) {
        const next = current.filter((value) => value !== calendarId);
        return next.length > 0 ? next : current;
      }
      return [...current, calendarId];
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 lg:px-8">
        <Link href="/admin" className="mb-4 inline-block text-sm text-blue-800 hover:text-gray-900">
          ← ダッシュボード
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,235,255,0.92))] shadow-[0_20px_60px_rgba(107,70,193,0.12)]">
          <div className="border-b border-[var(--card-border)] px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-body)]">Google Calendar</p>
                <h1 className="mb-3 border-none pl-0">予定管理</h1>
                <p className="max-w-3xl text-sm text-[var(--text-body)]">
                  週単位で予定の時間枠だけを確認できます。カレンダーから週を選ぶと過去・未来の週も表示できます。予定の詳細表示は Google
                  カレンダーの共有設定に従います。
                </p>
              </div>
              <Link
                href="/admin/calendar/settings"
                className="rounded-full border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                設定
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[var(--card-border)] bg-white/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(WEEK_VIEW, anchor, -1))}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                前の週
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                今週
              </button>
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(WEEK_VIEW, anchor, 1))}
                className="rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
              >
                次の週
              </button>
              <button
                type="button"
                onClick={() => setWeekPickerOpen(true)}
                className="rounded-full bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
              >
                週を選択
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="text-sm font-semibold text-[var(--text-heading)]">{formatHeaderRange(WEEK_VIEW, anchor)}</p>
              <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs text-[var(--text-heading)]">{events.length} 件</span>
            </div>
          </div>

          <div className="px-3 py-4 sm:px-5 sm:py-6">
            {allCalendarIds.length > 0 ? (
              <section className="mb-5 rounded-2xl border border-[var(--card-border)] bg-white/85 p-3 sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="my-0 border-none pl-0 text-base sm:text-lg">表示カレンダー</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-body)] sm:mt-2 sm:text-sm">
                      選択中のカレンダーだけを backend から取得します。最低 1 件は選択されたままです。
                    </p>
                  </div>
                  <p className="shrink-0 rounded-full bg-[var(--primary-light)] px-3 py-1 text-center text-xs text-[var(--text-heading)] sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:text-[var(--text-body)]">
                    {selectedCalendarIds.length} / {allCalendarIds.length}
                  </p>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] sm:mt-4 sm:flex-wrap sm:overflow-visible">
                  {allCalendarIds.map((calendarId) => {
                    const active = selectedCalendarIds.includes(calendarId);
                    const style = getCalendarColorStyle(calendarColors[calendarId]);
                    return (
                      <button
                        key={calendarId}
                        type="button"
                        onClick={() => toggleCalendarId(calendarId)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition sm:rounded-full ${
                          active
                            ? "border-transparent"
                            : "border-[var(--card-border)] bg-white text-[var(--text-body)]"
                        }`}
                        style={active ? style : undefined}
                      >
                        <span className="line-clamp-2 max-w-[14rem] sm:line-clamp-none sm:max-w-none">
                          {calendarDisplayNames[calendarId] || calendarId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {loading ? (
              <div className="rounded-2xl bg-white/85 p-8 text-center text-[var(--text-body)]">読み込み中...</div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
            ) : (
              <WeekTimeList range={range} events={events} />
            )}
          </div>
        </section>
      </main>

      <WeekPickerModal
        open={weekPickerOpen}
        anchor={anchor}
        onClose={() => setWeekPickerOpen(false)}
        onPickDay={(day) => setAnchor(day)}
      />
    </div>
  );
}

export default function CalendarAdminPage() {
  return (
    <ProtectedRoute>
      <CalendarAdminContent />
    </ProtectedRoute>
  );
}
