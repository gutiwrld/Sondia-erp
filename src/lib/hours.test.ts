import { describe, expect, it } from "vitest";
import { addDays, isoWeekNumber, madridDate, weekEnd, weekStart } from "./dates";
import {
  entryFromTimer,
  expectedMinutes,
  minutesByMember,
  minutesByWeekday,
  paceOf,
  weekMinutes,
  type EntryLike,
} from "./hours";

const G = "guzman";
const D = "dani";

function entry(member_id: string, date: string, minutes: number): EntryLike {
  return { member_id, date, minutes, category: "ventas" };
}

describe("semanas de lunes a domingo", () => {
  it("el lunes y el domingo pertenecen a la misma semana", () => {
    expect(weekStart("2026-10-12")).toBe("2026-10-12"); // lunes
    expect(weekStart("2026-10-15")).toBe("2026-10-12"); // jueves
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // domingo
    expect(weekEnd("2026-10-12")).toBe("2026-10-18");
    expect(weekStart("2026-10-19")).toBe("2026-10-19"); // lunes siguiente
  });

  it("cruza meses y años", () => {
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("la semana del cambio de hora de octubre sigue teniendo 7 días", () => {
    // El 25 oct 2026 a las 3:00 se vuelve a las 2:00 en Madrid.
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
  });

  it("número de semana ISO", () => {
    expect(isoWeekNumber("2026-10-15")).toBe(42);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
  });
});

describe("suma de horas por semana", () => {
  const entries = [
    entry(G, "2026-10-11", 600), // domingo de la semana anterior
    entry(G, "2026-10-12", 150), // lunes
    entry(G, "2026-10-15", 90),
    entry(G, "2026-10-18", 60), // domingo
    entry(G, "2026-10-19", 300), // lunes siguiente
    entry(D, "2026-10-13", 240),
  ];

  it("suma solo las entradas de lunes a domingo de esa semana", () => {
    expect(weekMinutes(entries, "2026-10-15", G)).toBe(300);
  });

  it("da igual qué día de la semana se consulte", () => {
    expect(weekMinutes(entries, "2026-10-12", G)).toBe(300);
    expect(weekMinutes(entries, "2026-10-18", G)).toBe(300);
  });

  it("sin persona suma a todo el equipo", () => {
    expect(weekMinutes(entries, "2026-10-15")).toBe(540);
  });

  it("separa por persona", () => {
    const totals = minutesByMember(entries, "2026-10-15");
    expect(totals.get(G)).toBe(300);
    expect(totals.get(D)).toBe(240);
  });

  it("reparte por día de lunes a domingo", () => {
    expect(minutesByWeekday(entries, "2026-10-15", G)).toEqual([150, 0, 0, 90, 0, 0, 60]);
  });

  it("una semana sin entradas suma cero", () => {
    expect(weekMinutes(entries, "2026-11-02", G)).toBe(0);
  });
});

describe("ritmo esperado", () => {
  it("reparte el objetivo entre los 5 días laborables, incluido hoy", () => {
    expect(expectedMinutes(25, "2026-10-12", "2026-10-12")).toBe(300); // lunes: 5 h
    expect(expectedMinutes(25, "2026-10-12", "2026-10-15")).toBe(1200); // jueves: 20 h
    expect(expectedMinutes(25, "2026-10-12", "2026-10-16")).toBe(1500); // viernes: 25 h
  });

  it("el fin de semana cuenta como el 100 %", () => {
    expect(expectedMinutes(25, "2026-10-12", "2026-10-18")).toBe(1500);
  });

  it("semanas pasadas al 100 % y futuras a 0", () => {
    expect(expectedMinutes(25, "2026-10-05", "2026-10-15")).toBe(1500);
    expect(expectedMinutes(25, "2026-10-19", "2026-10-15")).toBe(0);
  });

  it("avisa solo si vas más de una hora por detrás", () => {
    expect(paceOf(1140, 1200)).toBe("al_dia");
    expect(paceOf(1139, 1200)).toBe("por_detras");
    expect(paceOf(1260, 1200)).toBe("por_delante");
  });
});

describe("cronómetro", () => {
  it("la entrada cuenta en el día de Madrid en que empezó", () => {
    // 23:30 del domingo en Madrid (21:30 UTC en horario de verano) → 1:00 del lunes.
    const start = new Date("2026-10-18T21:30:00Z");
    const stop = new Date("2026-10-18T23:00:00Z");
    const e = entryFromTimer(start, stop);
    expect(e.date).toBe("2026-10-18");
    expect(e.minutes).toBe(90);
    expect(e.valid).toBe(true);
    expect(weekMinutes([entry(G, e.date, e.minutes)], "2026-10-15", G)).toBe(90);
  });

  it("de madrugada en UTC ya es el día siguiente en Madrid", () => {
    expect(madridDate(new Date("2026-10-12T22:30:00Z"))).toBe("2026-10-13");
    expect(madridDate(new Date("2026-12-14T23:30:00Z"))).toBe("2026-12-15"); // horario de invierno
  });

  it("la noche del cambio de hora dura una hora más", () => {
    // 25 oct 2026: 00:00 CEST (22:00 UTC del 24) → 04:00 CET (03:00 UTC) = 5 h reales.
    const e = entryFromTimer(new Date("2026-10-24T22:00:00Z"), new Date("2026-10-25T03:00:00Z"));
    expect(e.date).toBe("2026-10-25");
    expect(e.minutes).toBe(300);
  });

  it("rechaza cronómetros vacíos o de más de 24 h", () => {
    const t = new Date("2026-10-15T08:00:00Z");
    expect(entryFromTimer(t, new Date(t.getTime() + 20_000)).valid).toBe(false);
    expect(entryFromTimer(t, new Date(t.getTime() + 25 * 3_600_000)).valid).toBe(false);
  });
});
