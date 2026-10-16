import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { getEntries } from "@/lib/data/hours";
import {
  countMyOpenTasks,
  getMyClientActions,
  getMyGoals,
  getMyLps,
  getMyPendingObvs,
  getMyTasksDue,
} from "@/lib/data/my-space";
import { isoWeekNumber, todayInMadrid, weekDays, weekStart } from "@/lib/dates";
import { expectedMinutes, minutesByCategory, minutesByWeekday, paceOf, CATEGORY_LABELS, HOUR_CATEGORIES } from "@/lib/hours";
import { obvDeadlineLabel, obvStatus } from "@/lib/obv";
import {
  formatDayMonth,
  formatHours,
  formatLongDate,
  formatRelativeDay,
  formatShortDate,
  greeting,
} from "@/lib/format";
import { LP_STATUS_LABELS, OBV_TYPE_LABELS, STAGE_LABELS, formatGoalDays } from "@/lib/labels";
import { Chip, Empty, HoursMeter, SectionHeading, cx } from "@/components/ui";
import { GoalStatusSelect, TaskCheck } from "./my-space-controls";
import { goalProgress } from "@/lib/goals";
import { taskHref } from "@/lib/tasks";

export const metadata: Metadata = { title: "Mi espacio" };

const WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function MiEspacioPage() {
  const me = await getCurrentMember();
  const today = todayInMadrid();
  const week = weekStart(today);
  const days = weekDays(today);

  const [entries, tasks, openTasks, actions, goals, lps, obvs] = await Promise.all([
    getEntries({ from: week, to: days[6], memberId: me.id }),
    getMyTasksDue(me.id, today),
    countMyOpenTasks(me.id),
    getMyClientActions(me.id, today),
    getMyGoals(me.id, today),
    getMyLps(me.id),
    getMyPendingObvs(me.id),
  ]);

  // Horas
  const done = entries.reduce((s, e) => s + e.minutes, 0);
  const goal = me.weekly_hours_goal * 60;
  const expected = expectedMinutes(me.weekly_hours_goal, week, today);
  const pace = paceOf(done, expected);
  const perDay = minutesByWeekday(entries, today);
  const maxDay = Math.max(...perDay, 60);
  const perCategory = minutesByCategory(entries, today);
  const topCategories = HOUR_CATEGORIES.filter((c) => perCategory[c] > 0).sort((a, b) => perCategory[b] - perCategory[a]);

  // Tareas
  const overdueTasks = tasks.filter((t) => t.due_date! < today);
  const todayTasks = tasks.filter((t) => t.due_date === today);


  // OBVs
  const obvRows = obvs.map((o) => ({ ...o, status: obvStatus(o.meeting_date, null, today) }));
  const lateObvs = obvRows.filter((o) => o.status.state === "fuera_de_plazo");

  // Objetivos
  const goalStats = goalProgress(goals);

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <header className="px-4 pt-6 pb-5 md:px-6 md:pt-8">
        <h1 className="font-serif text-[30px] leading-[1.1] tracking-[-0.005em] md:text-[34px]">
          {greeting()}, {me.short_name}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          <span className="first-letter:uppercase">{formatLongDate(today)}</span> ·{" "}
          <span className="num">semana {isoWeekNumber(today)}</span>
        </p>
      </header>

      {/* Indicadores */}
      <section
        aria-label="Resumen"
        className="grid grid-cols-2 border-y border-line md:grid-cols-4 [&>*]:border-line max-md:[&>*:nth-child(-n+2)]:border-b [&>*:not(:last-child)]:md:border-r max-md:[&>*:nth-child(odd)]:border-r"
      >
        <Indicator href="/horas" label="Horas esta semana">
          <p className="num text-[22px] leading-none font-medium">
            {formatHours(done).replace(" h", "")}
            <span className="text-[14px] text-muted"> / {formatHours(goal)}</span>
          </p>
          <div className="mt-2.5">
            <HoursMeter
              done={done}
              goal={goal}
              expected={expected}
              behind={pace === "por_detras"}
              size="md"
              label={`${formatHours(done)} de ${formatHours(goal)}`}
            />
          </div>
          <p className={cx("mt-1.5 text-[12px]", pace === "por_detras" ? "text-accent-text" : "text-muted")}>
            {pace === "por_detras"
              ? `${formatHours(expected - done)} por detrás del ritmo`
              : pace === "por_delante"
                ? "Por delante del ritmo"
                : "Al día con el ritmo"}
          </p>
        </Indicator>

        <Indicator href="#hoy" label="Para hoy">
          <p className="num text-[22px] leading-none font-medium">{todayTasks.length}</p>
          <p className={cx("mt-auto pt-3 text-[12px]", overdueTasks.length ? "text-accent-text" : "text-muted")}>
            {overdueTasks.length
              ? `${overdueTasks.length} ${overdueTasks.length === 1 ? "atrasada" : "atrasadas"}`
              : openTasks
                ? `${openTasks} abiertas en total`
                : "Sin tareas abiertas"}
          </p>
        </Indicator>

        <Indicator href="/leinn/obvs" label="OBVs por redactar">
          <p className="num text-[22px] leading-none font-medium">{obvRows.length}</p>
          <p className={cx("mt-auto pt-3 text-[12px]", lateObvs.length ? "text-accent-text" : "text-muted")}>
            {lateObvs.length
              ? `${lateObvs.length} fuera de plazo`
              : obvRows.length
                ? "Dentro de los 3 días"
                : "Todo redactado"}
          </p>
        </Indicator>

        <Indicator href="/objetivos" label="Objetivos de la semana">
          <p className="num text-[22px] leading-none font-medium">
            {goalStats.done}
            <span className="text-[14px] text-muted"> / {goalStats.total}</span>
          </p>
          <p className="mt-auto pt-3 text-[12px] text-muted">
            {goalStats.total === 0
              ? "Sin objetivos esta semana"
              : goalStats.done === goalStats.total
                ? "Todos hechos"
                : `${goalStats.total - goalStats.done} por cerrar`}
          </p>
        </Indicator>
      </section>

      <div className="grid gap-x-10 gap-y-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Hoy */}
          <section aria-labelledby="hoy" className="scroll-mt-4">
            <SectionHeading
              id="hoy"
              title="Hoy"
              count={tasks.length}
              action={
                <Link href="/tareas" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text">
                  Tareas <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {tasks.length === 0 ? (
              <Empty compact title={openTasks ? "Nada vence hoy" : "No tienes tareas abiertas"}>
                {openTasks
                  ? `Tienes ${openTasks} ${openTasks === 1 ? "tarea abierta" : "tareas abiertas"} con fecha más adelante.`
                  : "Las tareas con fecha de hoy o atrasadas aparecerán aquí para marcarlas con un clic."}
              </Empty>
            ) : (
              <ul className="border-t border-line">
                {[...overdueTasks, ...todayTasks].map((t) => (
                  <li key={t.id} className="flex min-h-10 items-center gap-1 border-b border-line pr-1">
                    <TaskCheck id={t.id} title={t.title} done={false} />
                    <Link href={taskHref(t.id)} className="min-w-0 flex-1 py-2 hover:underline-offset-2">
                      <span className="line-clamp-2 block text-[13px] md:truncate">{t.title}</span>
                      {t.client ? <span className="block truncate text-[12px] text-muted">{t.client.name}</span> : null}
                    </Link>
                    {t.priority === "alta" ? <Chip>Alta</Chip> : null}
                    <Chip tone={t.due_date! < today ? "accent" : "neutral"}>
                      {formatRelativeDay(t.due_date!, today)}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </section>


          {/* Objetivos */}
          <section aria-labelledby="objetivos">
            <SectionHeading
              id="objetivos"
              title="Mis objetivos de la semana"
              action={
                <Link href="/objetivos" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text">
                  Objetivos <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {goals.length === 0 ? (
              <Empty compact title="Sin objetivos esta semana">
                Los objetivos de la semana con tu nombre aparecerán aquí.{" "}
                <Link href="/objetivos" className="text-text underline">
                  Añadir objetivos
                </Link>
              </Empty>
            ) : (
              <ul className="border-t border-line">
                {goals.map((g) => (
                  <li key={g.id} className="flex min-h-10 items-start gap-3 border-b border-line py-2">
                    <span className="min-w-0 flex-1">
                      <span className={cx("block text-[13px]", g.status === "hecho" && "text-muted line-through decoration-line-strong")}>
                        {g.title}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {[g.days.length ? formatGoalDays(g.days) : null, g.owners.length > 1 ? (g.owners.length === 3 ? "con todo el equipo" : "compartido") : null, g.carried_from_id ? "viene de la semana pasada" : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <GoalStatusSelect id={g.id} title={g.title} status={g.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          {/* Mi semana */}
          <section aria-labelledby="semana">
            <SectionHeading
              id="semana"
              title="Mi semana"
              action={
                <Link href="/horas" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text">
                  Horas <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Horas por día">
              {days.map((d, i) => {
                const m = perDay[i];
                const isToday = d === today;
                const future = d > today;
                return (
                  <div key={d} role="listitem" className="flex flex-col items-center gap-1.5" aria-label={`${formatShortDate(d)}: ${m ? formatHours(m) : "sin horas"}`}>
                    <div className="flex h-16 w-full items-end justify-center border-b border-line">
                      <div
                        className={cx(
                          "w-full max-w-[20px] rounded-t-xs",
                          isToday ? "bg-text" : "bg-muted/45",
                          future && "opacity-0",
                        )}
                        style={{ height: `${(m / maxDay) * 100}%` }}
                      />
                    </div>
                    <span className={cx("num text-[11px]", isToday ? "font-semibold text-text" : "text-muted")}>
                      {WEEKDAY_INITIALS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            {topCategories.length ? (
              <p className="mt-3 text-[12px] text-muted">
                {topCategories.slice(0, 3).map((c, i) => (
                  <span key={c}>
                    {i > 0 ? " · " : ""}
                    {CATEGORY_LABELS[c]} <span className="num text-text">{formatHours(perCategory[c])}</span>
                  </span>
                ))}
              </p>
            ) : (
              <p className="mt-3 text-[12px] text-muted">
                Aún no has apuntado horas esta semana. Pulsa <kbd className="num">H</kbd> o «Apuntar horas».
              </p>
            )}
          </section>

          {/* LPs y OBVs */}
          <section aria-labelledby="leinn" className="scroll-mt-4">
            <SectionHeading id="leinn" title="Mis LPs y OBVs" />
            {obvRows.length === 0 && lps.length === 0 ? (
              <Empty compact title="Sin LPs ni OBVs abiertas">
                Aquí verás tus entregas de LP y las OBVs que te quedan por redactar, con los días que quedan.
              </Empty>
            ) : (
              <ul className="border-t border-line">
                {obvRows.map((o) => (
                  <li key={o.id} className="border-b border-line">
                    <Link href={`/leinn/obvs?obv=${o.id}`} className="flex min-h-10 items-center gap-3 py-2 hover:bg-surface-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">
                          OBV{o.number ? <span className="num"> {o.number}</span> : null} · {o.interviewee || o.company}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {OBV_TYPE_LABELS[o.type]} · reunión el {formatDayMonth(o.meeting_date)}
                        </span>
                      </span>
                      <Chip tone={o.status.state === "fuera_de_plazo" ? "accent" : "neutral"}>{obvDeadlineLabel(o.status)}</Chip>
                    </Link>
                  </li>
                ))}
                {lps.map((lp) => (
                  <li key={lp.id} className="border-b border-line">
                    <Link href={`/leinn/lps?lp=${lp.id}`} className="flex min-h-10 items-center gap-3 py-2 hover:bg-surface-hover">
                    <span className="num w-9 shrink-0 text-[12px] text-muted">{lp.number ? `LP ${lp.number}` : "LP"}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]" title={lp.title}>
                      {lp.title}
                    </span>
                    {lp.due_date ? (
                      <span className="num shrink-0 text-[12px] text-muted">{formatDayMonth(lp.due_date)}</span>
                    ) : null}
                    <Chip>{LP_STATUS_LABELS[lp.status]}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Próximas acciones con clientes: en segundo plano, compactas. */}
          <section aria-labelledby="acciones" className="scroll-mt-4">
            <h2 id="acciones" className="flex h-8 items-center gap-2 text-[12px] font-medium text-muted">
              Próximas acciones con clientes
              {actions.length ? <span className="num">{actions.length}</span> : null}
            </h2>
            {actions.length === 0 ? (
              <p className="text-[12px] text-muted">Ninguna en los próximos 7 días.</p>
            ) : (
              <ul className="flex flex-col">
                {actions.slice(0, 5).map((a) => {
                  const late = a.next_action_date < today;
                  return (
                    <li key={a.id} className="grid grid-cols-[64px_minmax(0,1fr)] items-baseline gap-2 py-1 text-[12px]">
                      <span className={cx("num", late ? "text-accent-text" : "text-muted")}>
                        {late || a.next_action_date === today
                          ? formatRelativeDay(a.next_action_date, today)
                          : formatShortDate(a.next_action_date).replace(/^\S+ /, "")}
                      </span>
                      <span className="truncate text-muted">
                        <Link href={`/clientes/${a.id}`} className="text-text hover:underline">
                          {a.name}
                        </Link>{" "}
                        · {a.next_action || STAGE_LABELS[a.stage]}
                      </span>
                    </li>
                  );
                })}
                {actions.length > 5 ? (
                  <li className="py-1 text-[12px] text-muted">y {actions.length - 5} más</li>
                ) : null}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Indicator({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-[118px] flex-col px-4 py-4 transition-colors duration-150 hover:bg-surface-hover md:px-6"
    >
      <span className="mb-2 text-[12px] text-muted">{label}</span>
      {children}
    </Link>
  );
}
