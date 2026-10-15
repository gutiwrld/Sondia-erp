import { describe, expect, it } from "vitest";
import { durationInput, parseDuration } from "./duration";
import {
  formatDuration,
  formatEur,
  formatHours,
  formatLongDate,
  formatShortDate,
  formatWeekRange,
} from "./format";

const nbsp = (s: string) => s.replace(/ /g, " ");

describe("formato español", () => {
  it("euros con separador de miles siempre", () => {
    expect(nbsp(formatEur(1234.56))).toBe("1.234,56 €");
    expect(nbsp(formatEur(290))).toBe("290,00 €");
    expect(nbsp(formatEur(1470, { round: true }))).toBe("1.470 €");
  });

  it("horas con coma decimal", () => {
    expect(formatHours(450)).toBe("7,5 h");
    expect(formatHours(1500)).toBe("25 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2 h");
  });

  it("fechas", () => {
    expect(formatShortDate("2026-10-13")).toBe("mar 13 oct");
    expect(formatLongDate("2026-10-15")).toBe("jueves 15 de octubre");
    expect(formatWeekRange("2026-10-12", "2026-10-18")).toBe("12–18 oct");
    expect(formatWeekRange("2026-10-26", "2026-11-01")).toBe("26 oct – 1 nov");
  });
});

describe("parser de duraciones", () => {
  it.each([
    ["1,5", 90],
    ["1.5", 90],
    ["2", 120],
    ["0,25", 15],
    ["1h30", 90],
    ["1h 30m", 90],
    ["1 h 30 min", 90],
    ["2h", 120],
    ["2 horas", 120],
    ["1,5h", 90],
    ["90m", 90],
    ["90 min", 90],
    ["45'", 45],
    ["45", 45],
    ["1:30", 90],
    [" 1H30 ", 90],
  ])("«%s» son %i minutos", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });

  it.each(["", "abc", "0", "0m", "25h", "1:75", "-1", "1,5,5"])("«%s» no es válido", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe("duración para rellenar el formulario", () => {
  it.each([[90, "1h30"], [45, "45m"], [120, "2h"], [65, "1h05"], [1440, "24h"]])("%i → «%s» y vuelta", (minutes, text) => {
    expect(durationInput(minutes)).toBe(text);
    expect(parseDuration(text)).toBe(minutes);
  });
});
