import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, type IsoDate } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

export type GoalStatus = Database["public"]["Enums"]["goal_status"];

export type Goal = {
  id: string;
  title: string;
  days: number[];
  status: GoalStatus;
  position: number;
  carried_from_id: string | null;
  owners: { member_id: string }[];
  tasks: { id: string; status: Database["public"]["Enums"]["task_status"] }[];
};

export async function getWeekGoals(week: IsoDate): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("id, title, days, status, position, carried_from_id, owners:weekly_goal_owners(member_id), tasks(id, status)")
    .eq("week_start", week)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Goal[];
}

/** Objetivos de la semana anterior que siguen sin terminar y no se han arrastrado. */
export async function countPendingFromPreviousWeek(week: IsoDate): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("weekly_goals")
    .select("id", { count: "exact", head: true })
    .eq("week_start", addDays(week, -7))
    .in("status", ["pendiente", "en_curso"]);
  if (error) throw error;
  return count ?? 0;
}
