"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GoalStatus = Database["public"]["Enums"]["goal_status"];
const GOAL_STATUSES: GoalStatus[] = ["pendiente", "en_curso", "hecho", "no_hecho"];

/** Marca una tarea como hecha o la reabre (desde Mi espacio). */
export async function setTaskDone(taskId: string, done: boolean): Promise<{ ok: boolean; error?: string }> {
  await getCurrentMember();
  if (!UUID_RE.test(taskId)) return { ok: false, error: "Tarea no válida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: done ? "hecha" : "por_hacer" })
    .eq("id", taskId);
  if (error) return { ok: false, error: "No se ha podido actualizar la tarea." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setGoalStatus(goalId: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await getCurrentMember();
  if (!UUID_RE.test(goalId)) return { ok: false, error: "Objetivo no válido." };
  if (!GOAL_STATUSES.includes(status as GoalStatus)) return { ok: false, error: "Estado no válido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("weekly_goals")
    .update({ status: status as GoalStatus })
    .eq("id", goalId);
  if (error) return { ok: false, error: "No se ha podido actualizar el objetivo." };
  revalidatePath("/", "layout");
  return { ok: true };
}
