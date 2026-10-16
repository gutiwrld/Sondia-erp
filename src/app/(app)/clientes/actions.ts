"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, getMembers } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate, todayInMadrid } from "@/lib/dates";
import { isClientStage } from "@/lib/clients";
import { parseEuros, findMatch, type ClientDraft } from "@/lib/clients-import";
import { formatEur } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/labels";
import type { Database } from "@/lib/supabase/database.types";

type EventType = Database["public"]["Enums"]["client_event_type"];
type Result = { ok: true; message: string; id?: string } | { ok: false; error: string; field?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES: EventType[] = ["nota", "email", "llamada", "reunion", "maqueta", "propuesta"];

/** Traduce los errores de la regla «No contactar» de la base de datos. */
function dbError(message: string | undefined, fallback: string): string {
  if (message?.includes("NO_CONTACTAR")) {
    return message.includes("dos pasos")
      ? "Quita primero la marca «No contactar» y después cambia la etapa."
      : "Este cliente está marcado como «No contactar»: no puede volver a una etapa activa. Quita antes la marca si de verdad hay que reactivarlo.";
  }
  return fallback;
}

function done() {
  revalidatePath("/", "layout");
}

// --- Etapa y próxima acción -------------------------------------------------

export async function setClientStage(id: string, stage: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  if (!isClientStage(stage)) return { ok: false, error: "Etapa no válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ stage }).eq("id", id);
  if (error) return { ok: false, error: dbError(error.message, "No se ha podido cambiar la etapa.") };
  done();
  return { ok: true, message: `Movido a ${STAGE_LABELS[stage]}` };
}

export async function setNextAction(id: string, formData: FormData): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const text = String(formData.get("next_action") ?? "").trim().slice(0, 300);
  const date = String(formData.get("next_action_date") ?? "").trim();
  if (date && !isIsoDate(date)) return { ok: false, error: "La fecha no es válida.", field: "next_action_date" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ next_action: text, next_action_date: date || null })
    .eq("id", id);
  if (error) return { ok: false, error: "No se ha podido guardar la próxima acción." };
  done();
  return { ok: true, message: "Próxima acción guardada" };
}

// --- No contactar -------------------------------------------------------------

export async function markDoNotContact(id: string, reason: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ do_not_contact: true, do_not_contact_reason: reason.trim().slice(0, 300), next_action: "", next_action_date: null })
    .eq("id", id);
  if (error) return { ok: false, error: "No se ha podido marcar." };
  done();
  return { ok: true, message: "Marcado como «No contactar»" };
}

export async function unmarkDoNotContact(id: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ do_not_contact: false, do_not_contact_reason: "" }).eq("id", id);
  if (error) return { ok: false, error: dbError(error.message, "No se ha podido quitar la marca.") };
  done();
  return { ok: true, message: "Marca «No contactar» quitada. Sigue en Perdido hasta que cambies la etapa." };
}

// --- Alta y edición -------------------------------------------------------------

async function parseClientForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Escribe el nombre del negocio.", field: "name" };
  if (name.length > 200) return { error: "El nombre es demasiado largo.", field: "name" };

  const text = (k: string, max = 300) => String(formData.get(k) ?? "").trim().slice(0, max);
  const valueRaw = text("value_eur");
  const value = valueRaw ? parseEuros(valueRaw) : null;
  if (valueRaw && value === null) return { error: "El valor no es un importe válido.", field: "value_eur" };

  const pricing = text("pricing");
  const nextDate = text("next_action_date");
  if (nextDate && !isIsoDate(nextDate)) return { error: "La fecha no es válida.", field: "next_action_date" };

  const members = await getMembers();
  const valid = new Set(members.map((m) => m.id));
  const owners = [...new Set(formData.getAll("owners").map(String))].filter((o) => valid.has(o));

  const email = text("email").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El email no es válido.", field: "email" };

  return {
    value: {
      name,
      sector: text("sector"),
      city: text("city"),
      province: text("province"),
      website: text("website"),
      email,
      phone: text("phone"),
      contact_name: text("contact_name"),
      service: text("service"),
      value_eur: value,
      pricing: (["fijo", "fijo_comision", "solo_comision"].includes(pricing) ? pricing : null) as Database["public"]["Enums"]["pricing_model"] | null,
      next_action: text("next_action"),
      next_action_date: nextDate || null,
      notes: text("notes", 10000),
      lost_reason: text("lost_reason"),
    },
    owners,
  };
}

export async function createClientRecord(formData: FormData): Promise<Result> {
  const me = await getCurrentMember();
  const parsed = await parseClientForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };
  const stage = formData.get("stage");
  const supabase = await createClient();

  // ¿Ya existe? Mismo email, misma web o mismo nombre.
  const { data: existing } = await supabase.from("clients").select("id, name, email, website");
  const dup = findMatch({ name: parsed.value.name, email: parsed.value.email, website: parsed.value.website }, existing ?? []);
  if (dup) return { ok: false, error: `Ya existe «${dup.name}». Ábrelo desde Leads para editarlo.`, field: "name" };

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...parsed.value, stage: isClientStage(stage) ? stage : "lead", source: String(formData.get("source") ?? "manual") || "manual" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se ha podido crear el cliente." };

  const owners = parsed.owners.length ? parsed.owners : [me.id];
  await supabase.from("client_owners").insert(owners.map((member_id) => ({ client_id: data.id, member_id })));
  done();
  return { ok: true, message: "Cliente creado", id: data.id };
}

export async function updateClientRecord(id: string, formData: FormData): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const parsed = await parseClientForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error!, field: parsed.field };

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update(parsed.value).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "No se han podido guardar los cambios." };
  if (!data) return { ok: false, error: "Este cliente ya no existe." };

  if (formData.has("owners_present")) {
    const { data: current } = await supabase.from("client_owners").select("member_id").eq("client_id", id);
    const before = new Set((current ?? []).map((o) => o.member_id));
    const after = new Set(parsed.owners);
    const add = [...after].filter((m) => !before.has(m));
    const remove = [...before].filter((m) => !after.has(m));
    if (add.length) await supabase.from("client_owners").insert(add.map((member_id) => ({ client_id: id, member_id })));
    if (remove.length) await supabase.from("client_owners").delete().eq("client_id", id).in("member_id", remove);
  }
  done();
  return { ok: true, message: "Cambios guardados" };
}

// --- Historial ---------------------------------------------------------------------

export async function addClientEvent(id: string, formData: FormData): Promise<Result> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const type = String(formData.get("type") ?? "nota") as EventType;
  if (!EVENT_TYPES.includes(type)) return { ok: false, error: "Tipo no válido." };
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Escribe qué ha pasado.", field: "body" };
  if (body.length > 5000) return { ok: false, error: "El texto es demasiado largo.", field: "body" };
  const date = String(formData.get("date") ?? "").trim();
  const today = todayInMadrid();
  if (date && (!isIsoDate(date) || date > today)) return { ok: false, error: "La fecha no es válida.", field: "date" };

  const supabase = await createClient();
  const { error } = await supabase.from("client_events").insert({
    client_id: id,
    member_id: me.id,
    type,
    body,
    occurred_at: date && date !== today ? `${date}T12:00:00+02:00` : new Date().toISOString(),
  });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  done();
  return { ok: true, message: "Añadido al historial" };
}

// --- Cobros --------------------------------------------------------------------------

export async function addPayment(id: string, formData: FormData): Promise<Result> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "Cliente no válido." };
  const amount = parseEuros(String(formData.get("amount") ?? ""));
  if (!amount || amount <= 0) return { ok: false, error: "Escribe el importe, por ejemplo 175,45.", field: "amount" };
  const paidOn = String(formData.get("paid_on") ?? "");
  if (!isIsoDate(paidOn) || paidOn > todayInMadrid()) return { ok: false, error: "La fecha no es válida.", field: "paid_on" };
  const concept = String(formData.get("concept") ?? "").trim().slice(0, 200);
  const invoice = String(formData.get("invoice_ref") ?? "").trim().slice(0, 60) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .insert({ client_id: id, member_id: me.id, amount_eur: amount, paid_on: paidOn, concept, invoice_ref: invoice });
  if (error) return { ok: false, error: "No se ha podido registrar el cobro." };
  await supabase.from("client_events").insert({
    client_id: id,
    member_id: me.id,
    type: "cobro",
    body: `Cobro de ${formatEur(amount)}${invoice ? ` (factura ${invoice})` : ""}${concept ? ` · ${concept}` : ""}`,
    occurred_at: `${paidOn}T12:00:00+02:00`,
  });
  done();
  return { ok: true, message: `Cobro de ${formatEur(amount)} registrado` };
}

export async function deletePayment(paymentId: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(paymentId)) return { ok: false, error: "Cobro no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").delete().eq("id", paymentId).select("id");
  if (error || !data?.length) return { ok: false, error: "No se ha podido borrar el cobro." };
  done();
  return { ok: true, message: "Cobro borrado" };
}

// --- Acciones masivas (Leads) -----------------------------------------------------------

export async function bulkUpdateClients(
  ids: string[],
  change: { stage?: string; ownerId?: string; doNotContact?: boolean },
): Promise<Result> {
  await getCurrentMember();
  const valid = ids.filter((id) => UUID_RE.test(id)).slice(0, 1000);
  if (!valid.length) return { ok: false, error: "No hay nada seleccionado." };
  const supabase = await createClient();

  if (change.stage) {
    if (!isClientStage(change.stage)) return { ok: false, error: "Etapa no válida." };
    // Los marcados «No contactar» no se pueden reactivar: se dejan fuera y se avisa.
    const { data: blocked } = await supabase.from("clients").select("id").in("id", valid).eq("do_not_contact", true);
    const skip = new Set((blocked ?? []).map((b) => b.id));
    const target = change.stage === "perdido" ? valid : valid.filter((id) => !skip.has(id));
    if (target.length) {
      const { error } = await supabase.from("clients").update({ stage: change.stage }).in("id", target);
      if (error) return { ok: false, error: dbError(error.message, "No se ha podido cambiar la etapa.") };
    }
    done();
    const skipped = valid.length - target.length;
    return {
      ok: true,
      message: `${target.length} movidos a ${STAGE_LABELS[change.stage]}${skipped ? ` · ${skipped} «No contactar» se quedan como están` : ""}`,
    };
  }

  if (change.ownerId) {
    const members = await getMembers();
    if (!members.some((m) => m.id === change.ownerId)) return { ok: false, error: "Responsable no válido." };
    await supabase.from("client_owners").delete().in("client_id", valid);
    const { error } = await supabase.from("client_owners").insert(valid.map((client_id) => ({ client_id, member_id: change.ownerId! })));
    if (error) return { ok: false, error: "No se ha podido asignar." };
    done();
    return { ok: true, message: `${valid.length} asignados` };
  }

  if (change.doNotContact) {
    const { error } = await supabase
      .from("clients")
      .update({ do_not_contact: true, do_not_contact_reason: "Marcado desde Leads", next_action: "", next_action_date: null })
      .in("id", valid)
      .eq("do_not_contact", false);
    if (error) return { ok: false, error: "No se han podido marcar." };
    done();
    return { ok: true, message: `${valid.length} marcados como «No contactar»` };
  }

  return { ok: false, error: "Nada que cambiar." };
}

// --- Importación ------------------------------------------------------------------------

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function sanitizeDraft(raw: ClientDraft): ClientDraft {
  const r = (raw ?? {}) as Partial<ClientDraft>;
  const value = typeof r.value_eur === "number" && Number.isFinite(r.value_eur) && r.value_eur >= 0 ? r.value_eur : null;
  return {
    name: str(r.name, 200),
    sector: str(r.sector),
    city: str(r.city),
    province: str(r.province),
    website: str(r.website),
    email: str(r.email).toLowerCase(),
    phone: str(r.phone),
    contact_name: str(r.contact_name),
    stage: isClientStage(r.stage) ? r.stage : "lead",
    service: str(r.service),
    value_eur: value,
    next_action: str(r.next_action),
    notes: str(r.notes, 10000),
    do_not_contact: r.do_not_contact === true,
    do_not_contact_reason: str(r.do_not_contact_reason),
    lost_reason: str(r.lost_reason),
    email_bounced: r.email_bounced === true,
    source: str(r.source, 40) || "csv",
    send_account: str(r.send_account),
    email_subject: str(r.email_subject),
    batch: str(r.batch, 40),
    owners: Array.isArray(r.owners) ? r.owners.filter((o): o is string => typeof o === "string").slice(0, 5) : [],
  };
}

export type ImportSummary = { created: number; updated: number; skipped: number; errors: string[] };

/**
 * Crea los clientes nuevos de un CSV ya revisado en pantalla. Los que ya
 * existen se omiten o, si se pide, se completan solo en los campos vacíos (la
 * etapa de un cliente existente nunca se toca desde el importador).
 */
export async function importClients(drafts: ClientDraft[], mode: "omitir" | "completar"): Promise<ImportSummary> {
  const me = await getCurrentMember();
  const members = await getMembers();
  const supabase = await createClient();
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
  if (!Array.isArray(drafts) || drafts.length > 5000) {
    summary.errors.push("El archivo tiene demasiadas filas (máximo 5.000).");
    return summary;
  }

  const { data: existing } = await supabase.from("clients").select("id, name, email, website, sector, city, province, phone, contact_name, service, notes");
  const pool = existing ?? [];

  const resolveOwners = (names: string[]) => {
    if (names.includes("*")) return members.map((m) => m.id);
    const ids = members.filter((m) => names.some((n) => n.toLowerCase() === m.short_name.toLowerCase() || n.toLowerCase() === m.name.toLowerCase())).map((m) => m.id);
    return ids.length ? ids : [me.id];
  };

  const toCreate: (ClientDraft & { ownerIds: string[] })[] = [];
  for (const raw of drafts) {
    // Lo que llega del navegador se vuelve a limpiar aquí.
    const d = sanitizeDraft(raw);
    if (!d?.name?.trim() || !isClientStage(d.stage)) {
      summary.errors.push(`Fila sin nombre o con etapa no válida: ${d?.name ?? "(vacía)"}`);
      continue;
    }
    const match = findMatch(d, pool) ?? findMatch(d, toCreate);
    if (match) {
      if (mode === "completar" && "id" in match) {
        const patch: Database["public"]["Tables"]["clients"]["Update"] = {};
        for (const k of ["email", "website", "sector", "city", "province", "phone", "contact_name", "service"] as const) {
          if (!(match as Record<string, string>)[k] && d[k]) patch[k] = d[k];
        }
        if (Object.keys(patch).length) {
          const { error } = await supabase.from("clients").update(patch).eq("id", (match as { id: string }).id);
          if (error) summary.errors.push(`${d.name}: no se ha podido completar`);
          else summary.updated++;
        } else summary.skipped++;
      } else summary.skipped++;
      continue;
    }
    toCreate.push({ ...d, ownerIds: resolveOwners(d.owners) });
  }

  for (let i = 0; i < toCreate.length; i += 200) {
    const chunk = toCreate.slice(i, i + 200);
    const { data, error } = await supabase
      .from("clients")
      .insert(
        chunk.map(({ owners: _o, ownerIds: _ids, ...c }) => ({
          ...c,
          pricing: null,
          next_action_date: null,
        })),
      )
      .select("id");
    if (error || !data) {
      summary.errors.push(`No se ha podido importar un bloque de ${chunk.length} filas.`);
      continue;
    }
    summary.created += data.length;
    await supabase
      .from("client_owners")
      .insert(data.flatMap((row, j) => chunk[j].ownerIds.map((member_id) => ({ client_id: row.id, member_id }))));
    await supabase
      .from("client_events")
      .insert(data.map((row) => ({ client_id: row.id, member_id: me.id, type: "importacion" as const, body: "Importado desde CSV" })));
  }

  done();
  return summary;
}
