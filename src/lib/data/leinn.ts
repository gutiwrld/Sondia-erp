import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { IsoDate } from "@/lib/dates";

type Enums = Database["public"]["Enums"];

export type Lp = {
  id: string;
  number: number | null;
  title: string;
  owner_id: string;
  status: Enums["lp_status"];
  due_date: IsoDate | null;
  validators: string;
  doc_url: string;
  notes: string;
  obv_count: number;
  open_tasks: number;
};

export async function getLps(): Promise<Lp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_paths")
    .select("id, number, title, owner_id, status, due_date, validators, doc_url, notes, obvs(id), tasks(id, status)")
    .order("due_date", { nullsFirst: false })
    .order("number", { nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(({ obvs, tasks, ...lp }) => ({
    ...lp,
    obv_count: obvs?.length ?? 0,
    open_tasks: (tasks ?? []).filter((t) => t.status !== "hecha").length,
  }));
}

export type Obv = {
  id: string;
  number: number | null;
  type: Enums["obv_type"];
  owner_id: string;
  interviewee: string;
  company: string;
  client: { id: string; name: string } | null;
  learning_path: { id: string; number: number | null; title: string } | null;
  meeting_date: IsoDate;
  written_date: IsoDate | null;
  doc_url: string;
  notes: string;
};

export async function getObvs(): Promise<Obv[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obvs")
    .select(
      "id, number, type, owner_id, interviewee, company, meeting_date, written_date, doc_url, notes, client:clients(id, name), learning_path:learning_paths(id, number, title)",
    )
    .order("meeting_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Obv[];
}

/** Clientes para vincular una OBV: los que han pasado de Contactado. */
export async function getObvClientOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .not("stage", "in", "(lead,contactado)")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
