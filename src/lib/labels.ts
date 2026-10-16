import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const STAGE_LABELS: Record<Enums["client_stage"], string> = {
  lead: "Lead",
  contactado: "Contactado",
  respondio: "Respondió",
  reunion: "Reunión",
  maqueta_enviada: "Maqueta enviada",
  propuesta_enviada: "Propuesta enviada",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const LP_STATUS_LABELS: Record<Enums["lp_status"], string> = {
  idea: "Idea",
  en_curso: "En curso",
  entregada: "Entregada",
  validada: "Validada",
};

export const OBV_TYPE_LABELS: Record<Enums["obv_type"], string> = {
  investigacion: "Investigación",
  validacion: "Validación",
  seguimiento: "Seguimiento",
  venta_positiva: "Venta +",
  venta_negativa: "Venta −",
};

export const PRIORITY_LABELS: Record<Enums["task_priority"], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

const DAY_SHORT = ["", "lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** [2, 4] → «mar y jue» · [] → «» */
export function formatGoalDays(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => DAY_SHORT[d] ?? "");
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
