import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { IsoDate } from "@/lib/dates";

type Enums = Database["public"]["Enums"];
type Row = Database["public"]["Tables"]["clients"]["Row"];

export type ClientListItem = Pick<
  Row,
  | "id"
  | "name"
  | "sector"
  | "city"
  | "province"
  | "website"
  | "email"
  | "phone"
  | "stage"
  | "service"
  | "value_eur"
  | "next_action"
  | "next_action_date"
  | "do_not_contact"
  | "email_bounced"
  | "lost_reason"
  | "batch"
  | "send_account"
  | "updated_at"
> & { owners: { member_id: string }[] };

const LIST_COLUMNS =
  "id, name, sector, city, province, website, email, phone, stage, service, value_eur, next_action, next_action_date, do_not_contact, email_bounced, lost_reason, batch, send_account, updated_at, owners:client_owners(member_id)";

/** Todos los clientes y leads (unos cientos: se filtran en la página). */
export async function getAllClients(): Promise<ClientListItem[]> {
  const supabase = await createClient();
  const all: ClientListItem[] = [];
  // PostgREST devuelve como mucho 1000 filas por petición.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("clients")
      .select(LIST_COLUMNS)
      .order("name")
      .range(from, from + 999);
    if (error) throw error;
    all.push(...((data ?? []) as ClientListItem[]));
    if (!data || data.length < 1000) break;
  }
  return all;
}

/** Clientes del tablero: de Respondió a Ganado. Los perdidos se ven en Leads con su filtro. */
export async function getPipelineClients(): Promise<ClientListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(LIST_COLUMNS)
    .in("stage", ["respondio", "reunion", "maqueta_enviada", "propuesta_enviada", "negociacion", "ganado"])
    .order("next_action_date", { nullsFirst: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as ClientListItem[];
}

export type ClientDetail = Row & {
  owners: { member_id: string }[];
  events: {
    id: string;
    type: Enums["client_event_type"];
    body: string;
    from_stage: Enums["client_stage"] | null;
    to_stage: Enums["client_stage"] | null;
    occurred_at: string;
    member_id: string | null;
  }[];
  payments: { id: string; amount_eur: number; paid_on: IsoDate; concept: string; invoice_ref: string | null; member_id: string | null }[];
  tasks: { id: string; title: string; status: Enums["task_status"]; due_date: IsoDate | null }[];
  obvs: { id: string; number: number | null; type: Enums["obv_type"]; meeting_date: IsoDate; written_date: IsoDate | null; interviewee: string }[];
  minutes: number;
};

export async function getClient(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "*, owners:client_owners(member_id), events:client_events(id, type, body, from_stage, to_stage, occurred_at, member_id), payments(id, amount_eur, paid_on, concept, invoice_ref, member_id), tasks(id, title, status, due_date), obvs(id, number, type, meeting_date, written_date, interviewee)",
    )
    .eq("id", id)
    .order("occurred_at", { referencedTable: "client_events", ascending: false })
    .order("paid_on", { referencedTable: "payments", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: entries } = await supabase.from("time_entries").select("minutes").eq("client_id", id);
  const minutes = (entries ?? []).reduce((s, e) => s + e.minutes, 0);
  return { ...(data as unknown as Omit<ClientDetail, "minutes">), minutes };
}

export async function getPaymentsSince(from: IsoDate) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").select("amount_eur, paid_on").gte("paid_on", from);
  if (error) throw error;
  return data ?? [];
}
