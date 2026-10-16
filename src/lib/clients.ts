// Reglas del pipeline de clientes.

import type { ClientStage } from "./clients-import";
import type { IsoDate } from "./dates";

export const ALL_STAGES: ClientStage[] = [
  "lead",
  "contactado",
  "respondio",
  "reunion",
  "maqueta_enviada",
  "propuesta_enviada",
  "negociacion",
  "ganado",
  "perdido",
];

/** Columnas del tablero: desde que responden hasta ganado. */
export const PIPELINE_STAGES: ClientStage[] = [
  "respondio",
  "reunion",
  "maqueta_enviada",
  "propuesta_enviada",
  "negociacion",
  "ganado",
];

/** Etapas de prospección, que viven en la tabla de Leads. */
export const PROSPECTING_STAGES: ClientStage[] = ["lead", "contactado"];

export function isClientStage(v: unknown): v is ClientStage {
  return typeof v === "string" && (ALL_STAGES as string[]).includes(v);
}

/** Etapas abiertas: ni ganado ni perdido. */
export function isOpenStage(stage: ClientStage) {
  return stage !== "ganado" && stage !== "perdido";
}

type Valued = { stage: ClientStage; value_eur: number | string | null };

/** Número de clientes y valor por etapa (el valor vacío cuenta como 0). */
export function stageTotals<T extends Valued>(clients: T[]): Record<ClientStage, { count: number; value: number }> {
  const totals = Object.fromEntries(ALL_STAGES.map((s) => [s, { count: 0, value: 0 }])) as Record<
    ClientStage,
    { count: number; value: number }
  >;
  for (const c of clients) {
    totals[c.stage].count += 1;
    totals[c.stage].value += Number(c.value_eur ?? 0);
  }
  return totals;
}

/** Valor del pipeline abierto (de Respondió a Negociación). */
export function openPipelineValue<T extends Valued>(clients: T[]): number {
  return clients
    .filter((c) => PIPELINE_STAGES.includes(c.stage) && isOpenStage(c.stage))
    .reduce((s, c) => s + Number(c.value_eur ?? 0), 0);
}

/** Una próxima acción está vencida si su fecha ya pasó. */
export function isActionOverdue(date: IsoDate | null, today: IsoDate) {
  return Boolean(date && date < today);
}

/** Suma de cobros de un mes (`month` = «2026-10»). */
export function paidInMonth<T extends { amount_eur: number | string; paid_on: IsoDate }>(payments: T[], month: string) {
  return payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + Number(p.amount_eur), 0);
}

/** «Urueña (Valladolid)» + «Valladolid» → sin repetir la provincia. */
export function placeLabel(city: string, province: string): string {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!province || !city) return city || province;
  return norm(city).includes(norm(province)) ? city : `${city}, ${province}`;
}
