"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, getMembers } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate, isoWeekday } from "@/lib/dates";

export type GoalResult = { ok: true; message: string } | { ok: false; error: string; field?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseGoalForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Escribe el objetivo.", field: "title" };
  if (title.length > 300) return { error: "El objetivo no puede pasar de 300 caracteres.", field: "title" };

  const days = [...new Set(formData.getAll("days").map(Number))].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  days.sort((a, b) => a - b);

  const members = await getMembers();
  const valid = new Set(members.map((m) => m.id));
  const owners = [...new Set(formData.getAll("owners").map(String))].filter((id) => valid.has(id));
  if (owners.length === 0) return { error: "Elige al menos un responsable.", field: "owners" };

  return { value: { title, days }, owners };
}

export async function createGoal(week: string, formData: FormData): Promise<GoalResult> {
  await getCurrentMember();
  if (!isIsoDate(week) || isoWeekday(week) !== 1) return { ok: false, error: "Semana no válida." };
  const parsed = await parseGoalForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("weekly_goals")
    .select("position")
    .eq("week_start", week)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("weekly_goals")
    .insert({ ...parsed.value, week_start: week, position: (last?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se ha podido crear el objetivo." };

  const { error: ownersError } = await supabase
    .from("weekly_goal_owners")
    .insert(parsed.owners.map((member_id) => ({ weekly_goal_id: data.id, member_id })));
  if (ownersError) {
    await supabase.from("weekly_goals").delete().eq("id", data.id);
    return { ok: false, error: "No se han podido guardar los responsables." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Objetivo añadido" };
}

export async function updateGoal(id: string, formData: FormData): Promise<GoalResult> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Objetivo no válido." };
  const parsed = await parseGoalForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data, error } = await supabase.from("weekly_goals").update(parsed.value).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "No se han podido guardar los cambios." };
  if (!data) return { ok: false, error: "Este objetivo ya no existe." };

  const { data: current } = await supabase.from("weekly_goal_owners").select("member_id").eq("weekly_goal_id", id);
  const before = new Set((current ?? []).map((o) => o.member_id));
  const after = new Set(parsed.owners);
  const toAdd = [...after].filter((m) => !before.has(m));
  const toRemove = [...before].filter((m) => !after.has(m));
  if (toAdd.length) {
    await supabase.from("weekly_goal_owners").insert(toAdd.map((member_id) => ({ weekly_goal_id: id, member_id })));
  }
  if (toRemove.length) {
    await supabase.from("weekly_goal_owners").delete().eq("weekly_goal_id", id).in("member_id", toRemove);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Cambios guardados" };
}

export async function deleteGoal(id: string): Promise<{ ok: boolean; error?: string }> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Objetivo no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("weekly_goals").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "No se ha podido borrar el objetivo." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function carryOverGoals(week: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  await getCurrentMember();
  if (!isIsoDate(week) || isoWeekday(week) !== 1) return { ok: false, error: "Semana no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("carry_over_goals", { p_to_week: week });
  if (error) return { ok: false, error: "No se han podido pasar los objetivos." };
  revalidatePath("/", "layout");
  return { ok: true, count: data ?? 0 };
}
