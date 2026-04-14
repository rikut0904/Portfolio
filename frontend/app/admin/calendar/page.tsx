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
  type CalendarPreferencesResponse,
  enumerateDays,
  formatHeaderRange,
  formatMonthDay,
  getCalendarColorStyle,
  getViewRange,
  isSameDay,
  shiftAnchor,
  startOfDay,
  toApiDateTime,
} from "../../../lib/calendar";

const WEEK_VIEW = "week" as const;
/** 1日の表示範囲 00:00〜24:00（24時間分の高さ） */
const DAY_HOURS = 24;
const HOURS = Array.from({ length: DAY_HOURS }, (_, index) => index);
const HOUR_HEIGHT = 56;
const DAY_GRID_HEIGHT = DAY_HOURS * HOUR_HEIGHT;

type NormalizedEvent = CalendarEvent & {
  startDate: Date;
  endDate: Date;
};

function normalizeEvent(event: CalendarEvent): NormalizedEvent {
  const startDate = event.isAllDay ? new Date(`${event.start}T00:00:00`) : new Date(event.start);
  const endDate = event.isAllDay ? new Date(`${event.end}T00:00:00`) : new Date(event.end);
  return { ...event, startDate, endDate };
}

function formatEventScheduleText(event: NormalizedEvent): string {
  const fmtD = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const fmtT = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" });
  if (event.isAllDay) {
    const startStr = fmtD.format(event.startDate);
    const lastDay = new Date(event.endDate);
    lastDay.setDate(lastDay.getDate() - 1);
    const endStr = fmtD.format(lastDay);
    if (startStr === endStr) {
      return `${startStr}（終日）`;
    }
    return `${startStr} 〜 ${endStr}（終日）`;
  }
  if (isSameDay(event.startDate, event.endDate)) {
    return `${fmtD.format(event.startDate)} ${fmtT.format(event.startDate)} 〜 ${fmtT.format(event.endDate)}`;
  }
  return `${fmtD.format(event.startDate)} ${fmtT.format(event.startDate)} 〜 ${fmtD.format(event.endDate)} ${fmtT.format(event.endDate)}`;
}

function formatEventDescriptionText(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return "";
  }
  if (!/[<&>]/.test(raw)) {
    return raw;
  }

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    for (const node of Array.from(doc.querySelectorAll("br"))) {
      node.replaceWith("\n");
    }
    for (const node of Array.from(doc.querySelectorAll("p, div, section, article, li, ul, ol, h1, h2, h3, h4, h5, h6"))) {
      node.insertAdjacentText("beforebegin", "\n");
      node.insertAdjacentText("afterend", "\n");
    }
    return (doc.body.textContent || "")
      .replace(/\u00A0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderLinkedText(value: string) {
  const lines = value.split("\n");
  return lines.map((line, lineIndex) => {
    const parts = line.split(/(https?:\/\/[^\s]+)/g);
    return (
      <span key={`line-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          if (/^https?:\/\/[^\s]+$/.test(part)) {
            return (
              <a
                key={`part-${lineIndex}-${partIndex}`}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary-color)] underline decoration-[var(--primary-color)] underline-offset-2 hover:opacity-80"
              >
                {part}
              </a>
            );
          }
          return <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>;
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
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

/** 区間が共通部分を持つ（端点で接するだけは重ならない） */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

type ClippedTimed = {
  event: NormalizedEvent;
  clipped: { start: Date; end: Date };
};

function layoutTimedEventsForDay(day: Date, events: NormalizedEvent[]): Map<string, { column: number; columnCount: number }> {
  const clippedList: ClippedTimed[] = events
    .filter((event) => intersectsDay(event, day))
    .map((event) => ({ event, clipped: clipEventToDay(event, day) }));

  const result = new Map<string, { column: number; columnCount: number }>();
  if (clippedList.length === 0) {
    return result;
  }

  const n = clippedList.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const ai = clippedList[i].clipped;
    for (let j = i + 1; j < n; j++) {
      const bj = clippedList[j].clipped;
      if (rangesOverlap(ai.start, ai.end, bj.start, bj.end)) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const visited = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (visited[i]) {
      continue;
    }
    const stack = [i];
    visited[i] = true;
    const cluster: number[] = [];
    while (stack.length > 0) {
      const v = stack.pop()!;
      cluster.push(v);
      for (const w of adj[v]) {
        if (!visited[w]) {
          visited[w] = true;
          stack.push(w);
        }
      }
    }

    const clusterClipped = cluster.map((idx) => clippedList[idx]);
    clusterClipped.sort((a, b) => {
      const ds = a.clipped.start.getTime() - b.clipped.start.getTime();
      if (ds !== 0) {
        return ds;
      }
      return b.clipped.end.getTime() - a.clipped.end.getTime();
    });

    const columnEnds: number[] = [];
    const columnById: { id: string; column: number }[] = [];
    for (const { event, clipped } of clusterClipped) {
      const startMs = clipped.start.getTime();
      let column = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= startMs) {
          column = c;
          columnEnds[c] = clipped.end.getTime();
          break;
        }
      }
      if (column < 0) {
        column = columnEnds.length;
        columnEnds.push(clipped.end.getTime());
      }
      columnById.push({ id: event.id, column });
    }
    const columnCount = columnEnds.length;
    for (const { id, column } of columnById) {
      result.set(id, { column, columnCount });
    }
  }

  return result;
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
                className={`flex aspect-square min-h-[2.5rem] items-center justify-center rounded-lg text-sm transition ${inWeek
                  ? "bg-[var(--primary-color)] font-semibold text-white"
                  : inMonth
                    ? "border border-[var(--card-border)] bg-white/90 text-[var(--text-heading)] hover:bg-[var(--primary-light)]"
                    : "border border-transparent text-gray-400 hover:bg-white/50"
                  } ${isToday && !inWeek ? "ring-2 ring-[var(--primary-color)] ring-offset-1" : ""} ${isToday && inWeek ? "ring-2 ring-white/80 ring-offset-1 ring-offset-[var(--primary-color)]" : ""
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

function CalendarModalFrame({
  children,
  onClose,
  titleId,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  titleId: string;
  wide?: boolean;
}) {
  useModalBodyLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:items-center sm:p-3 md:p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="閉じる" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-[100%] flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,235,255,0.96))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)] sm:max-h-[min(88vh,920px)] sm:rounded-[2rem] sm:shadow-[0_24px_80px_rgba(107,70,193,0.18)] ${wide ? "max-w-[min(100%,48rem)] md:max-w-[min(100%,56rem)] lg:max-w-[min(100%,64rem)]" : "max-w-[min(100%,26rem)] sm:max-w-[min(100%,28rem)] md:max-w-[min(100%,32rem)] lg:max-w-[min(100%,36rem)]"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  onClose,
  calendarDisplayNames,
}: {
  event: NormalizedEvent | null;
  onClose: () => void;
  calendarDisplayNames: CalendarDisplayNameMap;
}) {
  const titleId = "calendar-event-detail-title";
  if (!event) {
    return null;
  }

  const calendarLabel = event.calendarId ? calendarDisplayNames[event.calendarId] || event.calendarId : null;
  const descriptionText = formatEventDescriptionText(event.description || "");
  const hasDescription = Boolean(descriptionText);
  const hasLocation = Boolean(event.location?.trim());

  return (
    <CalendarModalFrame onClose={onClose} titleId={titleId} wide>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative shrink-0 border-b border-[var(--card-border)] px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 md:px-8 md:pb-5 md:pt-6">
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
          <h2 id={titleId} className="pr-12 text-base font-semibold leading-snug text-[var(--text-heading)] sm:text-lg md:text-xl">
            {event.summary || "（タイトルなし）"}
          </h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-black sm:px-6 sm:py-5 md:px-8 md:py-6">
          <dl className="space-y-4 text-sm sm:text-[15px]">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">日時</dt>
              <dd className="mt-1.5 whitespace-pre-wrap break-words text-black">{formatEventScheduleText(event)}</dd>
            </div>
            {calendarLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">カレンダー</dt>
                <dd className="mt-1.5 break-all text-black">{calendarLabel}</dd>
              </div>
            ) : null}
            {hasLocation ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">場所</dt>
                <dd className="mt-1.5 whitespace-pre-wrap break-words text-black">{event.location}</dd>
              </div>
            ) : null}
            {hasDescription ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">説明</dt>
                <dd className="mt-1.5 break-words text-black">{renderLinkedText(descriptionText)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5">
          {event.htmlLink ? (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--card-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-heading)] hover:bg-[var(--primary-light)] sm:min-h-0 sm:px-5"
            >
              Google Calendar で開く
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--primary-color)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 sm:min-h-0"
          >
            閉じる
          </button>
        </footer>
      </div>
    </CalendarModalFrame>
  );
}

function AllDayEventsModal({
  day,
  events,
  onClose,
  onEventClick,
  calendarDisplayNames,
}: {
  day: Date | null;
  events: NormalizedEvent[];
  onClose: () => void;
  onEventClick: (event: NormalizedEvent) => void;
  calendarDisplayNames: CalendarDisplayNameMap;
}) {
  const titleId = "calendar-all-day-events-title";
  if (!day || events.length === 0) {
    return null;
  }

  const dayLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(day);

  return (
    <CalendarModalFrame onClose={onClose} titleId={titleId} wide>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="relative shrink-0 border-b border-[var(--card-border)] px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 md:px-8 md:pb-5 md:pt-6">
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
          <h2 id={titleId} className="pr-12 text-base font-semibold leading-snug text-[var(--text-heading)] sm:text-lg md:text-xl">
            {dayLabel} の終日予定
          </h2>
          <p className="mt-2 text-sm text-black/80">{events.length}件の予定をまとめて表示しています。</p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-black sm:px-6 sm:py-5 md:px-8 md:py-6">
          <div className="space-y-4">
            {events.map((event) => {
              const calendarLabel = event.calendarId ? calendarDisplayNames[event.calendarId] || event.calendarId : null;
              return (
                <article key={event.id} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white/92">
                  <div className="border-b border-[var(--card-border)] px-4 py-3 sm:px-5 sm:py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-heading)] sm:text-base">
                          {event.summary || "（タイトルなし）"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEventClick(event)}
                        className="rounded-full border border-[var(--card-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-heading)] hover:bg-[var(--primary-light)]"
                      >
                        個別詳細
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-4 sm:px-5 sm:py-5">
                    <dl className="space-y-4 text-sm">
                      {calendarLabel ? (
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">カレンダー</dt>
                          <dd className="mt-1.5 text-black">{calendarLabel}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-[var(--card-border)] px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--primary-color)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 sm:min-h-0"
          >
            閉じる
          </button>
        </footer>
      </div>
    </CalendarModalFrame>
  );
}

function WeekCalendarGrid({
  range,
  events,
  calendarColors,
  onEventClick,
  onAllDayEventsClick,
}: {
  range: { start: Date; end: Date };
  events: NormalizedEvent[];
  calendarColors: CalendarColorMap;
  onEventClick: (event: NormalizedEvent) => void;
  onAllDayEventsClick: (day: Date, events: NormalizedEvent[]) => void;
}) {
  const days = enumerateDays(range.start, range.end);
  const allDayEvents = events.filter((event) => event.isAllDay);
  const timedEvents = events.filter((event) => !event.isAllDay);
  const gridCols = `72px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="-mx-3 overflow-x-auto overflow-y-visible px-3 sm:-mx-5 sm:px-5">
      <div className="min-w-[900px] space-y-3 sm:space-y-4">
        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: gridCols }}>
          <div className="min-h-[3rem] rounded-2xl border border-[var(--card-border)] bg-white/85 sm:min-h-0 sm:border-0 sm:bg-transparent" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center sm:rounded-3xl sm:px-3 sm:py-2.5"
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-body)] sm:text-xs sm:tracking-[0.2em]">
                {new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(day)}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-tight text-[var(--text-heading)] sm:text-sm">
                {formatMonthDay(day)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: gridCols }}>
          <div className="flex min-h-14 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center sm:min-h-0 sm:px-1">
            <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-[var(--text-body)] sm:text-xs">
              終日
            </span>
          </div>
          {days.map((day) => (
            (() => {
              const dayEvents = allDayEvents.filter((event) => intersectsDay(event, day));
              if (dayEvents.length === 0) {
                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-14 rounded-2xl border border-[var(--card-border)] bg-white/85 p-2 sm:min-h-14 sm:rounded-3xl"
                  />
                );
              }
              const firstEvent = dayEvents[0];
              const firstStyle = getCalendarColorStyle(calendarColors[firstEvent.calendarId || ""]);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    if (dayEvents.length === 1) {
                      onEventClick(firstEvent);
                      return;
                    }
                    onAllDayEventsClick(day, dayEvents);
                  }}
                  className="flex min-h-14 w-full flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center transition hover:bg-[var(--primary-light)]/35 sm:min-h-14 sm:rounded-3xl"
                >
                  {dayEvents.length === 1 ? (
                    <>
                      <span className="line-clamp-1 max-w-full text-xs font-semibold text-[var(--text-heading)] sm:text-sm">
                        {firstEvent.summary || "（タイトルなし）"}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-[var(--text-body)] sm:text-[11px]">
                        詳細を表示
                      </span>
                      <span className="mt-1 h-1.5 w-10 rounded-full" style={{ backgroundColor: firstStyle.borderColor as string }} />
                    </>
                  ) : (
                    <>
                      <span className="line-clamp-1 max-w-full text-xs font-semibold text-[var(--text-heading)] sm:text-sm">
                        {firstEvent.summary || "（タイトルなし）"}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-[var(--text-body)] sm:text-[11px]">
                        他 {dayEvents.length - 1} 件の予定
                      </span>
                      <span className="mt-1 h-1.5 w-10 rounded-full" style={{ backgroundColor: firstStyle.borderColor as string }} />
                    </>
                  )}
                </button>
              );
            })()
          ))}
        </div>

        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: gridCols }}>
          <div
            className="relative rounded-2xl border border-[var(--card-border)] bg-white/85 sm:rounded-none sm:border-0 sm:bg-transparent"
            style={{ height: DAY_GRID_HEIGHT }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-dashed border-[var(--card-border)] text-[10px] text-[var(--text-body)] first:border-t-0 sm:text-xs sm:first:border-t"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                <span className="-translate-y-1/2 rounded bg-gray-100 px-1">{`${hour.toString().padStart(2, "0")}:00`}</span>
              </div>
            ))}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-[var(--card-border)]" />
            <div className="pointer-events-none absolute bottom-0 left-0 z-[1] flex -translate-y-1/2 items-center">
              <span className="rounded bg-gray-100 px-1 text-[10px] text-[var(--text-body)] shadow-sm sm:text-xs">24:00</span>
            </div>
          </div>
          {days.map((day) => {
            const dayLayout = layoutTimedEventsForDay(day, timedEvents);
            return (
              <div
                key={day.toISOString()}
                className="relative rounded-3xl border border-[var(--card-border)] bg-white/85"
                style={{ height: DAY_GRID_HEIGHT }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-dashed border-[var(--card-border)]"
                    style={{ top: hour * HOUR_HEIGHT }}
                  />
                ))}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-[var(--card-border)]" />
                {timedEvents
                  .filter((event) => intersectsDay(event, day))
                  .map((event) => {
                    const clipped = clipEventToDay(event, day);
                    const top = (clipped.start.getHours() + clipped.start.getMinutes() / 60) * HOUR_HEIGHT;
                    const rawHeight =
                      ((clipped.end.getTime() - clipped.start.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT;
                    /** 30分=28px でも文字が収まるよう最小は低め。極端に短い枠だけ少し確保 */
                    const height = Math.max(22, rawHeight);
                    const { column, columnCount } = dayLayout.get(event.id) ?? { column: 0, columnCount: 1 };
                    const gapPx = columnCount > 1 ? 2 : 0;
                    const leftStyle =
                      columnCount === 1
                        ? "0.5rem"
                        : `calc(0.5rem + ${column} * (((100% - 1rem - ${(columnCount - 1) * gapPx}px) / ${columnCount}) + ${gapPx}px))`;
                    const widthStyle =
                      columnCount === 1
                        ? "calc(100% - 1rem)"
                        : `calc((100% - 1rem - ${(columnCount - 1) * gapPx}px) / ${columnCount})`;
                    return (
                      <button
                        key={`${event.id}-${day.toISOString()}`}
                        type="button"
                        onClick={() => onEventClick(event)}
                        className="absolute min-h-0 min-w-0 overflow-hidden rounded-xl border text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1"
                        style={{
                          top,
                          height,
                          left: leftStyle,
                          width: widthStyle,
                          right: "auto",
                          ...getCalendarColorStyle(calendarColors[event.calendarId || ""]),
                        }}
                        aria-label={event.summary || "予定"}
                      >
                        <span className="block truncate px-1 pt-0.5 text-[10px] font-semibold leading-tight sm:text-[11px]">
                          {event.summary || "（タイトルなし）"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarAdminContent() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [preferences, setPreferences] = useState<CalendarPreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<NormalizedEvent | null>(null);
  const [allDayModal, setAllDayModal] = useState<{ day: Date; events: NormalizedEvent[] } | null>(null);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = user ? await user.getIdToken() : "";
        const res = await fetch("/api/calendar/preferences", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await res.json().catch(() => ({}))) as
          | CalendarPreferencesResponse
          | { error?: string };
        if (!res.ok) {
          throw new Error(body && "error" in body ? body.error || "取得に失敗しました" : "取得に失敗しました");
        }
        setPreferences(body as CalendarPreferencesResponse);
      } catch (err) {
        setPreferences(null);
      }
    };
    void fetchPreferences();
  }, [user]);

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
  }, [anchor, user]);

  const events = useMemo(() => (data?.events || []).map(normalizeEvent), [data]);
  const range = useMemo(() => getViewRange(WEEK_VIEW, anchor), [anchor]);
  const calendarColors = preferences?.calendarColors || data?.calendarColors || {};
  const calendarDisplayNames = preferences?.calendarDisplayNames || data?.calendarDisplayNames || {};

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
            {loading ? (
              <div className="rounded-2xl bg-white/85 p-8 text-center text-[var(--text-body)]">読み込み中...</div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
            ) : (
              <WeekCalendarGrid
                range={range}
                events={events}
                calendarColors={calendarColors}
                onEventClick={setDetailEvent}
                onAllDayEventsClick={(day, dayEvents) => setAllDayModal({ day, events: dayEvents })}
              />
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
      <EventDetailModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        calendarDisplayNames={calendarDisplayNames}
      />
      <AllDayEventsModal
        day={allDayModal?.day || null}
        events={allDayModal?.events || []}
        onClose={() => setAllDayModal(null)}
        onEventClick={(event) => {
          setAllDayModal(null);
          setDetailEvent(event);
        }}
        calendarDisplayNames={calendarDisplayNames}
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
