import { describe, expect, it } from "vitest";
import { isActionOverdue, openPipelineValue, paidInMonth, placeLabel, stageTotals } from "./clients";

const c = (stage: Parameters<typeof stageTotals>[0][number]["stage"], value_eur: number | string | null) => ({
  stage,
  value_eur,
});

describe("pipeline", () => {
  const clients = [
    c("propuesta_enviada", 490),
    c("propuesta_enviada", "490.00"),
    c("negociacion", null),
    c("ganado", 290),
    c("contactado", null),
    c("perdido", 490),
  ];

  it("cuenta y suma por etapa (valores de Postgres en texto incluidos)", () => {
    const t = stageTotals(clients);
    expect(t.propuesta_enviada).toEqual({ count: 2, value: 980 });
    expect(t.negociacion).toEqual({ count: 1, value: 0 });
    expect(t.ganado).toEqual({ count: 1, value: 290 });
  });

  it("el valor abierto no cuenta ganados, perdidos ni leads", () => {
    expect(openPipelineValue(clients)).toBe(980);
  });

  it("próxima acción vencida", () => {
    expect(isActionOverdue("2026-10-14", "2026-10-15")).toBe(true);
    expect(isActionOverdue("2026-10-15", "2026-10-15")).toBe(false);
    expect(isActionOverdue(null, "2026-10-15")).toBe(false);
  });

  it("cobrado en el mes", () => {
    const payments = [
      { amount_eur: "175.45", paid_on: "2026-10-08" },
      { amount_eur: 114.55, paid_on: "2026-10-20" },
      { amount_eur: 490, paid_on: "2026-11-02" },
    ];
    expect(paidInMonth(payments, "2026-10")).toBeCloseTo(290);
    expect(paidInMonth(payments, "2026-09")).toBe(0);
  });
});

describe("lugar", () => {
  it("no repite la provincia", () => {
    expect(placeLabel("Urueña (Valladolid)", "Valladolid")).toBe("Urueña (Valladolid)");
    expect(placeLabel("Tordesillas", "Valladolid")).toBe("Tordesillas, Valladolid");
    expect(placeLabel("Ávila", "Avila")).toBe("Ávila");
    expect(placeLabel("", "Murcia")).toBe("Murcia");
  });
});
