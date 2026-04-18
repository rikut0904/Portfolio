import holiday_jp from "@holiday-jp/holiday_jp";

/** 土曜=青 / 日曜・祝日=赤 / 平日は neutral */
export type WeekDateHeaderVariant = "saturday" | "sundayOrHoliday" | "weekday";

export function getWeekDateHeaderVariant(day: Date): WeekDateHeaderVariant {
  const w = day.getDay();
  if (w === 6) {
    return "saturday";
  }
  if (w === 0) {
    return "sundayOrHoliday";
  }
  if (holiday_jp.isHoliday(day)) {
    return "sundayOrHoliday";
  }
  return "weekday";
}

export function weekDateHeaderContainerClass(v: WeekDateHeaderVariant): string {
  const base =
    "rounded-2xl border px-2 py-2 text-center sm:rounded-3xl sm:px-3 sm:py-2.5 transition-colors";
  switch (v) {
    case "saturday":
      return `${base} border-blue-200/90 bg-blue-100/95`;
    case "sundayOrHoliday":
      return `${base} border-red-200/90 bg-red-100/95`;
    default:
      return `${base} border-[var(--card-border)] bg-white/85`;
  }
}

export function weekDateHeaderWeekdayClass(v: WeekDateHeaderVariant): string {
  const base =
    "text-[10px] uppercase tracking-[0.15em] sm:text-xs sm:tracking-[0.2em]";
  switch (v) {
    case "saturday":
      return `${base} text-blue-800/95`;
    case "sundayOrHoliday":
      return `${base} text-red-800/95`;
    default:
      return `${base} text-[var(--text-body)]`;
  }
}

export function weekDateHeaderDateClass(v: WeekDateHeaderVariant): string {
  const base = "mt-0.5 text-xs font-semibold leading-tight sm:text-sm";
  switch (v) {
    case "saturday":
      return `${base} text-blue-950`;
    case "sundayOrHoliday":
      return `${base} text-red-950`;
    default:
      return `${base} text-[var(--text-heading)]`;
  }
}
