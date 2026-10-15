// Fechas de calendario en Europe/Madrid.
//
// Trabajamos con fechas ISO (`YYYY-MM-DD`) como valores de calendario, igual
// que la columna `date` de Postgres. La aritmética se hace en UTC puro sobre
// esas fechas para que el cambio de hora no desplace ningún día.

export const TIME_ZONE = "Europe/Madrid";

export type IsoDate = string; // YYYY-MM-DD

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de calendario en Madrid para un instante dado. */
export function madridDate(instant: Date): IsoDate {
  return isoFormatter.format(instant);
}

export function todayInMadrid(now: Date = new Date()): IsoDate {
  return madridDate(now);
}

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): value is IsoDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtc(toUtc(value)) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Días de diferencia `b - a` entre dos fechas de calendario. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Día ISO de la semana: 1 = lunes … 7 = domingo. */
export function isoWeekday(date: IsoDate): number {
  const day = toUtc(date).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Lunes de la semana (lunes a domingo) que contiene la fecha. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekEnd(date: IsoDate): IsoDate {
  return addDays(weekStart(date), 6);
}

export function weekDays(date: IsoDate): IsoDate[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Número de semana ISO 8601. */
export function isoWeekNumber(date: IsoDate): number {
  const thursday = toUtc(addDays(date, 4 - isoWeekday(date)));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function isInWeek(date: IsoDate, anyDayOfWeek: IsoDate): boolean {
  const start = weekStart(anyDayOfWeek);
  return date >= start && date <= addDays(start, 6);
}
