"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLinkOptions, type LinkOption } from "@/lib/data/hours";
import { addDays, isIsoDate, todayInMadrid } from "@/lib/dates";
import { parseDuration } from "@/lib/duration";
import { CATEGORY_LABELS, entryFromTimer, isHourCategory, type HourCategory } from "@/lib/hours";
import { formatDuration } from "@/lib/format";

export type LogResult =
  | { ok: true; id: string; message: string; category: HourCategory }
  | { ok: false; error: string; field?: "duration" | "category" | "date" | "link" | "note" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseLink(value: FormDataEntryValue | null): { client_id: string | null; task_id: string | null } | null {
  const raw = String(value ?? "");
  if (!raw) return { client_id: null, task_id: null };
  const [kind, id] = raw.split(":");
  if (!id || !UUID_RE.test(id)) return null;
  if (kind === "c") return { client_id: id, task_id: null };
  if (kind === "t") return { client_id: null, task_id: id };
  return null;
}

function parseEntryForm(formData: FormData) {
  const today = todayInMadrid();
  const minutes = parseDuration(String(formData.get("duration") ?? ""));
  if (minutes === null) {
    return { error: "Escribe cuánto tiempo: 1,5 · 1h30 · 90m.", field: "duration" as const };
  }
  const category = formData.get("category");
  if (!isHourCategory(category)) return { error: "Elige una categoría.", field: "category" as const };

  const date = String(formData.get("date") ?? today);
  if (!isIsoDate(date)) return { error: "La fecha no es válida.", field: "date" as const };
  if (date > today) return { error: "No se pueden apuntar horas de días que aún no han llegado.", field: "date" as const };
  if (date < addDays(today, -366)) return { error: "La fecha es de hace más de un año.", field: "date" as const };

  const link = parseLink(formData.get("link"));
  if (!link) return { error: "El cliente o la tarea no es válido.", field: "link" as const };

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 500) return { error: "La nota no puede pasar de 500 caracteres.", field: "note" as const };

  return { value: { minutes, category, date, note, ...link } };
}

export async function logHours(formData: FormData): Promise<LogResult> {
  const me = await getCurrentMember();
  const parsed = parseEntryForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const fromTimer = formData.get("fromTimer") === "1";
  let started_at: string | null = null;
  let ended_at: string | null = null;
  if (fromTimer) {
    const { data: timer } = await supabase.from("timers").select("started_at").eq("member_id", me.id).maybeSingle();
    if (timer) {
      started_at = timer.started_at;
      ended_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({ ...parsed.value, member_id: me.id, created_by: me.id, started_at, ended_at })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se han podido guardar las horas. Inténtalo otra vez." };

  if (fromTimer) await supabase.from("timers").delete().eq("member_id", me.id);

  revalidatePath("/", "layout");
  return {
    ok: true,
    id: data.id,
    category: parsed.value.category,
    message: `Apuntadas ${formatDuration(parsed.value.minutes)} de ${CATEGORY_LABELS[parsed.value.category]}`,
  };
}

export async function updateEntry(id: string, formData: FormData): Promise<LogResult> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Entrada no válida." };
  const parsed = parseEntryForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .update(parsed.value)
    .eq("id", id)
    .eq("member_id", me.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: "No se han podido guardar los cambios." };
  if (!data) return { ok: false, error: "Solo puedes editar tus propias horas." };

  revalidatePath("/", "layout");
  return { ok: true, id, category: parsed.value.category, message: "Cambios guardados" };
}

export async function deleteEntry(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Entrada no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id)
    .eq("member_id", me.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "No se ha podido borrar. Solo puedes borrar tus horas." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function startTimer(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentMember();
  const category = formData.get("category");
  const link = parseLink(formData.get("link")) ?? { client_id: null, task_id: null };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  const supabase = await createClient();
  const { error } = await supabase.from("timers").upsert(
    {
      member_id: me.id,
      started_at: new Date().toISOString(),
      category: isHourCategory(category) ? category : null,
      note,
      ...link,
    },
    { onConflict: "member_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "No se ha podido iniciar el cronómetro." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Datos para rellenar el formulario al parar el cronómetro (no lo borra). */
export async function stopTimerPreview(): Promise<
  | { ok: true; minutes: number; date: string; valid: boolean; category: HourCategory | null; link: string; note: string }
  | { ok: false; error: string }
> {
  const me = await getCurrentMember();
  const supabase = await createClient();
  const { data: timer } = await supabase.from("timers").select("*").eq("member_id", me.id).maybeSingle();
  if (!timer) return { ok: false, error: "No hay ningún cronómetro en marcha." };
  const entry = entryFromTimer(new Date(timer.started_at), new Date());
  return {
    ok: true,
    minutes: entry.minutes,
    date: entry.date,
    valid: entry.valid,
    category: timer.category,
    link: timer.client_id ? `c:${timer.client_id}` : timer.task_id ? `t:${timer.task_id}` : "",
    note: timer.note,
  };
}

export async function discardTimer(): Promise<{ ok: boolean }> {
  const me = await getCurrentMember();
  const supabase = await createClient();
  await supabase.from("timers").delete().eq("member_id", me.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function loadLinkOptions(): Promise<LinkOption[]> {
  await getCurrentMember();
  return getLinkOptions();
}
