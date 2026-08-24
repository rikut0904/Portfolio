"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth/AuthContext";
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
} from "../../lib/calendar";
import { hasAnyFreeSlotInDisplayRange } from "../../lib/calendarAvailability";
import {
  CALENDAR_GRID_DISPLAY_END_HOUR as GRID_DISPLAY_END_HOUR,
  CALENDAR_GRID_DISPLAY_START_HOUR as GRID_DISPLAY_START_HOUR,
} from "../../lib/calendarGridConfig";
import {
  getWeekDateHeaderVariant,
  weekDateHeaderContainerClass,
  weekDateHeaderDateClass,
  weekDateHeaderWeekdayClass,
} from "../../lib/japaneseDayHeader";
import MeetingRequestModal from "./MeetingRequestModal";

export type CalendarWeekPlannerVariant = "admin" | "public";

const WEEK_VIEW = "week" as const;

const VISIBLE_HOURS = GRID_DISPLAY_END_HOUR - GRID_DISPLAY_START_HOUR;
const HOUR_LABELS = Array.from(
  { length: VISIBLE_HOURS },
  (_, i) => GRID_DISPLAY_START_HOUR + i,
);
const HOUR_HEIGHT = 56;
const DAY_GRID_HEIGHT = VISIBLE_HOURS * HOUR_HEIGHT;

function offsetHours(date: Date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/** 1日列内の予定ブロックを、表示中の時間帯に収まる部分だけ描画用に変換する。範囲外なら null */
function timedBlockPositionInGrid(clipped: { start: Date; end: Date }) {
  const startH = offsetHours(clipped.start);
  const endH = offsetHours(clipped.end);
  const v0 = Math.max(startH, GRID_DISPLAY_START_HOUR);
  const v1 = Math.min(endH, GRID_DISPLAY_END_HOUR);
  if (v1 <= v0) {
    return null;
  }
  const top = (v0 - GRID_DISPLAY_START_HOUR) * HOUR_HEIGHT;
  const rawH = (v1 - v0) * HOUR_HEIGHT;
  const height = Math.max(22, rawH);
  return { top, height };
}

type NormalizedEvent = CalendarEvent & {
  startDate: Date;
  endDate: Date;
  timezone: string;
};

function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function parseAllDayDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function shiftDateKeyByDays(value: string, days: number) {
  const date = parseAllDayDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatAllDayDateLabel(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parseAllDayDate(value));
}

function calendarEventKey(event: Pick<CalendarEvent, "id" | "calendarId">) {
  return `${event.calendarId || ""}::${event.id}`;
}

function calendarEventInstanceKey(
  event: Pick<CalendarEvent, "id" | "calendarId" | "start" | "end">,
) {
  return `${event.calendarId || ""}::${event.id}::${event.start}::${event.end}`;
}

function normalizeEvent(
  event: CalendarEvent,
  timezone: string,
): NormalizedEvent {
  const startDate = event.isAllDay
    ? parseAllDayDate(event.start)
    : new Date(event.start);
  const endDate = event.isAllDay
    ? parseAllDayDate(event.end)
    : new Date(event.end);
  return { ...event, startDate, endDate, timezone };
}

function formatEventScheduleText(event: NormalizedEvent): string {
  const fmtD = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fmtT = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (event.isAllDay) {
    const startStr = formatAllDayDateLabel(event.start);
    const endStr = formatAllDayDateLabel(shiftDateKeyByDays(event.end, -1));
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
    for (const node of Array.from(
      doc.querySelectorAll(
        "p, div, section, article, li, ul, ol, h1, h2, h3, h4, h5, h6",
      ),
    )) {
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
    .replace(/&quot;/gi, '"')
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

function getWeekCacheKey(anchor: Date) {
  const range = getViewRange(WEEK_VIEW, anchor);
  return `${range.start.toISOString()}__${range.end.toISOString()}`;
}

function intersectsDay(event: NormalizedEvent, day: Date) {
  if (event.isAllDay) {
    const dayKey = formatDateKeyInTimeZone(day, event.timezone);
    return event.end > dayKey && event.start <= dayKey;
  }
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

/** グリッド上のクリックから、その日のおおよその時刻（30分単位にスナップ） */
function computeApproximateTimeFromGridClick(day: Date, offsetY: number): Date {
  const y = Math.max(0, Math.min(offsetY, DAY_GRID_HEIGHT));
  const hourFraction = GRID_DISPLAY_START_HOUR + y / HOUR_HEIGHT;
  const totalMinutes = hourFraction * 60;
  let snappedMinutes = Math.round(totalMinutes / 30) * 30;
  const minM = GRID_DISPLAY_START_HOUR * 60;
  /** 30分枠の開始として有効な最終時刻（23:30） */
  const maxHalfHourStartM = 23 * 60 + 30;
  snappedMinutes = Math.max(minM, Math.min(snappedMinutes, maxHalfHourStartM));
  const dayStart = startOfDay(day);
  return new Date(dayStart.getTime() + snappedMinutes * 60 * 1000);
}

function hasAllDayOnDay(day: Date, allDayEvents: NormalizedEvent[]): boolean {
  return allDayEvents.some((e) => intersectsDay(e, day));
}

function timedSlotOverlapsBusy(
  slotStart: Date,
  slotEnd: Date,
  day: Date,
  timedEvents: NormalizedEvent[],
): boolean {
  for (const ev of timedEvents) {
    if (ev.isAllDay) {
      continue;
    }
    if (!intersectsDay(ev, day)) {
      continue;
    }
    const clipped = clipEventToDay(ev, day);
    if (rangesOverlap(slotStart, slotEnd, clipped.start, clipped.end)) {
      return true;
    }
  }
  return false;
}

type ClippedTimed = {
  event: NormalizedEvent;
  clipped: { start: Date; end: Date };
};

function layoutTimedEventsForDay(
  day: Date,
  events: NormalizedEvent[],
): Map<string, { column: number; columnCount: number }> {
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
      columnById.push({ id: calendarEventInstanceKey(event), column });
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
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
  );

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
    const start = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
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

  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(visibleMonth);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-picker-title"
        className="relative z-10 w-full max-w-md rounded-t-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,235,255,0.96))] p-4 shadow-[0_-12px_48px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:shadow-[0_24px_80px_rgba(107,70,193,0.18)]"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            className="rounded-full border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
          >
            ←
          </button>
          <h2
            id="week-picker-title"
            className="text-center text-base font-semibold text-[var(--text-heading)]"
          >
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() =>
              setVisibleMonth(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            className="rounded-full border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--text-body)] hover:bg-[var(--primary-light)]"
          >
            →
          </button>
        </div>
        <p className="mb-3 text-center text-xs text-[var(--text-body)]">
          日付をタップすると、その日を含む週が表示されます。
        </p>
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
            const inWeek = isInSelectedWeek(
              day,
              weekRange.start,
              weekRange.end,
            );
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
                  isToday && inWeek
                    ? "ring-2 ring-white/80 ring-offset-1 ring-offset-[var(--primary-color)]"
                    : ""
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
        className={`relative z-10 flex max-h-[min(92vh,100dvh)] w-full max-w-[100%] flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,235,255,0.96))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)] sm:max-h-[min(88vh,920px)] sm:rounded-[2rem] sm:shadow-[0_24px_80px_rgba(107,70,193,0.18)] ${
          wide
            ? "max-w-[min(100%,48rem)] md:max-w-[min(100%,56rem)] lg:max-w-[min(100%,64rem)]"
            : "max-w-[min(100%,26rem)] sm:max-w-[min(100%,28rem)] md:max-w-[min(100%,32rem)] lg:max-w-[min(100%,36rem)]"
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
  showCalendarMeta,
  publicationControl,
}: {
  event: NormalizedEvent | null;
  onClose: () => void;
  calendarDisplayNames: CalendarDisplayNameMap;
  showCalendarMeta: boolean;
  publicationControl?: {
    checked: boolean;
    saving: boolean;
    publicDescription: string;
    onSave: (payload: {
      isPublished: boolean;
      publicDescription: string;
    }) => void;
  };
}) {
  const titleId = "calendar-event-detail-title";
  const [draftPublished, setDraftPublished] = useState(
    Boolean(publicationControl?.checked),
  );
  const [draftPublicDescription, setDraftPublicDescription] = useState(
    publicationControl?.publicDescription || "",
  );
  if (!event) {
    return null;
  }

  const calendarLabel =
    showCalendarMeta && event.calendarId
      ? calendarDisplayNames[event.calendarId] || event.calendarId
      : null;
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
          <h2
            id={titleId}
            className="pr-12 text-base font-semibold leading-snug text-[var(--text-heading)] sm:text-lg md:text-xl"
          >
            {event.summary || "（タイトルなし）"}
          </h2>
          {publicationControl ? (
            <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-white/85 px-4 py-4">
              <label className="flex items-center gap-3 text-sm text-[var(--text-heading)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--card-border)]"
                  checked={draftPublished}
                  disabled={publicationControl.saving}
                  onChange={(e) => setDraftPublished(e.target.checked)}
                />
                <span className="flex-1">一般ページで詳細を公開する</span>
                <span className="text-xs text-[var(--text-body)]">
                  {publicationControl.saving ? "保存中..." : ""}
                </span>
              </label>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                    公開詳細
                  </p>
                  <textarea
                    value={draftPublicDescription}
                    onChange={(e) => setDraftPublicDescription(e.target.value)}
                    disabled={publicationControl.saving}
                    placeholder="一般ページで見せたい説明や https://... のURLを記載できます"
                    rows={5}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={publicationControl.saving}
                    onClick={() =>
                      publicationControl.onSave({
                        isPublished: draftPublished,
                        publicDescription: draftPublicDescription,
                      })
                    }
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[var(--primary-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                  >
                    公開詳細を保存
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-black sm:px-6 sm:py-5 md:px-8 md:py-6">
          <dl className="space-y-4 text-sm sm:text-[15px]">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                日時
              </dt>
              <dd className="mt-1.5 whitespace-pre-wrap break-words text-black">
                {formatEventScheduleText(event)}
              </dd>
            </div>
            {calendarLabel ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                  カレンダー
                </dt>
                <dd className="mt-1.5 break-all text-black">{calendarLabel}</dd>
              </div>
            ) : null}
            {hasLocation ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                  場所
                </dt>
                <dd className="mt-1.5 whitespace-pre-wrap break-words text-black">
                  {event.location}
                </dd>
              </div>
            ) : null}
            {hasDescription ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                  説明
                </dt>
                <dd className="mt-1.5 break-words text-black">
                  {renderLinkedText(descriptionText)}
                </dd>
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
  showCalendarMeta,
}: {
  day: Date | null;
  events: NormalizedEvent[];
  onClose: () => void;
  onEventClick: (event: NormalizedEvent) => void;
  calendarDisplayNames: CalendarDisplayNameMap;
  showCalendarMeta: boolean;
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
          <h2
            id={titleId}
            className="pr-12 text-base font-semibold leading-snug text-[var(--text-heading)] sm:text-lg md:text-xl"
          >
            {dayLabel} の終日予定
          </h2>
          <p className="mt-2 text-sm text-black/80">
            {events.length}件の予定をまとめて表示しています。
          </p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-black sm:px-6 sm:py-5 md:px-8 md:py-6">
          <div className="space-y-4">
            {events.map((event) => {
              const calendarLabel =
                showCalendarMeta && event.calendarId
                  ? calendarDisplayNames[event.calendarId] || event.calendarId
                  : null;
              return (
                <article
                  key={calendarEventInstanceKey(event)}
                  className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white/92"
                >
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
                  {calendarLabel ? (
                    <div className="px-4 py-4 sm:px-5 sm:py-5">
                      <dl className="space-y-4 text-sm">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-body)]">
                            カレンダー
                          </dt>
                          <dd className="mt-1.5 text-black">{calendarLabel}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : null}
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

const PUBLIC_GRAY_EVENT_STYLE = getCalendarColorStyle("#9CA3AF");
const PUBLIC_PUBLISHED_EVENT_STYLE = getCalendarColorStyle("#E7A55A");

function WeekCalendarGrid({
  range,
  events,
  calendarColors,
  onEventClick,
  onAllDayEventsClick,
  variant,
  onPublicSlotRequest,
  onPublicSlotBlocked,
}: {
  range: { start: Date; end: Date };
  events: NormalizedEvent[];
  calendarColors: CalendarColorMap;
  onEventClick: (event: NormalizedEvent) => void;
  onAllDayEventsClick: (day: Date, events: NormalizedEvent[]) => void;
  variant: CalendarWeekPlannerVariant;
  onPublicSlotRequest?: (payload: {
    day: Date;
    preferredHint: Date;
    timedEvents: NormalizedEvent[];
    allDayEvents: NormalizedEvent[];
  }) => void;
  onPublicSlotBlocked?: (
    reason: "overlap" | "allday" | "invalid" | "no_slots",
  ) => void;
}) {
  const days = enumerateDays(range.start, range.end);
  const allDayEvents = events.filter((event) => event.isAllDay);
  const timedEvents = events.filter((event) => !event.isAllDay);
  const gridCols = `72px repeat(${days.length}, minmax(0, 1fr))`;

  const eventBlockStyle = (event: NormalizedEvent) => {
    if (variant === "public") {
      return event.isPublished
        ? PUBLIC_PUBLISHED_EVENT_STYLE
        : PUBLIC_GRAY_EVENT_STYLE;
    }
    return getCalendarColorStyle(calendarColors[event.calendarId || ""]);
  };

  const canOpenEventDetail = (event: NormalizedEvent) =>
    variant === "admin" || event.isPublished;

  return (
    <div className="-mx-3 overflow-x-auto overflow-y-visible px-3 sm:-mx-5 sm:px-5">
      <div className="min-w-[900px] space-y-3 sm:space-y-4">
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="min-h-[3rem] rounded-2xl border border-[var(--card-border)] bg-white/85 sm:min-h-0 sm:border-0 sm:bg-transparent" />
          {days.map((day) => {
            const headerVar = getWeekDateHeaderVariant(day);
            return (
              <div
                key={day.toISOString()}
                className={weekDateHeaderContainerClass(headerVar)}
              >
                <p className={weekDateHeaderWeekdayClass(headerVar)}>
                  {new Intl.DateTimeFormat("ja-JP", {
                    weekday: "short",
                  }).format(day)}
                </p>
                <p className={weekDateHeaderDateClass(headerVar)}>
                  {formatMonthDay(day)}
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="flex min-h-14 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center sm:min-h-0 sm:px-1">
            <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-[var(--text-body)] sm:text-xs">
              終日
            </span>
          </div>
          {days.map((day) =>
            (() => {
              const dayEvents = allDayEvents.filter((event) =>
                intersectsDay(event, day),
              );
              if (dayEvents.length === 0) {
                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-14 rounded-2xl border border-[var(--card-border)] bg-white/85 p-2 sm:min-h-14 sm:rounded-3xl"
                  />
                );
              }
              const firstEvent = dayEvents[0];
              const publishedDayEvents = dayEvents.filter(
                (event) => event.isPublished,
              );
              const primaryPublicEvent = publishedDayEvents[0] || null;
              const firstStyle = eventBlockStyle(
                variant === "public" && primaryPublicEvent
                  ? primaryPublicEvent
                  : firstEvent,
              );
              const firstTitle =
                variant === "public"
                  ? primaryPublicEvent?.summary || "予定あり"
                  : firstEvent.summary || "（タイトルなし）";
              const allDayBody = (
                <>
                  {dayEvents.length === 1 ? (
                    <>
                      <span className="line-clamp-1 max-w-full text-xs font-semibold text-[var(--text-heading)] sm:text-sm">
                        {firstTitle}
                      </span>
                      {variant === "admin" || primaryPublicEvent ? (
                        <span className="mt-1 text-[10px] font-medium text-[var(--text-body)] sm:text-[11px]">
                          詳細を表示
                        </span>
                      ) : null}
                      <span
                        className="mt-1 h-1.5 w-10 rounded-full"
                        style={{
                          backgroundColor: firstStyle.borderColor as string,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span className="line-clamp-1 max-w-full text-xs font-semibold text-[var(--text-heading)] sm:text-sm">
                        {firstTitle}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-[var(--text-body)] sm:text-[11px]">
                        {variant === "public"
                          ? publishedDayEvents.length > 0
                            ? `他 ${Math.max(publishedDayEvents.length - 1, 0)} 件の公開予定`
                            : "公開予定なし"
                          : `他 ${dayEvents.length - 1} 件の予定`}
                      </span>
                      <span
                        className="mt-1 h-1.5 w-10 rounded-full"
                        style={{
                          backgroundColor: firstStyle.borderColor as string,
                        }}
                      />
                    </>
                  )}
                </>
              );
              const publicAllDayCardStyle =
                variant === "public" && primaryPublicEvent
                  ? {
                      backgroundColor:
                        PUBLIC_PUBLISHED_EVENT_STYLE.backgroundColor as string,
                      borderColor:
                        PUBLIC_PUBLISHED_EVENT_STYLE.borderColor as string,
                    }
                  : undefined;
              if (
                variant === "public" &&
                (!primaryPublicEvent || publishedDayEvents.length === 0)
              ) {
                return (
                  <div
                    key={day.toISOString()}
                    className="flex min-h-14 w-full flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center sm:min-h-14 sm:rounded-3xl"
                    style={publicAllDayCardStyle}
                  >
                    {allDayBody}
                  </div>
                );
              }
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    if (variant === "public") {
                      if (
                        publishedDayEvents.length === 1 &&
                        primaryPublicEvent
                      ) {
                        onEventClick(primaryPublicEvent);
                        return;
                      }
                      if (publishedDayEvents.length > 1) {
                        onAllDayEventsClick(day, publishedDayEvents);
                      }
                      return;
                    }
                    if (dayEvents.length === 1) {
                      onEventClick(firstEvent);
                      return;
                    }
                    onAllDayEventsClick(day, dayEvents);
                  }}
                  className="flex min-h-14 w-full flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-white/85 px-2 py-2 text-center transition hover:bg-[var(--primary-light)]/35 sm:min-h-14 sm:rounded-3xl"
                  style={publicAllDayCardStyle}
                >
                  {allDayBody}
                </button>
              );
            })(),
          )}
        </div>

        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div
            className="relative rounded-2xl border border-[var(--card-border)] bg-white/85 sm:rounded-none sm:border-0 sm:bg-transparent"
            style={{ height: DAY_GRID_HEIGHT }}
          >
            {HOUR_LABELS.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-dashed border-[var(--card-border)] text-[10px] text-[var(--text-body)] first:border-t-0 sm:text-xs sm:first:border-t"
                style={{ top: (hour - GRID_DISPLAY_START_HOUR) * HOUR_HEIGHT }}
              >
                <span className="-translate-y-1/2 rounded bg-gray-100 px-1">{`${hour.toString().padStart(2, "0")}:00`}</span>
              </div>
            ))}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-[var(--card-border)]" />
            <div className="pointer-events-none absolute bottom-0 left-0 z-[1] flex -translate-y-1/2 items-center">
              <span className="rounded bg-gray-100 px-1 text-[10px] text-[var(--text-body)] shadow-sm sm:text-xs">
                {`${GRID_DISPLAY_END_HOUR.toString().padStart(2, "0")}:00`}
              </span>
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
                {variant === "public" && onPublicSlotRequest ? (
                  <button
                    type="button"
                    tabIndex={0}
                    className="absolute inset-0 z-0 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="空き時間に打ち合わせを依頼"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      if (hasAllDayOnDay(day, allDayEvents)) {
                        onPublicSlotBlocked?.("allday");
                        return;
                      }
                      const preferredHint = computeApproximateTimeFromGridClick(
                        day,
                        y,
                      );
                      if (
                        !hasAnyFreeSlotInDisplayRange(
                          day,
                          timedEvents,
                          allDayEvents,
                          GRID_DISPLAY_START_HOUR,
                          GRID_DISPLAY_END_HOUR,
                        )
                      ) {
                        onPublicSlotBlocked?.("no_slots");
                        return;
                      }
                      onPublicSlotRequest({
                        day,
                        preferredHint,
                        timedEvents,
                        allDayEvents,
                      });
                    }}
                  />
                ) : null}
                {HOUR_LABELS.map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--card-border)]"
                    style={{
                      top: (hour - GRID_DISPLAY_START_HOUR) * HOUR_HEIGHT,
                    }}
                  />
                ))}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-[var(--card-border)]" />
                {timedEvents
                  .filter((event) => intersectsDay(event, day))
                  .map((event) => {
                    const clipped = clipEventToDay(event, day);
                    const gridPos = timedBlockPositionInGrid(clipped);
                    if (!gridPos) {
                      return null;
                    }
                    const { top, height } = gridPos;
                    const eventInstanceKey = calendarEventInstanceKey(event);
                    const { column, columnCount } = dayLayout.get(
                      eventInstanceKey,
                    ) ?? { column: 0, columnCount: 1 };
                    const gapPx = columnCount > 1 ? 2 : 0;
                    const leftStyle =
                      columnCount === 1
                        ? "0.5rem"
                        : `calc(0.5rem + ${column} * (((100% - 1rem - ${(columnCount - 1) * gapPx}px) / ${columnCount}) + ${gapPx}px))`;
                    const widthStyle =
                      columnCount === 1
                        ? "calc(100% - 1rem)"
                        : `calc((100% - 1rem - ${(columnCount - 1) * gapPx}px) / ${columnCount})`;
                    const blockStyle = {
                      top,
                      height,
                      left: leftStyle,
                      width: widthStyle,
                      right: "auto" as const,
                      ...eventBlockStyle(event),
                    };
                    const label =
                      variant === "public"
                        ? event.isPublished
                          ? event.summary || "（タイトルなし）"
                          : "予定あり"
                        : event.summary || "（タイトルなし）";
                    if (!canOpenEventDetail(event)) {
                      return (
                        <div
                          key={`${eventInstanceKey}-${day.toISOString()}`}
                          className="absolute z-10 min-h-0 min-w-0 overflow-hidden rounded-xl border text-left shadow-sm"
                          style={blockStyle}
                          aria-label="予定あり"
                        >
                          <span className="block truncate px-1 pt-0.5 text-[10px] font-semibold leading-tight sm:text-[11px]">
                            {label}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={`${eventInstanceKey}-${day.toISOString()}`}
                        type="button"
                        onClick={() => onEventClick(event)}
                        className="absolute min-h-0 min-w-0 overflow-hidden rounded-xl border text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-1"
                        style={blockStyle}
                        aria-label={label}
                      >
                        <span className="block truncate px-1 pt-0.5 text-[10px] font-semibold leading-tight sm:text-[11px]">
                          {label}
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

function CalendarWeekPlannerContent({
  variant,
}: {
  variant: CalendarWeekPlannerVariant;
}) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<CalendarEventsResponse | null>(null);
  const [preferences, setPreferences] =
    useState<CalendarPreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<NormalizedEvent | null>(null);
  const [allDayModal, setAllDayModal] = useState<{
    day: Date;
    events: NormalizedEvent[];
  } | null>(null);
  const [meetingRequest, setMeetingRequest] = useState<{
    day: Date;
    preferredHint: Date;
    timedEvents: NormalizedEvent[];
    allDayEvents: NormalizedEvent[];
  } | null>(null);
  const [slotBusyHint, setSlotBusyHint] = useState<string | null>(null);
  const [publicationSavingKey, setPublicationSavingKey] = useState<
    string | null
  >(null);
  const eventsCacheRef = useRef<Map<string, CalendarEventsResponse>>(new Map());
  const eventsInFlightRef = useRef<
    Map<string, Promise<CalendarEventsResponse>>
  >(new Map());

  /** fetch の JSON を BOM 耐性・events 必ず配列に正規化 */
  const normalizeCalendarFetchPayload = (
    parsed: unknown,
  ): CalendarEventsResponse => {
    const o =
      parsed && typeof parsed === "object"
        ? (parsed as Partial<CalendarEventsResponse>)
        : {};
    return {
      timezone: typeof o.timezone === "string" ? o.timezone : "Asia/Tokyo",
      from: typeof o.from === "string" ? o.from : "",
      to: typeof o.to === "string" ? o.to : "",
      events: Array.isArray(o.events)
        ? o.events.map((event) => {
            const record =
              event && typeof event === "object"
                ? (event as unknown as Record<string, unknown>)
                : {};
            return {
              id: typeof record.id === "string" ? record.id : "",
              calendarId:
                typeof record.calendarId === "string"
                  ? record.calendarId
                  : undefined,
              summary: typeof record.summary === "string" ? record.summary : "",
              description:
                typeof record.description === "string"
                  ? record.description
                  : "",
              publicDescription:
                typeof record.publicDescription === "string"
                  ? record.publicDescription
                  : "",
              location:
                typeof record.location === "string" ? record.location : "",
              htmlLink:
                typeof record.htmlLink === "string" ? record.htmlLink : "",
              status: typeof record.status === "string" ? record.status : "",
              start: typeof record.start === "string" ? record.start : "",
              end: typeof record.end === "string" ? record.end : "",
              isAllDay: Boolean(record.isAllDay),
              isPublished: Boolean(record.isPublished),
            };
          })
        : [],
      calendarIds: Array.isArray(o.calendarIds) ? o.calendarIds : undefined,
      calendarColors: o.calendarColors,
      calendarLabels: o.calendarLabels,
      calendarDisplayNames: o.calendarDisplayNames,
    };
  };

  useEffect(() => {
    if (!slotBusyHint) {
      return;
    }
    const t = setTimeout(() => setSlotBusyHint(null), 3800);
    return () => clearTimeout(t);
  }, [slotBusyHint]);

  useEffect(() => {
    if (variant !== "admin") {
      setPreferences(null);
      return;
    }
    const fetchPreferences = async () => {
      try {
        const token = user ? await user.getAuthHeader() : "";
        const res = await fetch("/api/admin/calendar/preferences", {
          headers: token ? { Authorization: token } : {},
        });
        const body = (await res.json().catch(() => ({}))) as
          | CalendarPreferencesResponse
          | { error?: string };
        if (!res.ok) {
          throw new Error(
            body && "error" in body
              ? body.error || "取得に失敗しました"
              : "取得に失敗しました",
          );
        }
        setPreferences(body as CalendarPreferencesResponse);
      } catch (err) {
        setPreferences(null);
      }
    };
    void fetchPreferences();
  }, [user, variant]);

  useEffect(() => {
    let active = true;

    const fetchWeekEvents = async (targetAnchor: Date, token: string) => {
      const range = getViewRange(WEEK_VIEW, targetAnchor);
      const key = getWeekCacheKey(targetAnchor);
      const cachedResponse = eventsCacheRef.current.get(key);
      if (cachedResponse) {
        return cachedResponse;
      }
      const pending = eventsInFlightRef.current.get(key);
      if (pending) {
        return pending;
      }

      const request = (async () => {
        const query = new URLSearchParams({
          from: toApiDateTime(range.start),
          to: toApiDateTime(range.end),
        });
        const eventsPath =
          variant === "admin"
            ? "/api/admin/calendar/events"
            : "/api/calendar/events";
        const res = await fetch(`${eventsPath}?${query.toString()}`, {
          headers: token ? { Authorization: token } : {},
        });
        const raw = await res.text();
        const trimmed = raw.replace(/^\uFEFF/, "").trim();
        let parsed: unknown = null;
        if (trimmed) {
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            parsed = null;
          }
        }
        if (!res.ok) {
          const errPayload =
            parsed && typeof parsed === "object" && parsed !== null
              ? (parsed as { error?: string })
              : {};
          const apiErr =
            typeof errPayload.error === "string" ? errPayload.error : "";
          if (apiErr) {
            throw new Error(apiErr);
          }
          if (res.status === 404) {
            throw new Error(
              "APIに接続できません。frontend の BACKEND_API_URL とバックエンドの起動を確認してください。",
            );
          }
          const snippet = trimmed.replace(/\s+/g, " ").slice(0, 120);
          throw new Error(
            snippet
              ? `取得に失敗しました（${res.status}）: ${snippet}`
              : `取得に失敗しました（HTTP ${res.status}）`,
          );
        }
        if (parsed === null || typeof parsed !== "object" || parsed === null) {
          throw new Error(
            "サーバーからの応答を解析できませんでした。しばらくしてから再度お試しください。",
          );
        }
        const response = normalizeCalendarFetchPayload(parsed);
        eventsCacheRef.current.set(key, response);
        return response;
      })();

      eventsInFlightRef.current.set(key, request);
      try {
        return await request;
      } finally {
        eventsInFlightRef.current.delete(key);
      }
    };

    const fetchEvents = async () => {
      const cacheKey = getWeekCacheKey(anchor);
      const cached = eventsCacheRef.current.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        setError("");
      } else {
        setLoading(true);
        setError("");
      }
      try {
        const token =
          variant === "admin" && user ? await user.getAuthHeader() : "";
        const currentWeek = await fetchWeekEvents(anchor, token);
        if (active) {
          setData(currentWeek);
          setError("");
        }

        void fetchWeekEvents(shiftAnchor(WEEK_VIEW, anchor, -1), token).catch(
          () => undefined,
        );
        void fetchWeekEvents(shiftAnchor(WEEK_VIEW, anchor, 1), token).catch(
          () => undefined,
        );
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "取得に失敗しました");
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchEvents();

    return () => {
      active = false;
    };
  }, [anchor, user, variant]);

  const applyPublicationToResponse = (
    response: CalendarEventsResponse,
    calendarId: string,
    eventId: string,
    isPublished: boolean,
    publicDescription: string,
  ): CalendarEventsResponse => ({
    ...response,
    events: response.events.map((event) =>
      event.id === eventId && event.calendarId === calendarId
        ? { ...event, isPublished, publicDescription }
        : event,
    ),
  });

  const syncEventPublication = (
    calendarId: string,
    eventId: string,
    isPublished: boolean,
    publicDescription: string,
  ) => {
    eventsCacheRef.current = new Map(
      Array.from(eventsCacheRef.current.entries()).map(([key, value]) => [
        key,
        applyPublicationToResponse(
          value,
          calendarId,
          eventId,
          isPublished,
          publicDescription,
        ),
      ]),
    );
    setData((current) =>
      current
        ? applyPublicationToResponse(
            current,
            calendarId,
            eventId,
            isPublished,
            publicDescription,
          )
        : current,
    );
    setDetailEvent((current) =>
      current && current.id === eventId && current.calendarId === calendarId
        ? { ...current, isPublished, publicDescription }
        : current,
    );
    setAllDayModal((current) =>
      current
        ? {
            ...current,
            events: current.events.map((event) =>
              event.id === eventId && event.calendarId === calendarId
                ? { ...event, isPublished, publicDescription }
                : event,
            ),
          }
        : current,
    );
  };

  const events = useMemo(() => {
    const list = data?.events;
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map((event) =>
      normalizeEvent(event, data?.timezone || "Asia/Tokyo"),
    );
  }, [data]);
  const range = useMemo(() => getViewRange(WEEK_VIEW, anchor), [anchor]);
  const calendarColors =
    preferences?.calendarColors || data?.calendarColors || {};
  const calendarDisplayNames =
    preferences?.calendarDisplayNames || data?.calendarDisplayNames || {};
  const detailEventPublicationKey = detailEvent
    ? calendarEventKey(detailEvent)
    : null;

  const handleAdminPublicationSave = async ({
    isPublished,
    publicDescription,
  }: {
    isPublished: boolean;
    publicDescription: string;
  }) => {
    if (variant !== "admin" || !detailEvent || !detailEvent.calendarId) {
      return;
    }
    const eventKey = calendarEventKey(detailEvent);
    setPublicationSavingKey(eventKey);
    try {
      const token = user ? await user.getAuthHeader() : "";
      const res = await fetch("/api/admin/calendar/events/publication", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({
          calendarId: detailEvent.calendarId,
          eventId: detailEvent.id,
          isPublished,
          publicDescription,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        publicDescription?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || "公開設定の保存に失敗しました");
      }
      syncEventPublication(
        detailEvent.calendarId,
        detailEvent.id,
        isPublished,
        body.publicDescription || "",
      );
      setSlotBusyHint(
        isPublished
          ? "この予定を一般ページで公開しました。"
          : "この予定を一般ページで非公開にしました。",
      );
    } catch (err) {
      setSlotBusyHint(
        err instanceof Error ? err.message : "公開設定の保存に失敗しました",
      );
    } finally {
      setPublicationSavingKey(null);
    }
  };

  const calendarSection = (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,235,255,0.92))] shadow-[0_20px_60px_rgba(107,70,193,0.12)]">
      <div className="border-b border-[var(--card-border)] px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-5">
          {variant === "public" ? (
            <div>
              <h1 className="mb-0 border-none pl-0">スケジュール</h1>
              <p className="mt-3 w-full min-w-0 text-sm leading-relaxed text-[var(--text-body)]">
                MTGや打ち合わせのご希望は、下の週表示で空いている時間帯を選んでお送りください。
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-body)]">
                Google Calendar
              </p>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h1 className="mb-0 border-none pl-0">予定管理</h1>
                <Link
                  href="/admin/calendar/settings"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-white text-[var(--text-body)] hover:bg-[var(--primary-light)]"
                  aria-label="設定"
                  title="設定"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 -960 960 960"
                    className="h-5 w-5 fill-current"
                  >
                    <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 49-85-147 103-78q-2-14-2-29t2-29l-103-78 85-147 119 49q11-8 22.5-15t24.5-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-49 85 147-103 78q2 14 2 29t-2 29l103 78-85 147-119-49q-11 8-22.5 15T606-208L590-80H370Zm110-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
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
          <p className="text-sm font-semibold text-[var(--text-heading)]">
            {formatHeaderRange(WEEK_VIEW, anchor)}
          </p>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5 sm:py-6">
        {loading ? (
          <div className="rounded-2xl bg-white/85 p-8 text-center text-[var(--text-body)]">
            読み込み中...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : (
          <WeekCalendarGrid
            range={range}
            events={events}
            calendarColors={calendarColors}
            variant={variant}
            onEventClick={setDetailEvent}
            onAllDayEventsClick={(day, dayEvents) =>
              setAllDayModal({ day, events: dayEvents })
            }
            onPublicSlotRequest={
              variant === "public"
                ? (payload) => setMeetingRequest(payload)
                : undefined
            }
            onPublicSlotBlocked={
              variant === "public"
                ? (reason) => {
                    setSlotBusyHint(
                      reason === "overlap"
                        ? "この時間は予定と重なっています。空いている時間を選んでください。"
                        : reason === "allday"
                          ? "終日の予定がある日は、ここからは依頼できません。"
                          : reason === "no_slots"
                            ? "表示している時間帯内に、空きの候補がありません。"
                            : "この位置では依頼できません。",
                    );
                  }
                : undefined
            }
          />
        )}
      </div>
    </section>
  );

  const modals = (
    <>
      <WeekPickerModal
        key={
          weekPickerOpen
            ? `week-picker-${anchor.getTime()}`
            : "week-picker-idle"
        }
        open={weekPickerOpen}
        anchor={anchor}
        onClose={() => setWeekPickerOpen(false)}
        onPickDay={(day) => setAnchor(day)}
      />
      {variant === "admin" ? (
        <>
          <EventDetailModal
            key={`${detailEventPublicationKey || "detail"}::${
              detailEvent?.isPublished ? "1" : "0"
            }::${detailEvent?.publicDescription || ""}`}
            event={detailEvent}
            onClose={() => setDetailEvent(null)}
            calendarDisplayNames={calendarDisplayNames}
            showCalendarMeta
            publicationControl={
              detailEvent
                ? {
                    checked: detailEvent.isPublished,
                    saving: publicationSavingKey === detailEventPublicationKey,
                    publicDescription: detailEvent.publicDescription || "",
                    onSave: handleAdminPublicationSave,
                  }
                : undefined
            }
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
            showCalendarMeta
          />
        </>
      ) : (
        <>
          <EventDetailModal
            key={detailEventPublicationKey || "public-detail"}
            event={detailEvent?.isPublished ? detailEvent : null}
            onClose={() => setDetailEvent(null)}
            calendarDisplayNames={calendarDisplayNames}
            showCalendarMeta={false}
          />
          <AllDayEventsModal
            day={allDayModal?.day || null}
            events={(allDayModal?.events || []).filter(
              (event) => event.isPublished,
            )}
            onClose={() => setAllDayModal(null)}
            onEventClick={(event) => {
              setAllDayModal(null);
              setDetailEvent(event);
            }}
            calendarDisplayNames={calendarDisplayNames}
            showCalendarMeta={false}
          />
          <MeetingRequestModal
            open={meetingRequest !== null}
            onClose={() => setMeetingRequest(null)}
            day={meetingRequest?.day ?? null}
            preferredHint={meetingRequest?.preferredHint ?? null}
            timedEvents={meetingRequest?.timedEvents ?? []}
            allDayEvents={meetingRequest?.allDayEvents ?? []}
            displayStartHour={GRID_DISPLAY_START_HOUR}
            displayEndHour={GRID_DISPLAY_END_HOUR}
          />
        </>
      )}
    </>
  );

  return (
    <>
      {variant === "admin" ? (
        <div className="min-h-screen bg-gray-100">
          <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 lg:px-8">
            <Link
              href="/admin"
              className="mb-4 inline-block text-sm text-blue-800 hover:text-gray-900"
            >
              ← ダッシュボード
            </Link>
            {calendarSection}
          </main>
          {modals}
        </div>
      ) : (
        <>
          {calendarSection}
          {modals}
        </>
      )}
      {slotBusyHint ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[110] max-w-[min(100%,24rem)] -translate-x-1/2 rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 shadow-lg"
        >
          {slotBusyHint}
        </div>
      ) : null}
    </>
  );
}

export function CalendarWeekPlanner({
  variant,
}: {
  variant: CalendarWeekPlannerVariant;
}) {
  return <CalendarWeekPlannerContent variant={variant} />;
}
