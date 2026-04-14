"use client";

export type CalendarView = "day" | "week" | "month" | "year";
export type CalendarColorMap = Record<string, string>;
export type CalendarLabelMap = Record<string, string>;
export type CalendarDisplayNameMap = Record<string, string>;

export interface CalendarEvent {
  id: string;
  calendarId?: string;
  summary: string;
  description: string;
  location: string;
  htmlLink: string;
  status: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

export interface CalendarEventsResponse {
  timezone: string;
  calendarIds?: string[];
  calendarColors?: CalendarColorMap;
  calendarLabels?: CalendarLabelMap;
  calendarDisplayNames?: CalendarDisplayNameMap;
  from: string;
  to: string;
  events: CalendarEvent[];
}

export interface CalendarPreferencesResponse {
  calendarIds: string[];
  calendarColors: CalendarColorMap;
  calendarLabels: CalendarLabelMap;
  calendarDisplayNames: CalendarDisplayNameMap;
}

export function getViewRange(view: CalendarView, anchor: Date) {
  const start = new Date(anchor);
  const end = new Date(anchor);
  switch (view) {
    case "day":
      start.setHours(0, 0, 0, 0);
      end.setHours(24, 0, 0, 0);
      break;
    case "week": {
      const day = start.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 1);
      end.setHours(0, 0, 0, 0);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(start.getFullYear() + 1, 0, 1);
      end.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

export function shiftAnchor(view: CalendarView, anchor: Date, amount: number) {
  const next = new Date(anchor);
  switch (view) {
    case "day":
      next.setDate(next.getDate() + amount);
      break;
    case "week":
      next.setDate(next.getDate() + amount * 7);
      break;
    case "month":
      next.setMonth(next.getMonth() + amount);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + amount);
      break;
  }
  return next;
}

export function toApiDateTime(date: Date) {
  return date.toISOString();
}

export function formatHeaderRange(
  view: CalendarView,
  anchor: Date,
  locale = "ja-JP",
) {
  const { start, end } = getViewRange(view, anchor);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (view === "day") {
    return dateFormatter.format(start);
  }
  if (view === "week") {
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    return `${dateFormatter.format(start)} - ${dateFormatter.format(last)}`;
  }
  if (view === "month") {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
    }).format(start);
  }
  return new Intl.DateTimeFormat(locale, { year: "numeric" }).format(start);
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function enumerateDays(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  while (cursor < end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatTime(value: string, locale = "ja-JP") {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMonthDay(date: Date, locale = "ja-JP") {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function getCalendarColor(
  color: string | undefined,
  fallback = "#6B46C1",
) {
  return /^#[0-9A-Fa-f]{6}$/.test(color || "")
    ? (color as string).toUpperCase()
    : fallback;
}

export function getCalendarColorStyle(color: string | undefined) {
  const hex = getCalendarColor(color);
  const { r, g, b } = hexToRgb(hex);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.34)`,
    color: `rgb(${Math.max(0, r - 28)}, ${Math.max(0, g - 28)}, ${Math.max(0, b - 28)})`,
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}
