import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/session";
import { countPendingFromPreviousWeek, getWeekGoals } from "@/lib/data/goals";
import { addDays, isIsoDate, isoWeekNumber, todayInMadrid, weekStart } from "@/lib/dates";
import { goalProgress, groupGoalsByDay } from "@/lib/goals";
import { formatWeekRange } from "@/lib/format";
import { Avatar, Empty, PageHeader, buttonClass } from "@/components/ui";
import { CarryOverBanner, GoalForm, GoalRow } from "./goals-controls";

export const metadata: Metadata = { title: "Objetivos de la semana" };

export default async function ObjetivosPage({ searchParams }: PageProps<"/objetivos">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const today = todayInMadrid();
  const requested = typeof params.semana === "string" && isIsoDate(params.semana) ? params.semana : today;
  const week = weekStart(requested);
  const currentWeek = weekStart(today);
  const isCurrent = week === currentWeek;

  const [members, goals, pendingBefore] = await Promise.all([
    getMembers(),
    getWeekGoals(week),
    countPendingFromPreviousWeek(week),
  ]);
  const sections = groupGoalsByDay(goals);
  const total = goalProgress(goals);
  const href = (w: string) => (w === currentWeek ? "/objetivos" : `/objetivos?semana=${w}`);
  const ordered = [me, ...members.filter((m) => m.id !== me.id)];

  return (
    <>
      <PageHeader
        title="Objetivos de la semana"
        description={
          <>
            <span className="num">Semana {isoWeekNumber(week)}</span> · {formatWeekRange(week, addDays(week, 6))}
            {week < currentWeek ? " · pasada" : week > currentWeek ? " · próxima" : ""}
          </>
        }
        actions={
          <nav aria-label="Cambiar de semana" className="flex items-center gap-1">
            <Link href={href(addDays(week, -7))} aria-label="Semana anterior" className={buttonClass("ghost", "sm", "w-8 px-0")}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            {isCurrent ? (
              <span className="px-1 text-[13px] text-muted">Esta semana</span>
            ) : (
              <Link href="/objetivos" className={buttonClass("secondary", "sm")}>
                Esta semana
              </Link>
            )}
            <Link href={href(addDays(week, 7))} aria-label="Semana siguiente" className={buttonClass("ghost", "sm", "w-8 px-0")}>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </nav>
        }
      />

      <div className="mx-auto grid max-w-[1200px] gap-x-10 gap-y-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-6">
          {pendingBefore > 0 && week >= currentWeek ? <CarryOverBanner week={week} count={pendingBefore} /> : null}

          <GoalForm week={week} members={members} me={me} />

          {sections.length === 0 ? (
            <Empty title={isCurrent ? "Aún no hay objetivos esta semana" : "Sin objetivos en esta semana"}>
              Escribe arriba cada objetivo, marca qué día toca (o varios, como «martes y jueves») y quién se encarga.
              Desde Tareas puedes vincular tareas a cada objetivo.
            </Empty>
          ) : (
            sections.map((section) => (
              <section key={section.key} aria-labelledby={`dia-${section.key}`}>
                <div className="flex h-8 items-center gap-2 border-b border-line">
                  <h2 id={`dia-${section.key}`} className="text-[13px] font-semibold">
                    {section.label}
                  </h2>
                  <span className="num text-[12px] text-muted">{section.goals.length}</span>
                </div>
                <ul>
                  {section.goals.map((g) => (
                    <GoalRow key={g.id} goal={g} members={members} me={me} week={week} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:pt-1">
          <section aria-labelledby="resumen">
            <h2 id="resumen" className="text-[13px] font-semibold">
              Resumen
            </h2>
            <p className="mt-2">
              <span className="num text-[22px] leading-none font-medium">{total.done}</span>
              <span className="num text-[14px] text-muted"> / {total.total}</span>
              <span className="ml-2 text-[12px] text-muted">hechos</span>
            </p>
            <ul className="mt-4 flex flex-col">
              {ordered.map((m) => {
                const p = goalProgress(goals, m.id);
                return (
                  <li key={m.id} className="flex flex-col gap-1.5 border-b border-line py-2.5 last:border-b-0">
                    <span className="flex items-center gap-2 text-[13px]">
                      <Avatar person={m} size="xs" />
                      {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
                      <span className="num ml-auto text-[12px]">
                        {p.done}
                        <span className="text-muted"> / {p.total}</span>
                      </span>
                    </span>
                    <span className="h-1 rounded-full bg-line">
                      <span
                        className="block h-1 rounded-full bg-text"
                        style={{ width: p.total ? `${(p.done / p.total) * 100}%` : "0%" }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
