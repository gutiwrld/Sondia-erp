import { describe, expect, it } from "vitest";
import { compareTasks, dueGroup, groupByDue, isRecentlyDone, type TaskPriority } from "./tasks";

const today = "2026-10-15"; // jueves

describe("grupos de tareas por fecha", () => {
  it.each([
    [null, "sin_fecha"],
    ["2026-10-14", "atrasadas"],
    ["2026-09-01", "atrasadas"],
    ["2026-10-15", "hoy"],
    ["2026-10-16", "esta_semana"],
    ["2026-10-18", "esta_semana"], // domingo
    ["2026-10-19", "mas_adelante"], // lunes siguiente
  ] as const)("%s → %s", (due, group) => {
    expect(dueGroup(due, today)).toBe(group);
  });

  it("el domingo, el lunes ya es «Más adelante»", () => {
    expect(dueGroup("2026-10-19", "2026-10-18")).toBe("mas_adelante");
  });

  it("agrupa en orden y omite los grupos vacíos", () => {
    const t = (due_date: string | null, priority: TaskPriority = "media", created_at = "2026-10-01") => ({
      due_date,
      priority,
      created_at,
    });
    const groups = groupByDue([t(null), t("2026-10-20"), t("2026-10-10"), t("2026-10-15")], today);
    expect(groups.map((g) => g.group)).toEqual(["atrasadas", "hoy", "mas_adelante", "sin_fecha"]);
  });
});

describe("orden dentro de un grupo", () => {
  const t = (due_date: string | null, priority: TaskPriority, created_at: string) => ({ due_date, priority, created_at });

  it("primero la fecha más cercana", () => {
    expect(compareTasks(t("2026-10-16", "baja", "a"), t("2026-10-17", "alta", "a"))).toBeLessThan(0);
  });

  it("a igual fecha, primero la prioridad alta", () => {
    expect(compareTasks(t("2026-10-16", "alta", "b"), t("2026-10-16", "media", "a"))).toBeLessThan(0);
  });

  it("a igual fecha y prioridad, la más antigua", () => {
    expect(compareTasks(t(null, "media", "2026-10-01"), t(null, "media", "2026-10-02"))).toBeLessThan(0);
  });

  it("las que no tienen fecha van al final", () => {
    expect(compareTasks(t(null, "alta", "a"), t("2026-12-01", "baja", "a"))).toBeGreaterThan(0);
  });
});

describe("hechas recientes", () => {
  it("solo las de los últimos 7 días", () => {
    expect(isRecentlyDone("2026-10-08T10:00:00Z", today)).toBe(true);
    expect(isRecentlyDone("2026-10-07T10:00:00Z", today)).toBe(false);
    expect(isRecentlyDone(null, today)).toBe(false);
  });
});
