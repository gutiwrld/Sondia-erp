import { describe, expect, it } from "vitest";
import { goalProgress, groupGoalsByDay } from "./goals";

const g = (title: string, days: number[], status = "pendiente", owners: string[] = ["g"]) => ({
  title,
  days,
  status,
  owners: owners.map((member_id) => ({ member_id })),
});

describe("objetivos agrupados por día", () => {
  it("un día va a su día; varios días y sin día van aparte, al final", () => {
    const sections = groupGoalsByDay([
      g("Viernes", [5]),
      g("Lunes", [1]),
      g("Martes y jueves", [2, 4]),
      g("Cuando sea", []),
      g("Otro lunes", [1]),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["Lunes", "Viernes", "Varios días", "Sin día"]);
    expect(sections[0].goals.map((x) => x.title)).toEqual(["Lunes", "Otro lunes"]);
  });
});

describe("progreso de la semana", () => {
  const goals = [
    g("a", [1], "hecho", ["g", "d"]),
    g("b", [1], "pendiente", ["g"]),
    g("c", [1], "arrastrado", ["g"]),
    g("d", [1], "no_hecho", ["d"]),
  ];

  it("no cuenta los arrastrados a la semana siguiente", () => {
    expect(goalProgress(goals)).toEqual({ done: 1, total: 3 });
  });

  it("por persona cuenta los objetivos compartidos", () => {
    expect(goalProgress(goals, "g")).toEqual({ done: 1, total: 2 });
    expect(goalProgress(goals, "d")).toEqual({ done: 1, total: 2 });
    expect(goalProgress(goals, "h")).toEqual({ done: 0, total: 0 });
  });
});
