import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, weekStart, type IsoDate } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type MyTask = {
  id: string;
  title: string;
  status: Enums["task_status"];
  priority: Enums["task_priority"];
  due_date: IsoDate | null;
  client: { id: string; name: string } | null;
  owners: { member_id: string }[];
};

/** Mis tareas abiertas que vencen hoy o ya han vencido. */
export async function getMyTasksDue(memberId: string, today: IsoDate): Promise<MyTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, client:clients(id, name), owners:task_owners(member_id), mine:task_owners!inner(member_id)",
    )
    .eq("mine.member_id", memberId)
    .neq("status", "hecha")
    .lte("due_date", today)
    .order("due_date")
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ mine: _mine, ...t }) => t) as MyTask[];
}

/** Mis tareas abiertas en total (para el indicador). */
export async function countMyOpenTasks(memberId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id, mine:task_owners!inner(member_id)", { count: "exact", head: true })
    .eq("mine.member_id", memberId)
    .neq("status", "hecha");
  if (error) throw error;
  return count ?? 0;
}

export type MyClientAction = {
  id: string;
  name: string;
  stage: Enums["client_stage"];
  next_action: string;
  next_action_date: IsoDate;
};

/** Mis próximas acciones con clientes: vencidas y de los próximos 7 días. */
export async function getMyClientActions(memberId: string, today: IsoDate): Promise<MyClientAction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, stage, next_action, next_action_date, mine:client_owners!inner(member_id)")
    .eq("mine.member_id", memberId)
    .eq("do_not_contact", false)
    .neq("stage", "perdido")
    .not("next_action_date", "is", null)
    .lte("next_action_date", addDays(today, 7))
    .order("next_action_date");
  if (error) throw error;
  return (data ?? []).map(({ mine: _mine, ...c }) => c) as MyClientAction[];
}

export type MyGoal = {
  id: string;
  title: string;
  days: number[];
  status: Enums["goal_status"];
  carried_from_id: string | null;
  owners: { member_id: string }[];
};

export async function getMyGoals(memberId: string, today: IsoDate): Promise<MyGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("id, title, days, status, carried_from_id, position, owners:weekly_goal_owners(member_id), mine:weekly_goal_owners!inner(member_id)")
    .eq("mine.member_id", memberId)
    .eq("week_start", weekStart(today))
    .order("position");
  if (error) throw error;
  return (data ?? []).map(({ mine: _mine, position: _p, ...g }) => g) as MyGoal[];
}

export type MyLp = {
  id: string;
  number: number | null;
  title: string;
  status: Enums["lp_status"];
  due_date: IsoDate | null;
};

export async function getMyLps(memberId: string): Promise<MyLp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_paths")
    .select("id, number, title, status, due_date")
    .eq("owner_id", memberId)
    .in("status", ["idea", "en_curso", "entregada"])
    .order("due_date", { nullsFirst: false })
    .order("number", { nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as MyLp[];
}

export type MyObv = {
  id: string;
  number: number | null;
  type: Enums["obv_type"];
  interviewee: string;
  company: string;
  meeting_date: IsoDate;
};

/** Mis OBVs sin redactar. */
export async function getMyPendingObvs(memberId: string): Promise<MyObv[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obvs")
    .select("id, number, type, interviewee, company, meeting_date")
    .eq("owner_id", memberId)
    .is("written_date", null)
    .order("meeting_date");
  if (error) throw error;
  return (data ?? []) as MyObv[];
}
