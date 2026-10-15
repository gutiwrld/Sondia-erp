import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { IsoDate } from "@/lib/dates";
import type { HourCategory } from "@/lib/hours";

export type TimeEntry = {
  id: string;
  member_id: string;
  date: IsoDate;
  minutes: number;
  category: HourCategory;
  note: string;
  client: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export async function getEntries({
  from,
  to,
  memberId,
}: {
  from: IsoDate;
  to: IsoDate;
  memberId?: string;
}): Promise<TimeEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("time_entries")
    .select(
      "id, member_id, date, minutes, category, note, started_at, ended_at, created_at, client:clients(id, name), task:tasks(id, title)",
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}

export type Timer = {
  member_id: string;
  started_at: string;
  category: HourCategory | null;
  note: string;
  client: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
};

export async function getTimer(memberId: string): Promise<Timer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timers")
    .select("member_id, started_at, category, note, client:clients(id, name), task:tasks(id, title)")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) throw error;
  return (data as Timer | null) ?? null;
}

export type LinkOption = { value: string; label: string; group: "clientes" | "tareas" };

/**
 * Clientes y tareas a los que se pueden vincular horas: clientes del pipeline
 * activo (desde «Respondió», sin «No contactar») y tareas abiertas.
 */
export async function getLinkOptions(): Promise<LinkOption[]> {
  const supabase = await createClient();
  const [clients, tasks] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .in("stage", ["respondio", "reunion", "maqueta_enviada", "propuesta_enviada", "negociacion", "ganado"])
      .eq("do_not_contact", false)
      .order("name"),
    supabase.from("tasks").select("id, title").neq("status", "hecha").order("due_date", { nullsFirst: false }).limit(100),
  ]);
  if (clients.error) throw clients.error;
  if (tasks.error) throw tasks.error;
  return [
    ...(clients.data ?? []).map((c) => ({ value: `c:${c.id}`, label: c.name, group: "clientes" as const })),
    ...(tasks.data ?? []).map((t) => ({ value: `t:${t.id}`, label: t.title, group: "tareas" as const })),
  ];
}
