"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, getMembers } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { isIsoDate, todayInMadrid } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
type Result =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LP_STATUSES: Enums["lp_status"][] = [
  "idea",
  "en_curso",
  "entregada",
  "validada",
];
const OBV_TYPES: Enums["obv_type"][] = [
  "investigacion",
  "validacion",
  "seguimiento",
  "venta_positiva",
  "venta_negativa",
];

const text = (fd: FormData, k: string, max = 300) =>
  String(fd.get(k) ?? "")
    .trim()
    .slice(0, max);

function parseNumber(raw: string): number | null | undefined {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : undefined;
}

function parseUrl(raw: string): string | undefined {
  if (!raw) return "";
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(url).toString();
  } catch {
    return undefined;
  }
}

async function validOwner(id: string) {
  const members = await getMembers();
  return members.some((m) => m.id === id);
}

function done() {
  revalidatePath("/", "layout");
}

// --- Learning Paths ------------------------------------------------------------

export async function saveLp(id: string | null, fd: FormData): Promise<Result> {
  await getCurrentMember();
  if (id && !UUID_RE.test(id)) return { ok: false, error: "LP no válida." };
  const title = text(fd, "title");
  if (!title)
    return {
      ok: false,
      error: "Escribe la pregunta de la LP.",
      field: "title",
    };
  const number = parseNumber(text(fd, "number"));
  if (number === undefined)
    return {
      ok: false,
      error: "El número tiene que ser un entero positivo.",
      field: "number",
    };
  const owner = text(fd, "owner_id");
  if (!(await validOwner(owner)))
    return { ok: false, error: "Elige quién la lleva.", field: "owner_id" };
  const status = text(fd, "status") as Enums["lp_status"];
  if (!LP_STATUSES.includes(status))
    return { ok: false, error: "Estado no válido.", field: "status" };
  const due = text(fd, "due_date");
  if (due && !isIsoDate(due))
    return { ok: false, error: "La fecha no es válida.", field: "due_date" };
  const doc = parseUrl(text(fd, "doc_url", 500));
  if (doc === undefined)
    return { ok: false, error: "El enlace no es válido.", field: "doc_url" };

  const value = {
    title,
    number,
    owner_id: owner,
    status,
    due_date: due || null,
    validators: text(fd, "validators"),
    doc_url: doc,
    notes: text(fd, "notes", 5000),
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("learning_paths").update(value).eq("id", id)
    : await supabase.from("learning_paths").insert(value);
  if (error) return { ok: false, error: "No se ha podido guardar la LP." };
  done();
  return { ok: true, message: id ? "LP guardada" : "LP creada" };
}

export async function setLpStatus(id: string, status: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id) || !LP_STATUSES.includes(status as Enums["lp_status"]))
    return { ok: false, error: "Datos no válidos." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("learning_paths")
    .update({ status: status as Enums["lp_status"] })
    .eq("id", id);
  if (error) return { ok: false, error: "No se ha podido cambiar el estado." };
  done();
  return { ok: true, message: "Estado cambiado" };
}

export async function deleteLp(id: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "LP no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_paths")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: "No se ha podido borrar la LP." };
  done();
  return { ok: true, message: "LP borrada" };
}

// --- OBVs ------------------------------------------------------------------------

export async function saveObv(
  id: string | null,
  fd: FormData,
): Promise<Result> {
  await getCurrentMember();
  if (id && !UUID_RE.test(id)) return { ok: false, error: "OBV no válida." };
  const today = todayInMadrid();
  const interviewee = text(fd, "interviewee");
  const company = text(fd, "company");
  if (!interviewee && !company)
    return {
      ok: false,
      error: "Escribe a quién entrevistaste o de qué empresa.",
      field: "interviewee",
    };
  const number = parseNumber(text(fd, "number"));
  if (number === undefined)
    return {
      ok: false,
      error: "El número tiene que ser un entero positivo.",
      field: "number",
    };
  const type = text(fd, "type") as Enums["obv_type"];
  if (!OBV_TYPES.includes(type))
    return { ok: false, error: "Elige el tipo de OBV.", field: "type" };
  const owner = text(fd, "owner_id");
  if (!(await validOwner(owner)))
    return { ok: false, error: "Elige quién la redacta.", field: "owner_id" };
  const meeting = text(fd, "meeting_date");
  if (!isIsoDate(meeting) || meeting > today)
    return {
      ok: false,
      error: "La fecha de la reunión no es válida.",
      field: "meeting_date",
    };
  const written = text(fd, "written_date");
  if (written && (!isIsoDate(written) || written > today))
    return {
      ok: false,
      error: "La fecha de redacción no es válida.",
      field: "written_date",
    };
  if (written && written < meeting)
    return {
      ok: false,
      error: "No se puede redactar antes de la reunión.",
      field: "written_date",
    };
  const clientId = text(fd, "client_id");
  const lpId = text(fd, "learning_path_id");
  if ((clientId && !UUID_RE.test(clientId)) || (lpId && !UUID_RE.test(lpId)))
    return { ok: false, error: "Vínculo no válido." };
  const doc = parseUrl(text(fd, "doc_url", 500));
  if (doc === undefined)
    return { ok: false, error: "El enlace no es válido.", field: "doc_url" };

  const value = {
    interviewee,
    company,
    number,
    type,
    owner_id: owner,
    meeting_date: meeting,
    written_date: written || null,
    client_id: clientId || null,
    learning_path_id: lpId || null,
    doc_url: doc,
    notes: text(fd, "notes", 5000),
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("obvs").update(value).eq("id", id)
    : await supabase.from("obvs").insert(value);
  if (error) return { ok: false, error: "No se ha podido guardar la OBV." };
  done();
  return { ok: true, message: id ? "OBV guardada" : "OBV creada" };
}

export async function markObvWritten(id: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "OBV no válida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("obvs")
    .update({ written_date: todayInMadrid() })
    .eq("id", id);
  if (error)
    return { ok: false, error: "No se ha podido marcar como redactada." };
  done();
  return { ok: true, message: "OBV marcada como redactada hoy" };
}

export async function deleteObv(id: string): Promise<Result> {
  await getCurrentMember();
  if (!UUID_RE.test(id)) return { ok: false, error: "OBV no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obvs")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: "No se ha podido borrar la OBV." };
  done();
  return { ok: true, message: "OBV borrada" };
}
