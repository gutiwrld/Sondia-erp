// Reglas de las tareas: agrupación por fecha y orden dentro de cada grupo.

import { addDays, weekEnd, type IsoDate } from "./dates";

export const TASK_STATUSES = ["por_hacer", "en_curso", "hecha"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["baja", "media", "alta"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  por_hacer: "Por hacer",
  en_curso: "En curso",
  hecha: "Hecha",
};

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}

export function isTaskPriority(v: unknown): v is TaskPriority {
  return typeof v === "string" && (TASK_PRIORITIES as readonly string[]).includes(v);
}

export type DueGroup = "atrasadas" | "hoy" | "esta_semana" | "mas_adelante" | "sin_fecha";

export const DUE_GROUP_LABELS: Record<DueGroup, string> = {
  atrasadas: "Atrasadas",
  hoy: "Hoy",
  esta_semana: "Esta semana",
  mas_adelante: "Más adelante",
  sin_fecha: "Sin fecha",
};

export const DUE_GROUP_ORDER: DueGroup[] = ["atrasadas", "hoy", "esta_semana", "mas_adelante", "sin_fecha"];

/**
 * Grupo de una tarea abierta según su fecha límite. «Esta semana» va de mañana
 * al domingo; el domingo, mañana ya es «Más adelante».
 */
export function dueGroup(due: IsoDate | null, today: IsoDate): DueGroup {
  if (!due) return "sin_fecha";
  if (due < today) return "atrasadas";
  if (due === today) return "hoy";
  if (due <= weekEnd(today)) return "esta_semana";
  return "mas_adelante";
}

type Sortable = { due_date: IsoDate | null; priority: TaskPriority; created_at: string };

const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };

/** Dentro de un grupo: fecha más cercana, luego prioridad alta, luego la más antigua. */
export function compareTasks(a: Sortable, b: Sortable): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function groupByDue<T extends Sortable>(tasks: T[], today: IsoDate): { group: DueGroup; tasks: T[] }[] {
  const buckets = new Map<DueGroup, T[]>(DUE_GROUP_ORDER.map((g) => [g, []]));
  for (const t of tasks) buckets.get(dueGroup(t.due_date, today))!.push(t);
  return DUE_GROUP_ORDER.map((group) => ({ group, tasks: buckets.get(group)!.sort(compareTasks) })).filter(
    (g) => g.tasks.length > 0,
  );
}

/** Las hechas solo se enseñan si se terminaron en los últimos 7 días. */
export function isRecentlyDone(completedAt: string | null, today: IsoDate): boolean {
  if (!completedAt) return false;
  return completedAt.slice(0, 10) >= addDays(today, -7);
}

/** Enlace a una tarea (abre su panel en /tareas). */
export function taskHref(id: string) {
  return `/tareas?tarea=${id}&persona=equipo`;
}
