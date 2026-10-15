// Formato en castellano de España: 1.234,56 € · 7,5 h · lun 13 oct.

import { TIME_ZONE, type IsoDate } from "./dates";

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});
const eurRound = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const hoursNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, useGrouping: "always" });

/** 1.234,56 € (o 1.235 € con `round`). */
export function formatEur(value: number, { round = false } = {}): string {
  return (round ? eurRound : eur).format(value);
}

/** 450 → «7,5 h». */
export function formatHours(minutes: number): string {
  return `${hoursNumber.format(minutes / 60)} h`;
}

/** 90 → «1 h 30 min» · 45 → «45 min» · 120 → «2 h». */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** 90 → «1:30» para cronómetros y columnas. */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function fromIso(date: IsoDate): Date {
  // Mediodía UTC: el mismo día de calendario en Madrid todo el año.
  return new Date(`${date}T12:00:00Z`);
}

const shortDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});
const dayMonth = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const longDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const weekdayLong = new Intl.DateTimeFormat("es-ES", { weekday: "long", timeZone: TIME_ZONE });
const weekdayShort = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: TIME_ZONE });
const timeOfDay = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** «lun 13 oct» */
export function formatShortDate(date: IsoDate): string {
  return shortDate.format(fromIso(date)).replace(",", "").replace(".", "");
}

/** «13 oct» */
export function formatDayMonth(date: IsoDate): string {
  return dayMonth.format(fromIso(date)).replace(".", "");
}

/** «jueves 15 de octubre» */
export function formatLongDate(date: IsoDate): string {
  return longDate.format(fromIso(date)).replace(",", "");
}

/** «Lunes» */
export function formatWeekday(date: IsoDate, { short = false } = {}): string {
  const s = (short ? weekdayShort : weekdayLong).format(fromIso(date)).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «Semana del 12 al 18 de oct» */
export function formatWeekRange(start: IsoDate, end: IsoDate): string {
  const [, sm] = start.split("-");
  const [, em] = end.split("-");
  const startDay = Number(start.slice(8));
  if (sm === em) return `${startDay}–${formatDayMonth(end)}`;
  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

/** «16:05» */
export function formatTime(instant: Date): string {
  return timeOfDay.format(instant);
}

/** «hoy», «ayer», «mañana», «hace 3 días», «en 2 días» */
export function formatRelativeDay(date: IsoDate, today: IsoDate): string {
  const diff = Math.round((fromIso(date).getTime() - fromIso(today).getTime()) / 86_400_000);
  if (diff === 0) return "hoy";
  if (diff === -1) return "ayer";
  if (diff === 1) return "mañana";
  if (diff < 0) return `hace ${-diff} días`;
  return `en ${diff} días`;
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("es-ES", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now),
  );
  if (hour < 6) return "Buenas noches";
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}
