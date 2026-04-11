"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { useAuth } from "../../../lib/auth/AuthContext";
import {
  type CalendarColorMap,
  type CalendarDisplayNameMap,
  type CalendarEvent,
  type CalendarEventsResponse,
  type CalendarView,
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

const VIEWS: CalendarView[] = ["day", "week", "month", "year"];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 56;

function CalendarAdminContent() {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const range = getViewRange(view, anchor);
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
  }, [anchor, selectedCalendarIds, user, view]);

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
  const range = useMemo(() => getViewRange(view, anchor), [anchor, view]);
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
                  表示範囲と選択中のカレンダーだけを backend から取得します。色やラベルの変更は設定画面で行います。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {VIEWS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      view === item
                        ? "bg-[var(--primary-color)] text-white"
                        : "bg-white text-[var(--text-body)] hover:bg-[var(--primary-light)]"
                    }`}
                  >
                    {item === "day" ? "日" : item === "week" ? "週" : item === "month" ? "月" : "年"}
                  </button>
                ))}
                <Link
                  href="/admin/calendar/settings"
                  className="rounded-full border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--primary-light)]"
                >
                  設定
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] bg-white/70 px-5 py-3 sm:px-8">
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
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[var(--text-heading)]">{formatHeaderRange(view, anchor)}</p>
              <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs text-[var(--text-heading)]">
                {events.length} events
              </span>
            </div>
          </div>

          <div className="px-3 py-4 sm:px-5 sm:py-6">
            {allCalendarIds.length > 0 ? (
              <section className="mb-5 rounded-3xl border border-[var(--card-border)] bg-white/85 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="my-0 border-none pl-0 text-lg">表示カレンダー</h2>
                    <p className="mt-2 text-sm text-[var(--text-body)]">
                      選択中のカレンダーだけを backend から取得します。最低 1 件は選択されたままです。
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-body)]">
                    {selectedCalendarIds.length} / {allCalendarIds.length} calendars
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {allCalendarIds.map((calendarId) => {
                    const active = selectedCalendarIds.includes(calendarId);
                    const style = getCalendarColorStyle(calendarColors[calendarId]);
                    return (
                      <button
                        key={calendarId}
                        type="button"
                        onClick={() => toggleCalendarId(calendarId)}
                        className={`rounded-full border px-3 py-2 text-xs transition ${
                          active
                            ? "border-transparent"
                            : "border-[var(--card-border)] bg-white text-[var(--text-body)]"
                        }`}
                        style={active ? style : undefined}
                      >
                        {calendarDisplayNames[calendarId] || calendarId}
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
            ) : view === "day" || view === "week" ? (
              <DayWeekView
                view={view}
                range={range}
                events={events}
                calendarColors={calendarColors}
                calendarDisplayNames={calendarDisplayNames}
              />
            ) : view === "month" ? (
              <MonthView events={events} anchor={anchor} calendarColors={calendarColors} calendarDisplayNames={calendarDisplayNames} />
            ) : (
              <YearView events={events} anchor={anchor} calendarColors={calendarColors} calendarDisplayNames={calendarDisplayNames} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

type NormalizedEvent = CalendarEvent & {
  startDate: Date;
  endDate: Date;
};

function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const startDate = event.isAllDay ? new Date(`${event.start}T00:00:00`) : new Date(event.start);
  const endDate = event.isAllDay ? new Date(`${event.end}T00:00:00`) : new Date(event.end);
  return { ...event, startDate, endDate };
}

function DayWeekView({
  view,
  range,
  events,
  calendarColors,
  calendarDisplayNames,
}: {
  view: "day" | "week";
  range: { start: Date; end: Date };
  events: NormalizedEvent[];
  calendarColors: CalendarColorMap;
  calendarDisplayNames: CalendarDisplayNameMap;
}) {
  const days = enumerateDays(range.start, range.end);
  const allDayEvents = events.filter((event) => event.isAllDay);
  const timedEvents = events.filter((event) => !event.isAllDay);

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="rounded-2xl bg-white/80 px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-body)]">
              {new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(day)}
            </p>
            <p className="text-sm font-semibold text-[var(--text-heading)]">{formatMonthDay(day)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-body)]">All day</div>
        {days.map((day) => (
          <div key={day.toISOString()} className="min-h-16 rounded-2xl border border-[var(--card-border)] bg-white/80 p-2">
            <div className="space-y-2">
              {allDayEvents
                .filter((event) => intersectsDay(event, day))
                .map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink || undefined}
                    target={event.htmlLink ? "_blank" : undefined}
                    rel={event.htmlLink ? "noreferrer" : undefined}
                    className="block rounded-xl border px-3 py-2 text-xs hover:opacity-90"
                    style={getCalendarColorStyle(calendarColors[event.calendarId || ""])}
                  >
                    <p className="font-semibold">{event.summary || "予定あり"}</p>
                    {event.calendarId ? (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--text-body)]">
                        {calendarDisplayNames[event.calendarId] || event.calendarId}
                      </p>
                    ) : null}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] gap-3" style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-dashed border-[var(--card-border)] text-xs text-[var(--text-body)]"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                <span className="-translate-y-1/2 rounded bg-gray-100 px-1">{`${hour.toString().padStart(2, "0")}:00`}</span>
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="relative rounded-3xl border border-[var(--card-border)] bg-white/85"
              style={{ height: HOURS.length * HOUR_HEIGHT }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-dashed border-[var(--card-border)]"
                  style={{ top: hour * HOUR_HEIGHT }}
                />
              ))}
              {timedEvents
                .filter((event) => intersectsDay(event, day))
                .map((event) => {
                  const clipped = clipEventToDay(event, day);
                  const top = (clipped.start.getHours() + clipped.start.getMinutes() / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    36,
                    ((clipped.end.getTime() - clipped.start.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT,
                  );
                  return (
                    <a
                      key={`${event.id}-${day.toISOString()}`}
                      href={event.htmlLink || undefined}
                      target={event.htmlLink ? "_blank" : undefined}
                      rel={event.htmlLink ? "noreferrer" : undefined}
                      className="absolute left-2 right-2 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm"
                      style={{ top, height, ...getCalendarColorStyle(calendarColors[event.calendarId || ""]) }}
                    >
                      <p className="text-xs font-semibold text-[var(--text-heading)]">{event.summary || "予定"}</p>
                      {event.calendarId ? (
                        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--text-body)]">
                          {calendarDisplayNames[event.calendarId] || event.calendarId}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-[var(--text-body)]">
                        {formatTime(clipped.start.toISOString())} - {formatTime(clipped.end.toISOString())}
                      </p>
                    </a>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  anchor,
  events,
  calendarColors,
  calendarDisplayNames,
}: {
  anchor: Date;
  events: NormalizedEvent[];
  calendarColors: CalendarColorMap;
  calendarDisplayNames: CalendarDisplayNameMap;
}) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const startOffset = start.getDay() === 0 ? 6 : start.getDay() - 1;
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  return (
    <div className="grid grid-cols-7 gap-3">
      {["月", "火", "水", "木", "金", "土", "日"].map((label) => (
        <div key={label} className="px-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-body)]">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = events.filter((event) => intersectsDay(event, day));
        const inMonth = day >= start && day < end;
        return (
          <div
            key={day.toISOString()}
            className={`min-h-40 rounded-2xl border p-3 ${inMonth ? "border-[var(--card-border)] bg-white/85" : "border-transparent bg-white/30"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className={`text-sm font-semibold ${inMonth ? "text-[var(--text-heading)]" : "text-gray-400"}`}>{day.getDate()}</p>
              {dayEvents.length > 0 ? (
                <span className="rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] text-[var(--text-heading)]">
                  {dayEvents.length}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {dayEvents.slice(0, 4).map((event) => (
                <a
                  key={event.id}
                  href={event.htmlLink || undefined}
                  target={event.htmlLink ? "_blank" : undefined}
                  rel={event.htmlLink ? "noreferrer" : undefined}
                  className="block rounded-xl border px-3 py-2 text-xs"
                  style={getCalendarColorStyle(calendarColors[event.calendarId || ""])}
                >
                  <p className="line-clamp-1 font-semibold">{event.summary || "予定"}</p>
                  <p className="mt-1 line-clamp-1 text-[10px] text-[var(--text-body)]">
                    {event.calendarId ? calendarDisplayNames[event.calendarId] || event.calendarId : ""}
                  </p>
                  {!event.isAllDay ? (
                    <p className="mt-1 text-[10px] text-[var(--text-body)]">{formatTime(event.startDate.toISOString())}</p>
                  ) : null}
                </a>
              ))}
              {dayEvents.length > 4 ? <p className="px-1 text-xs text-[var(--text-body)]">+{dayEvents.length - 4} 件</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearView({
  anchor,
  events,
  calendarColors,
  calendarDisplayNames: _calendarDisplayNames,
}: {
  anchor: Date;
  events: NormalizedEvent[];
  calendarColors: CalendarColorMap;
  calendarDisplayNames: CalendarDisplayNameMap;
}) {
  const year = anchor.getFullYear();
  const months = Array.from({ length: 12 }, (_, monthIndex) => new Date(year, monthIndex, 1));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {months.map((month) => {
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const days = enumerateDays(monthStart, monthEnd);
        return (
          <section key={month.toISOString()} className="rounded-3xl border border-[var(--card-border)] bg-white/85 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="my-0 border-none pl-0 text-xl">
                {new Intl.DateTimeFormat("ja-JP", { month: "long" }).format(month)}
              </h2>
              <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs text-[var(--text-heading)]">
                {events.filter((event) => event.startDate >= monthStart && event.startDate < monthEnd).length} 件
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayEvents = events.filter((event) => intersectsDay(event, day));
                const count = dayEvents.length;
                const color = dayEvents[0]?.calendarId ? calendarColors[dayEvents[0].calendarId] : undefined;
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square rounded-lg border text-center text-[11px] leading-[2.1rem] ${
                      count > 0 ? "" : "border-[var(--card-border)] bg-white text-[var(--text-body)]"
                    }`}
                    style={count > 0 ? getCalendarColorStyle(color) : undefined}
                    title={`${formatMonthDay(day)}: ${count}件`}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
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

function areSameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export default function CalendarAdminPage() {
  return (
    <ProtectedRoute>
      <CalendarAdminContent />
    </ProtectedRoute>
  );
}
