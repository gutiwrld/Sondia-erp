// Objetivos semanales: agrupación por día y resumen de la semana.

export const WEEKDAY_NAMES = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type GoalSection = { key: string; label: string; day: number | null };

type GoalLike = { days: number[]; status: string; owners: { member_id: string }[] };

/**
 * Lunes…Domingo para los objetivos de un día, «Varios días» para los que
 * caen en más de uno (p. ej. martes y jueves) y «Sin día» al final.
 */
export function groupGoalsByDay<T extends GoalLike>(goals: T[]): (GoalSection & { goals: T[] })[] {
  const sections: (GoalSection & { goals: T[] })[] = [
    ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({ key: `d${d}`, label: WEEKDAY_NAMES[d], day: d, goals: [] as T[] })),
    { key: "varios", label: "Varios días", day: null, goals: [] },
    { key: "sin-dia", label: "Sin día", day: null, goals: [] },
  ];
  for (const g of goals) {
    if (g.days.length === 1) sections[g.days[0] - 1].goals.push(g);
    else if (g.days.length > 1) sections[7].goals.push(g);
    else sections[8].goals.push(g);
  }
  return sections.filter((s) => s.goals.length > 0);
}

/** Hechos sobre el total, sin contar los que se pasaron a la semana siguiente. */
export function goalProgress<T extends GoalLike>(goals: T[], memberId?: string) {
  const relevant = goals.filter(
    (g) => g.status !== "arrastrado" && (!memberId || g.owners.some((o) => o.member_id === memberId)),
  );
  return { done: relevant.filter((g) => g.status === "hecho").length, total: relevant.length };
}
