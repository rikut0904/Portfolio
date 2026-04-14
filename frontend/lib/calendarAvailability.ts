import { startOfDay } from "./calendar";

/** 予定の重なり判定用（normalize 済みイベントと同等の形） */
export type CalendarBusyEvent = {
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
};

/** モーダルで選べる MTG の長さ（分） */
export const MTG_DURATION_OPTIONS_MINUTES = [30, 60, 90, 120, 180] as const;

function intersectsDay(event: CalendarBusyEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return event.endDate > dayStart && event.startDate < dayEnd;
}

function clipEventToDay(event: CalendarBusyEvent, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return {
    start: event.startDate > dayStart ? event.startDate : dayStart,
    end: event.endDate < dayEnd ? event.endDate : dayEnd,
  };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function hasAllDayOnDay(day: Date, allDayEvents: CalendarBusyEvent[]): boolean {
  return allDayEvents.some((e) => intersectsDay(e, day));
}

function timedSlotOverlapsBusy(
  slotStart: Date,
  slotEnd: Date,
  day: Date,
  timedEvents: CalendarBusyEvent[],
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

/**
 * 指定した表示時間帯（分単位の [displayStartHour, displayEndHour]）の範囲に収まり、
 * 予定と重ならない MTG 候補。開始は 30 分刻み。
 */
export function getFreeSlotsInDisplayRange(
  day: Date,
  timedEvents: CalendarBusyEvent[],
  allDayEvents: CalendarBusyEvent[],
  durationMinutes: number,
  displayStartHour: number,
  displayEndHour: number,
): { start: Date; end: Date }[] {
  if (durationMinutes <= 0 || hasAllDayOnDay(day, allDayEvents)) {
    return [];
  }
  const displayMinStart = displayStartHour * 60;
  const displayMinEnd = displayEndHour * 60;
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const windowStart = new Date(dayStart.getTime() + displayMinStart * 60 * 1000);
  const windowEnd = new Date(dayStart.getTime() + displayMinEnd * 60 * 1000);
  const maxStartMs = windowEnd.getTime() - durationMinutes * 60 * 1000;
  if (maxStartMs < windowStart.getTime()) {
    return [];
  }

  const slots: { start: Date; end: Date }[] = [];
  for (let t = windowStart.getTime(); t <= maxStartMs; t += 30 * 60 * 1000) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + durationMinutes * 60 * 1000);
    if (slotEnd > dayEnd) {
      break;
    }
    if (!timedSlotOverlapsBusy(slotStart, slotEnd, day, timedEvents)) {
      slots.push({ start: slotStart, end: slotEnd });
    }
  }
  return slots;
}

export function hasAnyFreeSlotInDisplayRange(
  day: Date,
  timedEvents: CalendarBusyEvent[],
  allDayEvents: CalendarBusyEvent[],
  displayStartHour: number,
  displayEndHour: number,
): boolean {
  return MTG_DURATION_OPTIONS_MINUTES.some(
    (d) =>
      getFreeSlotsInDisplayRange(day, timedEvents, allDayEvents, d, displayStartHour, displayEndHour).length > 0,
  );
}
