import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, weekStart, type IsoDate } from "@/lib/dates";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: IsoDate | null;
  completed_at: string | null;
  created_at: string;
  client: { id: string; name: string } | null;
  learning_path: { id: string; number: number | null; title: string } | null;
  weekly_goal: { id: string; title: string; week_start: IsoDate } | null;
  owners: { member_id: string }[];
  minutes: number;
};

const TASK_COLUMNS =
  "id, title, description, status, priority, due_date, completed_at, created_at, client:clients(id, name), learning_path:learning_paths(id, number, title), weekly_goal:weekly_goals(id, title, week_start), owners:task_owners(member_id)";

/**
 * Tareas abiertas y las hechas en los últimos 7 días. `ownerId` filtra por
 * responsable (null = todo el equipo).
 */
export async function getTasks({ ownerId, today }: { ownerId: string | null; today: IsoDate }): Promise<Task[]> {
  const supabase = await createClient();
  const columns = ownerId ? `${TASK_COLUMNS}, mine:task_owners!inner(member_id)` : TASK_COLUMNS;
  let query = supabase
    .from("tasks")
    .select(columns)
    .or(`status.neq.hecha,completed_at.gte.${addDays(today, -7)}`)
    .order("created_at");
  if (ownerId) query = query.eq("mine.member_id", ownerId);
  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as (Omit<Task, "minutes"> & { mine?: unknown })[];
  const ids = rows.map((t) => t.id);
  const minutes = new Map<string, number>();
  if (ids.length) {
    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("task_id, minutes")
      .in("task_id", ids);
    if (entriesError) throw entriesError;
    for (const e of entries ?? []) minutes.set(e.task_id!, (minutes.get(e.task_id!) ?? 0) + e.minutes);
  }
  return rows.map(({ mine: _mine, ...t }) => ({ ...t, minutes: minutes.get(t.id) ?? 0 }));
}

export type TaskLinkOptions = {
  clients: { id: string; name: string }[];
  learningPaths: { id: string; label: string }[];
  goals: { id: string; title: string; week_start: IsoDate }[];
};

/** Lo que se puede vincular a una tarea: clientes activos, LPs abiertas y objetivos de esta semana y la siguiente. */
export async function getTaskLinkOptions(today: IsoDate): Promise<TaskLinkOptions> {
  const supabase = await createClient();
  const thisWeek = weekStart(today);
  const [clients, lps, goals] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .in("stage", ["respondio", "reunion", "maqueta_enviada", "propuesta_enviada", "negociacion", "ganado"])
      .eq("do_not_contact", false)
      .order("name"),
    supabase.from("learning_paths").select("id, number, title").neq("status", "validada").order("number"),
    supabase
      .from("weekly_goals")
      .select("id, title, week_start")
      .in("week_start", [thisWeek, addDays(thisWeek, 7)])
      .neq("status", "arrastrado")
      .order("week_start")
      .order("position"),
  ]);
  for (const r of [clients, lps, goals]) if (r.error) throw r.error;
  return {
    clients: clients.data ?? [],
    learningPaths: (lps.data ?? []).map((lp) => ({
      id: lp.id,
      label: `${lp.number ? `LP ${lp.number} · ` : "LP · "}${lp.title}`,
    })),
    goals: goals.data ?? [],
  };
}
