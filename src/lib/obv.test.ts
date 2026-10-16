import { describe, expect, it } from "vitest";
import { isDueSoon, obvDeadlineLabel, obvStatus } from "./obv";

describe("regla de los 3 días de las OBVs", () => {
  const meeting = "2026-10-05"; // lunes

  it("el plazo es la fecha de la reunión + 3 días naturales", () => {
    expect(obvStatus(meeting, null, meeting).deadline).toBe("2026-10-08");
  });

  it("dentro de plazo hasta el tercer día incluido", () => {
    const s = obvStatus(meeting, null, "2026-10-08");
    expect(s.state).toBe("pendiente");
    expect(s.daysSinceMeeting).toBe(3);
    expect(s.daysLeft).toBe(0);
    expect(s.needsAttention).toBe(true);
  });

  it("al cuarto día sin redactar está fuera de plazo", () => {
    const s = obvStatus(meeting, null, "2026-10-09");
    expect(s.state).toBe("fuera_de_plazo");
    expect(s.daysSinceMeeting).toBe(4);
    expect(s.daysLeft).toBe(-1);
  });

  it("el mismo día de la reunión quedan 3 días", () => {
    const s = obvStatus(meeting, null, meeting);
    expect(s.state).toBe("pendiente");
    expect(s.daysLeft).toBe(3);
  });

  it("redactada a tiempo no avisa", () => {
    const s = obvStatus(meeting, "2026-10-07", "2026-10-20");
    expect(s.state).toBe("redactada");
    expect(s.needsAttention).toBe(false);
  });

  it("redactada el último día sigue a tiempo", () => {
    expect(obvStatus(meeting, "2026-10-08", "2026-10-20").state).toBe("redactada");
  });

  it("redactada después del plazo queda marcada como tarde", () => {
    const s = obvStatus(meeting, "2026-10-10", "2026-10-20");
    expect(s.state).toBe("redactada_tarde");
    expect(s.needsAttention).toBe(false);
  });

  it("cruza meses", () => {
    expect(obvStatus("2026-10-30", null, "2026-11-02").state).toBe("pendiente");
    expect(obvStatus("2026-10-30", null, "2026-11-03").state).toBe("fuera_de_plazo");
  });
});

describe("textos del plazo", () => {
  it("para cada estado", () => {
    expect(obvDeadlineLabel(obvStatus("2026-10-05", null, "2026-10-05"))).toBe("quedan 3 días");
    expect(obvDeadlineLabel(obvStatus("2026-10-05", null, "2026-10-07"))).toBe("quedan 1 día");
    expect(obvDeadlineLabel(obvStatus("2026-10-05", null, "2026-10-08"))).toBe("hoy es el último día");
    expect(obvDeadlineLabel(obvStatus("2026-10-05", null, "2026-10-10"))).toBe("5 días · fuera de plazo");
    expect(obvDeadlineLabel(obvStatus("2026-10-05", "2026-10-10", "2026-10-15"))).toBe("redactada fuera de plazo");
  });

  it("entregas de LP próximas", () => {
    expect(isDueSoon("2026-10-15", "2026-10-15")).toBe(true);
    expect(isDueSoon("2026-10-22", "2026-10-15")).toBe(true);
    expect(isDueSoon("2026-10-23", "2026-10-15")).toBe(false);
    expect(isDueSoon("2026-10-14", "2026-10-15")).toBe(false);
    expect(isDueSoon(null, "2026-10-15")).toBe(false);
  });
});
