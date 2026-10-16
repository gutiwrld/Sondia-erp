// Genera supabase/seeds/02-datos-reales.sql a partir de datos-iniciales/.
//   npm run seed:generar
// El SQL resultante sirve en local (`supabase db reset`) y en producción
// (SQL Editor de Supabase), después de crear los miembros: los responsables se
// buscan por su nombre corto (Guzmán, Dani, Hugo).

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseCsvObjects } from "../src/lib/csv";
import {
  findMatch,
  guessMapping,
  mergeDrafts,
  normalize,
  parseOwners,
  rowToDraft,
  type ClientDraft,
} from "../src/lib/clients-import";

// Se ejecuta desde la raíz del repo (npm run seed:generar).
const root = process.cwd();
const read = (f: string) => readFileSync(path.join(root, "datos-iniciales", f), "utf8");

const q = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? "''" : `'${v.replace(/'/g, "''")}'`);
const num = (v: number | null) => (v === null ? "null" : String(v));

/** Responsables en SQL: nombres cortos o «*» para todo el equipo. */
function ownersSql(table: string, idExpr: string, owners: string[]) {
  if (owners.includes("*")) {
    return `insert into public.${table} select ${idExpr}, m.id from public.members m where m.active;`;
  }
  const names = owners.map((o) => q(o)).join(", ");
  return `insert into public.${table} select ${idExpr}, m.id from public.members m where m.short_name in (${names});`;
}

// --- Clientes y leads ----------------------------------------------------------

const leadsCsv = parseCsvObjects(read("leads-cold-email.csv"));
const leadMap = guessMapping(leadsCsv.headers);
const leads = leadsCsv.rows.map((r) => {
  const d = rowToDraft(r, leadMap, { source: "cold_email" });
  if ("error" in d) throw new Error(`Lead no válido: ${JSON.stringify(r)}`);
  // Todo el tracker de cold email lo lleva Guzmán.
  if (!d.owners.length) d.owners = ["Guzmán"];
  return d;
});

const pipelineCsv = parseCsvObjects(read("clientes.csv"));
const pipelineMap = guessMapping(pipelineCsv.headers);
const clients: ClientDraft[] = [...leads];
for (const row of pipelineCsv.rows) {
  const d = rowToDraft(row, pipelineMap, { source: "referido" });
  if ("error" in d) throw new Error(`Cliente no válido: ${JSON.stringify(row)}`);
  const lead = findMatch(d, leads, { fuzzy: true });
  if (lead) clients[clients.indexOf(lead)] = mergeDrafts(lead, d);
  else clients.push(d);
}

const lines: string[] = [];
lines.push(
  "-- GENERADO por scripts/generar-seed-real.ts a partir de datos-iniciales/. No editar a mano.",
  "-- Datos reales: 305 leads del tracker de cold email (volcado del 13 oct 2026), el pipeline,",
  "-- LPs, OBVs y objetivos de la semana del 12 oct. Requiere que existan los miembros",
  "-- con nombre corto Guzmán, Dani y Hugo.",
  "",
  "begin;",
  "",
);

for (const c of clients) {
  lines.push(
    `with c as (insert into public.clients (name, sector, city, province, website, email, phone, contact_name, stage, service, value_eur, pricing, next_action, notes, do_not_contact, do_not_contact_reason, lost_reason, email_bounced, source, send_account, email_subject, batch) values (${[
      q(c.name),
      q(c.sector),
      q(c.city),
      q(c.province),
      q(c.website),
      q(c.email),
      q(c.phone),
      q(c.contact_name),
      q(c.stage),
      q(c.service),
      num(c.value_eur),
      /comisi[oó]n/i.test(c.service) ? "'fijo_comision'" : c.value_eur ? "'fijo'" : "null",
      q(c.next_action),
      q(c.notes),
      c.do_not_contact ? "true" : "false",
      q(c.do_not_contact_reason),
      q(c.lost_reason),
      c.email_bounced ? "true" : "false",
      q(c.source),
      q(c.send_account),
      q(c.email_subject),
      q(c.batch),
    ].join(", ")}) returning id)`,
    `, o as (${ownersSql("client_owners", "c.id", c.owners).replace(/;$/, "").replace("from public.members m", "from c, public.members m")} returning 1)`,
    `insert into public.client_events (client_id, type, body, occurred_at) select c.id, 'importacion', ${q(
      c.source === "cold_email" ? "Importado del tracker de cold email (volcado del 13 oct 2026)" : "Importado del pipeline",
    )}, timestamptz '2026-10-13 12:00:00+02' from c;`,
  );
}

// Primer pago de Librería Alcaraván (nota del tracker: factura F260046, transferencia de 175,45 € el 8 oct).
lines.push(
  "",
  "insert into public.payments (client_id, member_id, amount_eur, paid_on, concept, invoice_ref)",
  "select c.id, m.id, 175.45, date '2026-10-08', 'Primer pago de la web informativa', 'F260046'",
  "from public.clients c, public.members m where c.name = 'Librería Alcaraván' and m.short_name = 'Guzmán';",
  "insert into public.client_events (client_id, member_id, type, body, occurred_at)",
  "select c.id, m.id, 'cobro', 'Cobro de 175,45 € (factura F260046)', timestamptz '2026-10-08 12:00:00+02'",
  "from public.clients c, public.members m where c.name = 'Librería Alcaraván' and m.short_name = 'Guzmán';",
  "",
);

// --- LPs y OBVs -------------------------------------------------------------------

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const LP_STATUS: Record<string, string> = { "por confirmar": "idea", idea: "idea", "en curso": "en_curso", entregada: "entregada", validada: "validada" };
const OBV_TYPE: Record<string, string> = {
  "venta (+)": "venta_positiva",
  "venta +": "venta_positiva",
  "venta (-)": "venta_negativa",
  "venta -": "venta_negativa",
  validacion: "validacion",
  investigacion: "investigacion",
  seguimiento: "seguimiento",
};

for (const r of parseCsvObjects(read("lps-y-obvs.csv")).rows) {
  if (r.tipo === "LP") {
    const fullDate = /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : null;
    const month = /^(\d{4})-(\d{2})$/.exec(r.fecha);
    const notes = [r.nota, month ? `Entrega prevista: ${MONTHS[Number(month[2]) - 1]} de ${month[1]}` : ""].filter(Boolean).join(". ");
    lines.push(
      `insert into public.learning_paths (number, title, owner_id, status, due_date, notes) select ${r.numero || "null"}, ${q(r.titulo)}, m.id, ${q(LP_STATUS[normalize(r.estado)] ?? "idea")}, ${fullDate ? `date '${fullDate}'` : "null"}, ${q(notes)} from public.members m where m.short_name = ${q(r.responsable)};`,
    );
  } else if (r.tipo === "OBV") {
    const [interviewee, company] = r.titulo.split(" · ").map((s) => s.trim());
    const type = OBV_TYPE[normalize(r.nota)] ?? "validacion";
    const written = normalize(r.estado) === "redactada" ? `date '${r.fecha}'` : "null";
    lines.push(
      `insert into public.obvs (number, type, owner_id, interviewee, company, client_id, meeting_date, written_date) select ${r.numero || "null"}, ${q(type)}, m.id, ${q(interviewee)}, ${q(company ?? "")}, (select id from public.clients where name ilike ${q(`%${company ?? ""}%`)} limit 1), date '${r.fecha}', ${written} from public.members m where m.short_name = ${q(r.responsable)};`,
    );
  }
}
lines.push("");

// --- Objetivos de la semana --------------------------------------------------------

const DAYS: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 };
parseCsvObjects(read("objetivos-semana.csv")).rows.forEach((r, i) => {
  const days = normalize(r.dia)
    .split(/\s*(?:,|\by\b)\s*/)
    .map((d) => DAYS[d])
    .filter(Boolean);
  const title = r.objetivo.replace(/\s*\(viene de la semana pasada\)\s*$/i, "");
  lines.push(
    `with g as (insert into public.weekly_goals (week_start, title, days, status, position) values (date '${r.semana}', ${q(title)}, '{${days.join(",")}}', ${q(normalize(r.estado) || "pendiente")}, ${i + 1}) returning id)`,
    `${ownersSql("weekly_goal_owners", "g.id", parseOwners(r.responsable)).replace("from public.members m", "from g, public.members m")}`,
  );
});

lines.push("", "commit;", "");
const out = path.join(root, "supabase", "seeds", "02-datos-reales.sql");
writeFileSync(out, lines.join("\n"));
console.log(`Escrito ${path.relative(root, out)}: ${clients.length} clientes`);
