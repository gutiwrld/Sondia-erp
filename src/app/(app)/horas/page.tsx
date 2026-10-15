import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getEntries, getLinkOptions, getTimer } from "@/lib/data/hours";
import { addDays, isIsoDate, isoWeekNumber, todayInMadrid, weekDays, weekStart } from "@/lib/dates";
import {
  CATEGORY_LABELS,
  HOUR_CATEGORIES,
  expectedMinutes,
  minutesByCategory,
  minutesByMember,
  paceOf,
} from "@/lib/hours";
import { formatHours, formatWeekRange, formatWeekday, formatDayMonth } from "@/lib/format";
import { Avatar, Empty, HoursMeter, PageHeader, SectionHeading, cx, buttonClass } from "@/components/ui";
import { EntryForm } from "@/components/app/entry-form";
import { RunningTimer } from "@/components/app/timer";
import { EntryRow } from "./entry-row";

export const metadata: Metadata = { title: "Horas" };

export default async function HorasPage({ searchParams }: PageProps<"/horas">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const today = todayInMadrid();

  const requestedWeek = typeof params.semana === "string" && isIsoDate(params.semana) ? params.semana : today;
  const week = weekStart(requestedWeek);
  const days = weekDays(week);
  const weekEndDate = days[6];
  const isCurrentWeek = week === weekStart(today);
  const isFutureWeek = week > today;

  const members = await getMembers();
  const persona = typeof params.persona === "string" ? params.persona : me.id;
  const selected = persona === "equipo" ? null : (members.find((m) => m.id === persona) ?? me);

  const [entries, linkOptions, timer] = await Promise.all([
    getEntries({ from: week, to: weekEndDate }),
    getLinkOptions(),
    getTimer(me.id),
  ]);

  const byMember = minutesByMember(entries, week);
  const visible = selected ? entries.filter((e) => e.member_id === selected.id) : entries;
  const byCategory = minutesByCategory(visible, week);
  const visibleTotal = visible.reduce((s, e) => s + e.minutes, 0);
  const maxCategory = Math.max(...Object.values(byCategory), 1);
  const membersById = new Map(members.map((m) => [m.id, m]));

  const groups = days
    .slice()
    .reverse()
    .map((day) => ({ day, entries: visible.filter((e) => e.date === day) }))
    .filter((g) => g.entries.length > 0);

  const href = (next: { semana?: string; persona?: string }) => {
    const q = new URLSearchParams();
    const s = next.semana ?? (isCurrentWeek ? undefined : week);
    const p = next.persona ?? (persona === me.id ? undefined : persona);
    if (s && s !== weekStart(today)) q.set("semana", s);
    if (p && p !== me.id) q.set("persona", p);
    const qs = q.toString();
    return qs ? `/horas?${qs}` : "/horas";
  };

  const personaTabs = [
    ...members.map((m) => ({ id: m.id, label: m.id === me.id ? "Yo" : m.short_name })),
    { id: "equipo", label: "Equipo" },
  ];

  return (
    <>
      <PageHeader
        title="Horas"
        description={
          <>
            <span className="num">Semana {isoWeekNumber(week)}</span> · {formatWeekRange(week, weekEndDate)}
          </>
        }
        actions={
          <nav aria-label="Cambiar de semana" className="flex items-center gap-1">
            <Link href={href({ semana: addDays(week, -7) })} aria-label="Semana anterior" className={buttonClass("ghost", "sm", "w-8 px-0")}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            {!isCurrentWeek ? (
              <Link href={href({ semana: weekStart(today) })} className={buttonClass("secondary", "sm")}>
                Esta semana
              </Link>
            ) : (
              <span className="px-1 text-[13px] text-muted">Esta semana</span>
            )}
            <Link href={href({ semana: addDays(week, 7) })} aria-label="Semana siguiente" className={buttonClass("ghost", "sm", "w-8 px-0")}>
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </nav>
        }
      />

      <section aria-label="Apuntar horas" className="border-b border-line bg-surface-sunken px-4 py-4 md:px-6">
        {timer ? (
          <div className="mb-3 flex max-w-sm flex-col gap-1">
            <p className="text-[12px] font-medium text-muted">Cronómetro en marcha</p>
            <RunningTimer
              timer={{
                started_at: timer.started_at,
                category: timer.category,
                label: timer.client?.name ?? timer.task?.title ?? (timer.note || null),
              }}
            />
          </div>
        ) : null}
        <EntryForm today={today} linkOptions={linkOptions} layout="inline" showTimerButton={!timer} />
      </section>

      <div className="grid gap-x-10 gap-y-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="entradas" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 id="entradas" className="text-[13px] font-semibold">
              Entradas
            </h2>
            <span className="num text-[12px] text-muted">{formatHours(visibleTotal)}</span>
            <nav aria-label="Ver horas de" className="ml-auto flex rounded-sm border border-line bg-surface p-0.5">
              {personaTabs.map((t) => {
                const active = (selected?.id ?? "equipo") === t.id;
                return (
                  <Link
                    key={t.id}
                    aria-current={active ? "true" : undefined}
                    href={href({ persona: t.id })}
                    className={cx(
                      "flex h-7 items-center rounded-xs px-2.5 text-[12px] transition-colors duration-150 max-md:h-9",
                      active ? "bg-surface-hover font-medium text-text" : "text-muted hover:text-text",
                    )}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {groups.length === 0 ? (
            isFutureWeek ? (
              <Empty title="Esta semana aún no ha empezado">
                Las horas se apuntan el día que se trabajan. Vuelve a esta semana para ver lo que llevas.
              </Empty>
            ) : selected?.id === me.id ? (
              <Empty title={isCurrentWeek ? "Aún no has apuntado horas esta semana" : "No apuntaste horas esta semana"}>
                Escribe la duración arriba (<span className="num">1,5</span>, <span className="num">1h30</span> o{" "}
                <span className="num">90m</span>), elige la categoría y pulsa Enter. Desde cualquier pantalla puedes
                pulsar <kbd className="num">H</kbd> o usar el cronómetro.
              </Empty>
            ) : (
              <Empty title={selected ? `${selected.short_name} no tiene horas esta semana` : "Nadie ha apuntado horas esta semana"} />
            )
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((g) => {
                const total = g.entries.reduce((s, e) => s + e.minutes, 0);
                return (
                  <section key={g.day} aria-label={`${formatWeekday(g.day)} ${formatDayMonth(g.day)}`}>
                    <div className="flex h-8 items-center gap-2 border-b border-line">
                      <h3 className="text-[13px] font-medium">
                        {g.day === today ? "Hoy" : formatWeekday(g.day)}{" "}
                        <span className="font-normal text-muted">{formatDayMonth(g.day)}</span>
                      </h3>
                      <span className="num ml-auto text-[12px] text-muted">{formatHours(total)}</span>
                    </div>
                    <ul>
                      {g.entries.map((e) => (
                        <EntryRow
                          key={e.id}
                          entry={e}
                          person={selected ? null : (membersById.get(e.member_id) ?? null)}
                          editable={e.member_id === me.id}
                          today={today}
                          linkOptions={linkOptions}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="equipo-horas">
            <SectionHeading id="equipo-horas" title="Equipo" />
            <ul className="flex flex-col">
              {members.map((m) => {
                const done = byMember.get(m.id) ?? 0;
                const goal = m.weekly_hours_goal * 60;
                const expected = expectedMinutes(m.weekly_hours_goal, week, today);
                const pace = paceOf(done, expected);
                const behind = pace === "por_detras" && !isFutureWeek;
                return (
                  <li key={m.id} className="border-b border-line py-2.5 last:border-b-0">
                    <Link href={href({ persona: m.id })} className="group flex flex-col gap-1.5 rounded-xs">
                      <span className="flex items-center gap-2">
                        <Avatar person={m} size="xs" />
                        <span className="text-[13px] group-hover:underline">{m.id === me.id ? `${m.short_name} (tú)` : m.short_name}</span>
                        <span className="num ml-auto text-[12px]">
                          {formatHours(done).replace(" h", "")}
                          <span className="text-muted"> / {formatHours(goal)}</span>
                        </span>
                      </span>
                      <HoursMeter
                        done={done}
                        goal={goal}
                        expected={expected}
                        behind={behind}
                        label={`${m.short_name}: ${formatHours(done)} de ${formatHours(goal)}`}
                      />
                      {behind && isCurrentWeek ? (
                        <span className="text-[11px] text-accent-text">
                          {formatHours(expected - done)} por detrás del ritmo
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="por-categoria">
            <SectionHeading
              id="por-categoria"
              title="Por categoría"
              action={<span className="text-[12px] text-muted">{selected ? (selected.id === me.id ? "Tú" : selected.short_name) : "Equipo"}</span>}
            />
            <ul className="flex flex-col gap-2">
              {HOUR_CATEGORIES.map((c) => (
                <li key={c} className="grid grid-cols-[88px_1fr_48px] items-center gap-3 text-[12px]">
                  <span className="text-muted">{CATEGORY_LABELS[c]}</span>
                  <span className="h-1 rounded-full bg-line">
                    <span
                      className="block h-1 rounded-full bg-text"
                      style={{ width: `${(byCategory[c] / maxCategory) * 100}%` }}
                    />
                  </span>
                  <span className="num text-right">{byCategory[c] ? formatHours(byCategory[c]) : "—"}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

