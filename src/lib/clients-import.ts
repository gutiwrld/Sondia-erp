// Importación de clientes y leads desde CSV: columnas, etapas, la regla de los
// «descartados» del tracker de cold email y la detección de duplicados.
// Lo usan el importador de la app y el generador del seed real.

import type { Database } from "@/lib/supabase/database.types";

export type ClientStage = Database["public"]["Enums"]["client_stage"];

export type ClientDraft = {
  name: string;
  sector: string;
  city: string;
  province: string;
  website: string;
  email: string;
  phone: string;
  contact_name: string;
  stage: ClientStage;
  service: string;
  value_eur: number | null;
  next_action: string;
  notes: string;
  do_not_contact: boolean;
  do_not_contact_reason: string;
  lost_reason: string;
  email_bounced: boolean;
  source: string;
  send_account: string;
  email_subject: string;
  batch: string;
  /** Nombres cortos de los responsables («Guzmán», «Equipo»…), sin resolver. */
  owners: string[];
};

export const CLIENT_FIELDS = [
  "name",
  "sector",
  "city",
  "province",
  "website",
  "email",
  "phone",
  "contact_name",
  "stage",
  "service",
  "value_eur",
  "next_action",
  "notes",
  "owners",
  "send_account",
  "email_subject",
  "batch",
] as const;
export type ClientField = (typeof CLIENT_FIELDS)[number];

export const FIELD_LABELS: Record<ClientField, string> = {
  name: "Nombre",
  sector: "Sector",
  city: "Ciudad",
  province: "Provincia",
  website: "Web",
  email: "Email",
  phone: "Teléfono",
  contact_name: "Contacto",
  stage: "Etapa o estado",
  service: "Servicio",
  value_eur: "Valor (€)",
  next_action: "Próxima acción",
  notes: "Notas",
  owners: "Responsable",
  send_account: "Cuenta de envío",
  email_subject: "Asunto",
  batch: "Tanda",
};

/** Sin acentos, minúsculas y espacios normalizados. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const HEADER_SYNONYMS: Record<ClientField, string[]> = {
  name: ["nombre", "cliente", "empresa", "negocio", "name"],
  sector: ["sector", "actividad"],
  city: ["ciudad", "localidad", "municipio", "poblacion"],
  province: ["provincia"],
  website: ["web", "website", "url", "pagina web"],
  email: ["email", "correo", "e-mail", "mail"],
  phone: ["telefono", "tel", "movil", "phone"],
  contact_name: ["contacto", "persona de contacto"],
  stage: ["etapa", "estado", "fase"],
  service: ["servicio", "producto"],
  value_eur: ["valor_eur", "valor", "importe", "precio"],
  next_action: ["proxima_accion", "proxima accion", "siguiente paso"],
  notes: ["nota", "notas", "comentarios", "observaciones"],
  owners: ["responsable", "responsables", "owner"],
  send_account: ["cuenta_envio", "cuenta de envio", "cuenta"],
  email_subject: ["asunto"],
  batch: ["tanda", "lote"],
};

/** Columna del CSV → campo, por nombre de cabecera. */
export function guessMapping(headers: string[]): Partial<Record<ClientField, string>> {
  const mapping: Partial<Record<ClientField, string>> = {};
  for (const field of CLIENT_FIELDS) {
    const header = headers.find((h) => HEADER_SYNONYMS[field].includes(normalize(h).replace(/_/g, " ")) || HEADER_SYNONYMS[field].includes(normalize(h)));
    if (header) mapping[field] = header;
  }
  return mapping;
}

// --- Etapas -----------------------------------------------------------------

const STAGE_WORDS: Record<string, ClientStage> = {
  lead: "lead",
  "preparado (sin enviar)": "lead",
  preparado: "lead",
  "sin enviar": "lead",
  contactado: "contactado",
  enviado: "contactado",
  respondio: "respondio",
  respondido: "respondio",
  reunion: "reunion",
  "reunion acordada": "reunion",
  "maqueta enviada": "maqueta_enviada",
  maqueta: "maqueta_enviada",
  "propuesta enviada": "propuesta_enviada",
  propuesta: "propuesta_enviada",
  negociacion: "negociacion",
  ganado: "ganado",
  cliente: "ganado",
  perdido: "perdido",
};

export type Classification =
  | { kind: "stage"; stage: ClientStage }
  | { kind: "no_contactar"; reason: string }
  | { kind: "rebote"; nextAction: string }
  | { kind: "cerrado"; reason: string }
  | { kind: "descartado" };

const NO_CONTACT_RE = /no volver a escribir|no insistir/i;
const BOUNCE_RE = /rebot|rebote|ya no recibe correo|direcci[oó]n no existe/i;
const CLOSED_RE = /jubil|traspas|se vendi|cierran|cerrad[oa]|cierre/i;
const PHONE_IN_NOTE_RE = /llamar al ([+\d][\d\s/+]{6,})/i;

/**
 * Etapa a partir del estado o etapa del CSV. Los «descartado» del tracker se
 * reparten según la nota: dijeron que no → No contactar; el email rebotó → se
 * sigue intentando por teléfono; negocio cerrado, vendido o traspasado →
 * Perdido con motivo; el resto → Perdido.
 */
export function classify(estado: string, nota: string, phone: string): Classification {
  const key = normalize(estado);
  if (key === "descartado") {
    if (NO_CONTACT_RE.test(nota)) return { kind: "no_contactar", reason: reasonFromNote(nota) };
    if (BOUNCE_RE.test(nota)) {
      const fromNote = nota.match(PHONE_IN_NOTE_RE)?.[1]?.trim().replace(/[.\s]+$/, "");
      const number = fromNote || phone;
      return { kind: "rebote", nextAction: number ? `Llamar al ${number}` : "Buscar otro email o un teléfono" };
    }
    if (CLOSED_RE.test(nota)) return { kind: "cerrado", reason: "Negocio cerrado, vendido o traspasado" };
    return { kind: "descartado" };
  }
  return { kind: "stage", stage: STAGE_WORDS[key] ?? "lead" };
}

function reasonFromNote(nota: string): string {
  const first = nota.split(/(?<=[.!])\s/)[0]?.trim() ?? "";
  return first.length > 0 && first.length <= 160 ? first : "Dijo que no";
}

/** «1.234,56» · «490» · «290 €» → número; vacío o raro → null. */
export function parseEuros(value: string): number | null {
  const raw = value.replace(/[€\s]/g, "");
  if (!raw) return null;
  // «1.234,56» y «1.200» (punto de miles) · «490.5» (punto decimal, poco habitual).
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, "")
      : raw;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function parseOwners(value: string): string[] {
  const v = value.trim();
  if (!v) return [];
  if (/^(todos|equipo)$/i.test(v)) return ["*"];
  return v
    .split(/\s*(?:,|\/|\by\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Una fila del CSV → borrador de cliente. */
export function rowToDraft(
  row: Record<string, string>,
  mapping: Partial<Record<ClientField, string>>,
  { source = "csv" }: { source?: string } = {},
): ClientDraft | { error: string } {
  const get = (f: ClientField) => (mapping[f] ? (row[mapping[f]!] ?? "").trim() : "");
  const name = get("name");
  if (!name) return { error: "Falta el nombre" };

  const notes = get("notes");
  const phone = get("phone");
  const c = classify(get("stage"), notes, phone);
  const value = get("value_eur");

  const draft: ClientDraft = {
    name: name.slice(0, 200),
    sector: get("sector"),
    city: get("city"),
    province: get("province"),
    website: get("website"),
    email: get("email").toLowerCase(),
    phone,
    contact_name: get("contact_name"),
    stage: "lead",
    service: get("service"),
    value_eur: value ? parseEuros(value) : null,
    next_action: get("next_action"),
    notes,
    do_not_contact: false,
    do_not_contact_reason: "",
    lost_reason: "",
    email_bounced: false,
    source,
    send_account: get("send_account"),
    email_subject: get("email_subject"),
    batch: get("batch"),
    owners: parseOwners(get("owners")),
  };

  switch (c.kind) {
    case "stage": {
      draft.stage = c.stage;
      // «Oportunidad: …» en la nota de un lead que respondió es su próxima acción.
      const opportunity = notes.match(/Oportunidad:\s*([^.]+)/i)?.[1]?.trim();
      if (c.stage === "respondio" && !draft.next_action && opportunity) {
        draft.next_action = opportunity.charAt(0).toUpperCase() + opportunity.slice(1);
      }
      break;
    }
    case "no_contactar":
      draft.stage = "perdido";
      draft.do_not_contact = true;
      draft.do_not_contact_reason = c.reason;
      break;
    case "rebote":
      draft.stage = "contactado";
      draft.email_bounced = true;
      if (!draft.next_action) draft.next_action = c.nextAction;
      break;
    case "cerrado":
      draft.stage = "perdido";
      draft.lost_reason = c.reason;
      break;
    case "descartado":
      draft.stage = "perdido";
      draft.lost_reason = "Descartado";
      break;
  }
  return draft;
}

// --- Duplicados ---------------------------------------------------------------

export function websiteKey(url: string): string {
  return normalize(url)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export function nameKey(name: string): string {
  return normalize(name).replace(/[^a-z0-9]+/g, " ").trim();
}

const NAME_STOPWORDS = new Set([
  "la", "el", "los", "las", "de", "del", "y", "e", "s", "a", "sl", "sa", "sat", "slu",
  "hotel", "restaurante", "casa", "rural", "meson", "asador", "hostal", "bar", "distribucion",
  "embutidos", "libreria", "legumbres", "apartamentos", "rurales", "bodegas", "productos",
]);

function significantTokens(name: string): string[] {
  return nameKey(name)
    .split(" ")
    .filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t));
}

type Keyed = { name: string; email?: string; website?: string };

/**
 * ¿Es el mismo negocio? Mismo email, misma web o mismo nombre normalizado.
 * Con `fuzzy`, también cuando comparten una palabra distintiva del nombre
 * («La Gallareta / Distribución Mena» y «Legumbres La Gallareta»).
 */
export function sameBusiness(a: Keyed, b: Keyed, { fuzzy = false } = {}): boolean {
  if (a.email && b.email && normalize(a.email) === normalize(b.email)) return true;
  if (a.website && b.website && websiteKey(a.website) && websiteKey(a.website) === websiteKey(b.website)) return true;
  if (nameKey(a.name) === nameKey(b.name)) return true;
  if (!fuzzy) return false;
  const ta = new Set(significantTokens(a.name));
  return significantTokens(b.name).some((t) => ta.has(t));
}

/** Busca el único candidato que encaja; si hay varios, no se arriesga. */
export function findMatch<T extends Keyed>(item: Keyed, candidates: T[], { fuzzy = false } = {}): T | null {
  const exact = candidates.filter((c) => sameBusiness(item, c));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1 || !fuzzy) return null;
  const loose = candidates.filter((c) => sameBusiness(item, c, { fuzzy: true }));
  return loose.length === 1 ? loose[0] : null;
}

/**
 * Une un cliente del pipeline con su lead del tracker: manda la etapa, el
 * servicio, el valor y la próxima acción del pipeline; del lead se quedan los
 * datos de contacto y del envío. Las notas se juntan.
 */
export function mergeDrafts(lead: ClientDraft, pipeline: ClientDraft): ClientDraft {
  const pick = (a: string, b: string) => a || b;
  return {
    ...lead,
    name: pipeline.name,
    sector: pick(pipeline.sector, lead.sector),
    city: pick(pipeline.city, lead.city),
    contact_name: pick(pipeline.contact_name, lead.contact_name),
    stage: pipeline.stage,
    service: pick(pipeline.service, lead.service),
    value_eur: pipeline.value_eur ?? lead.value_eur,
    next_action: pick(pipeline.next_action, lead.next_action),
    notes: [pipeline.notes, lead.notes].filter(Boolean).join("\n\n"),
    owners: pipeline.owners.length ? pipeline.owners : lead.owners,
    source: lead.source,
  };
}
