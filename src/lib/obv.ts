// Regla LEINN: una OBV se redacta como mucho 3 días naturales después de la reunión.

import { addDays, daysBetween, type IsoDate } from "./dates";

export const OBV_DEADLINE_DAYS = 3;

export type ObvState = "pendiente" | "fuera_de_plazo" | "redactada" | "redactada_tarde";

export type ObvStatus = {
  state: ObvState;
  deadline: IsoDate;
  /** Días desde la reunión hasta hoy (o hasta la redacción, si ya está redactada). */
  daysSinceMeeting: number;
  /** Días que quedan para el plazo (negativo si ya ha pasado). */
  daysLeft: number;
  needsAttention: boolean;
};

export function obvStatus(meetingDate: IsoDate, writtenDate: IsoDate | null, today: IsoDate): ObvStatus {
  const deadline = addDays(meetingDate, OBV_DEADLINE_DAYS);
  if (writtenDate) {
    const late = writtenDate > deadline;
    return {
      state: late ? "redactada_tarde" : "redactada",
      deadline,
      daysSinceMeeting: daysBetween(meetingDate, writtenDate),
      daysLeft: daysBetween(writtenDate, deadline),
      needsAttention: false,
    };
  }
  const overdue = today > deadline;
  return {
    state: overdue ? "fuera_de_plazo" : "pendiente",
    deadline,
    daysSinceMeeting: Math.max(0, daysBetween(meetingDate, today)),
    daysLeft: daysBetween(today, deadline),
    needsAttention: true,
  };
}

/** Texto corto del plazo para chips: «quedan 2 días», «hoy es el último día», «5 días · fuera de plazo». */
export function obvDeadlineLabel(s: ObvStatus): string {
  switch (s.state) {
    case "fuera_de_plazo":
      return `${s.daysSinceMeeting} días · fuera de plazo`;
    case "pendiente":
      return s.daysLeft === 0 ? "hoy es el último día" : `quedan ${s.daysLeft} ${s.daysLeft === 1 ? "día" : "días"}`;
    case "redactada_tarde":
      return "redactada fuera de plazo";
    case "redactada":
      return "redactada a tiempo";
  }
}

/** ¿Entrega de LP en los próximos `days` días (incluida hoy)? */
export function isDueSoon(due: IsoDate | null, today: IsoDate, days = 7): boolean {
  return Boolean(due && due >= today && due <= addDays(today, days));
}
