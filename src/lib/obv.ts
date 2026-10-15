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
