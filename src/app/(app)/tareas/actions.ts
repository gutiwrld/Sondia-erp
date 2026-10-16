"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, getMembers } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate } from "@/lib/dates";
import { isTaskPriority, isTaskStatus, type TaskStatus } from "@/lib/tasks";

export type TaskResult = { ok: true; id: string; message: string } | { ok: false; error: string; field?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalUuid(value: FormDataEntryValue | null): string | null | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return UUID_RE.test(raw) ? raw : undefined; // undefined = no válido
}

async function parseTaskForm(formData: FormData, meId: string) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Escribe qué hay que hacer.", field: "title" };
  if (title.length > 300) return { error: "El título no puede pasar de 300 caracteres.", field: "title" };

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > 5000) return { error: "La descripción es demasiado larga.", field: "description" };

  const status = formData.get("status") ?? "por_hacer";
  if (!isTaskStatus(status)) return { error: "Estado no válido.", field: "status" };
  const priority = formData.get("priority") ?? "media";
  if (!isTaskPriority(priority)) return { error: "Prioridad no válida.", field: "priority" };

  const dueRaw = String(formData.get("due_date") ?? "").trim();
  if (dueRaw && !isIsoDate(dueRaw)) return { error: "La fecha no es válida.", field: "due_date" };

  const client_id = optionalUuid(formData.get("client_id"));
  const learning_path_id = optionalUuid(formData.get("learning_path_id"));
  const weekly_goal_id = optionalUuid(formData.get("weekly_goal_id"));
  if (client_id === undefined || learning_path_id === undefined || weekly_goal_id === undefined) {
    return { error: "El vínculo no es válido.", field: "link" };
  }

  const members = await getMembers();
  const memberIds = new Set(members.map((m) => m.id));
  const owners = formData.getAll("owners").map(String).filter((id) => memberIds.has(id));
  if (owners.length === 0) owners.push(meId);

  return {
    value: {
      title,
      description,
      status: status as TaskStatus,
      priority,
      due_date: dueRaw || null,
      client_id,
      learning_path_id,
      weekly_goal_id,
    },
    owners: [...new Set(owners)],
  };
}

export async function createTask(formData: FormData): Promise<TaskResult> {
  const me = await getCurrentMember();
  const parsed = await parseTaskForm(formData, me.id);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.value, created_by: me.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se ha podido crear la tarea." };

  const { error: ownersError } = await supabase
    .from("task_owners")
    .insert(parsed.owners.map((member_id) => ({ task_id: data.id, member_id })));
  if (ownersError) {
    await supabase.from("tasks").delete().eq("id", data.id);
    return { ok: false, error: "No se han podido guardar los responsables." };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: data.id, message: "Tarea creada" };
}

export async function updateTask(id: string, formData: FormData): Promise<TaskResult> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Tarea no válida." };
  const parsed = await parseTaskForm(formData, me.id);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(parsed.value).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "No se han podido guardar los cambios." };
  if (!data) return { ok: false, error: "Esta tarea ya no existe." };

  // Responsables: se añaden los nuevos y se quitan los que sobran.
  const { data: current } = await supabase.from("task_owners").select("member_id").eq("task_id", id);
  const before = new Set((current ?? []).map((o) => o.member_id));
  const after = new Set(parsed.owners);
  const toAdd = [...after].filter((m) => !before.has(m));
  const toRemove = [...before].filter((m) => !after.has(m));
  if (toAdd.length) await supabase.from("task_owners").insert(toAdd.map((member_id) => ({ task_id: id, member_id })));
  if (toRemove.length) await supabase.from("task_owners").delete().eq("task_id", id).in("member_id", toRemove);

  revalidatePath("/", "layout");
  return { ok: true, id, message: "Cambios guardados" };
}

export async function setTaskStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Tarea no válida." };
  if (!isTaskStatus(status)) return { ok: false, error: "Estado no válido." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "No se ha podido mover la tarea." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<{ ok: boolean; error?: string }> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Tarea no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "No se ha podido borrar la tarea." };
  revalidatePath("/", "layout");
  return { ok: true };
}
