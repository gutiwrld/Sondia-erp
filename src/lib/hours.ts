// Reglas de horas: suma semanal, ritmo esperado y entradas del cronómetro.

import {
  addDays,
  isInWeek,
  isoWeekday,
  madridDate,
  weekStart,
  type IsoDate,
} from "./dates";

export const HOUR_CATEGORIES = [
  "ventas",
  "desarrollo",
  "clientes",
  "lp_obv",
  "gestion",
  "formacion",
] as const;
export type HourCategory = (typeof HOUR_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<HourCategory, string> = {
  ventas: "Ventas",
  desarrollo: "Desarrollo",
  clientes: "Clientes",
  lp_obv: "LP/OBV",
  gestion: "Gestión",
  formacion: "Formación",
};

export function isHourCategory(value: unknown): value is HourCategory {
  return typeof value === "string" && (HOUR_CATEGORIES as readonly string[]).includes(value);
}

export type EntryLike = {
  member_id: string;
  date: IsoDate;
  minutes: number;
  category: HourCategory;
};

/** Minutos de la semana (lunes a domingo) que contiene `anyDay`. */
export function weekMinutes(entries: EntryLike[], anyDay: IsoDate, memberId?: string): number {
  return entries
    .filter((e) => (memberId ? e.member_id === memberId : true) && isInWeek(e.date, anyDay))
    .reduce((sum, e) => sum + e.minutes, 0);
}

export function minutesByMember(entries: EntryLike[], anyDay: IsoDate): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (!isInWeek(e.date, anyDay)) continue;
    totals.set(e.member_id, (totals.get(e.member_id) ?? 0) + e.minutes);
  }
  return totals;
}

/** Minutos por día de la semana, de lunes [0] a domingo [6]. */
export function minutesByWeekday(entries: EntryLike[], anyDay: IsoDate, memberId?: string): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    if (memberId && e.member_id !== memberId) continue;
    if (!isInWeek(e.date, anyDay)) continue;
    days[isoWeekday(e.date) - 1] += e.minutes;
  }
  return days;
}

export function minutesByCategory(
  entries: EntryLike[],
  anyDay: IsoDate,
  memberId?: string,
): Record<HourCategory, number> {
  const totals = Object.fromEntries(HOUR_CATEGORIES.map((c) => [c, 0])) as Record<HourCategory, number>;
  for (const e of entries) {
    if (memberId && e.member_id !== memberId) continue;
    if (!isInWeek(e.date, anyDay)) continue;
    totals[e.category] += e.minutes;
  }
  return totals;
}

/**
 * Minutos que «tocaría» llevar a estas alturas de la semana para ir al ritmo
 * del objetivo: objetivo × días laborables transcurridos (incluido hoy) ÷ 5.
 * El fin de semana cuenta como el 100 %. Si `today` no es de la semana
 * consultada, la semana pasada vale 100 % y una futura 0 %.
 */
export function expectedMinutes(goalHours: number, week: IsoDate, today: IsoDate): number {
  const start = weekStart(week);
  const goal = Math.round(goalHours * 60);
  if (today < start) return 0;
  if (today > addDays(start, 6)) return goal;
  const workdays = Math.min(isoWeekday(today), 5);
  return Math.round((goal * workdays) / 5);
}

export type Pace = "por_delante" | "al_dia" | "por_detras";

/** Margen de una hora antes de avisar de que vas por detrás. */
export function paceOf(done: number, expected: number, toleranceMinutes = 60): Pace {
  if (done >= expected + toleranceMinutes) return "por_delante";
  if (done >= expected - toleranceMinutes) return "al_dia";
  return "por_detras";
}

export const MAX_ENTRY_MINUTES = 1440;

/**
 * Convierte un cronómetro en una entrada de horas. La entrada cuenta en el día
 * (hora de Madrid) en que empezó, aunque cruce la medianoche.
 */
export function entryFromTimer(startedAt: Date, stoppedAt: Date) {
  const minutes = Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60_000);
  return {
    date: madridDate(startedAt),
    minutes,
    valid: minutes >= 1 && minutes <= MAX_ENTRY_MINUTES,
  };
}
