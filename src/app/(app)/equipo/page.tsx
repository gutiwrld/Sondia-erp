import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getEntries } from "@/lib/data/hours";
import { getPipelineClients, getPaymentsSince } from "@/lib/data/clients";
import { getLps, getObvs } from "@/lib/data/leinn";
import { getWeekGoals } from "@/lib/data/goals";
import {
  addDays,
  isoWeekNumber,
  todayInMadrid,
  weekEnd,
  weekStart,
} from "@/lib/dates";
import { expectedMinutes, minutesByMember, paceOf } from "@/lib/hours";
import {
  PIPELINE_STAGES,
  openPipelineValue,
  paidInMonth,
  stageTotals,
} from "@/lib/clients";
import { goalProgress } from "@/lib/goals";
import { obvDeadlineLabel, obvStatus } from "@/lib/obv";
import {
  formatDayMonth,
  formatEur,
  formatHours,
  formatRelativeDay,
  formatWeekRange,
} from "@/lib/format";
import { STAGE_LABELS } from "@/lib/labels";
import {
  Avatar,
  AvatarStack,
  Chip,
  Empty,
  HoursMeter,
  PageHeader,
  SectionHeading,
  cx,
} from "@/components/ui";

export const metadata: Metadata = { title: "Inicio del equipo" };

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export default async function EquipoPage() {
  const me = await getCurrentMember();
  const today = todayInMadrid();
  const week = weekStart(today);
  const month = today.slice(0, 7);
  const lastMonth = previousMonth(month);

  const [members, entries, clients, payments, lps, obvs, goals] =
    await Promise.all([
      getMembers(),
      getEntries({ from: week, to: weekEnd(today) }),
      getPipelineClients(),
      getPaymentsSince(`${lastMonth}-01`),
      getLps(),
      getObvs(),
      getWeekGoals(week),
    ]);
  const membersById = new Map(members.map((m) => [m.id, m]));

  // Horas
  const byMember = minutesByMember(entries, week);
  const teamDone = [...byMember.values()].reduce((s, v) => s + v, 0);
  const teamGoal = members.reduce((s, m) => s + m.weekly_hours_goal * 60, 0);

  // Dinero
  const paid = paidInMonth(payments, month);
  const paidBefore = paidInMonth(payments, lastMonth);
  const delta = paid - paidBefore;
  const totals = stageTotals(clients);
  const pipeline = openPipelineValue(clients);
  const stages = PIPELINE_STAGES.map((s) => ({ stage: s, ...totals[s] }));
  const maxStage = Math.max(...stages.map((s) => s.value), 1);
  const noValue = clients.filter(
    (c) =>
      PIPELINE_STAGES.includes(c.stage) &&
      c.stage !== "ganado" &&
      !Number(c.value_eur),
  ).length;

  // Entregas de los próximos 14 días
  const horizon = addDays(today, 14);
  const pendingObvs = obvs
    .filter((o) => !o.written_date)
    .map((o) => ({ ...o, status: obvStatus(o.meeting_date, null, today) }));
  const lateObvs = pendingObvs.filter(
    (o) => o.status.state === "fuera_de_plazo",
  ).length;
  const deliveries = [
    ...lps
      .filter(
        (lp) =>
          (lp.status === "idea" || lp.status === "en_curso") &&
          lp.due_date &&
          lp.due_date <= horizon,
      )
      .map((lp) => ({
        key: `lp-${lp.id}`,
        date: lp.due_date!,
        href: `/leinn/lps?lp=${lp.id}`,
        kind: lp.number ? `LP ${lp.number}` : "LP",
        title: lp.title,
        owner: membersById.get(lp.owner_id),
        chip:
          lp.due_date! < today ? formatRelativeDay(lp.due_date!, today) : null,
        late: lp.due_date! < today,
      })),
    ...pendingObvs.map((o) => ({
      key: `obv-${o.id}`,
      date: o.status.deadline,
      href: `/leinn/obvs?obv=${o.id}`,
      kind: o.number ? `OBV ${o.number}` : "OBV",
      title: o.interviewee || o.company,
      owner: membersById.get(o.owner_id),
      chip: obvDeadlineLabel(o.status),
      late: o.status.state === "fuera_de_plazo",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Objetivos
  const goalStats = goalProgress(goals);
  const visibleGoals = goals.filter((g) => g.status !== "arrastrado");

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <PageHeader
        title="Inicio del equipo"
        description={
          <>
            <span className="num">Semana {isoWeekNumber(today)}</span> ·{" "}
            {formatWeekRange(week, weekEnd(today))}
          </>
        }
      />

      <section
        aria-label="Resumen del equipo"
        className="grid grid-cols-2 border-b border-line md:grid-cols-4 [&>*]:border-line max-md:[&>*:nth-child(-n+2)]:border-b [&>*:not(:last-child)]:md:border-r max-md:[&>*:nth-child(odd)]:border-r"
      >
        <Tile
          href="/clientes"
          label={`Cobrado en ${MONTHS[Number(month.slice(5)) - 1]}`}
        >
          <p className="num text-[22px] leading-none font-medium">
            {formatEur(paid)}
          </p>
          <p className="mt-auto pt-3 text-[12px] text-muted">
            {paidBefore === 0 && paid === 0
              ? "Sin cobros este mes ni el anterior"
              : `${delta >= 0 ? "+" : "−"}${formatEur(Math.abs(delta))} frente a ${MONTHS[Number(lastMonth.slice(5)) - 1]}`}
          </p>
        </Tile>
        <Tile href="/clientes" label="Pipeline abierto">
          <p className="num text-[22px] leading-none font-medium">
            {formatEur(pipeline, { round: true })}
          </p>
          <p className="mt-auto pt-3 text-[12px] text-muted">
            {stages
              .filter((s) => s.stage !== "ganado")
              .reduce((n, s) => n + s.count, 0)}{" "}
            clientes de Respondió a Negociación
          </p>
        </Tile>
        <Tile href="/horas?persona=equipo" label="Horas del equipo">
          <p className="num text-[22px] leading-none font-medium">
            {formatHours(teamDone).replace(" h", "")}
            <span className="text-[14px] text-muted">
              {" "}
              / {formatHours(teamGoal)}
            </span>
          </p>
          <p className="mt-auto pt-3 text-[12px] text-muted">
            Esta semana, los tres juntos
          </p>
        </Tile>
        <Tile href="/leinn/obvs" label="OBVs por redactar">
          <p className="num text-[22px] leading-none font-medium">
            {pendingObvs.length}
          </p>
          <p
            className={cx(
              "mt-auto pt-3 text-[12px]",
              lateObvs ? "text-accent-text" : "text-muted",
            )}
          >
            {lateObvs
              ? `${lateObvs} fuera de plazo`
              : pendingObvs.length
                ? "Dentro de los 3 días"
                : "Todo redactado"}
          </p>
        </Tile>
      </section>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 px-4 py-6 md:px-6 lg:grid-cols-2 [&>section]:min-w-0">
        {/* Horas por persona */}
        <section aria-labelledby="eq-horas">
          <SectionHeading
            id="eq-horas"
            title="Horas por persona"
            action={<More href="/horas?persona=equipo">Horas</More>}
          />
          <ul className="border-t border-line">
            {members.map((m) => {
              const done = byMember.get(m.id) ?? 0;
              const goal = m.weekly_hours_goal * 60;
              const expected = expectedMinutes(
                m.weekly_hours_goal,
                week,
                today,
              );
              const behind = paceOf(done, expected) === "por_detras";
              return (
                <li key={m.id} className="border-b border-line py-2.5">
                  <Link
                    href={`/horas?persona=${m.id}`}
                    className="group flex flex-col gap-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <Avatar person={m} size="xs" />
                      <span className="text-[13px] group-hover:underline">
                        {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
                      </span>
                      {behind ? (
                        <span className="text-[12px] text-accent-text">
                          · {formatHours(expected - done)} por detrás
                        </span>
                      ) : null}
                      <span className="num ml-auto text-[12px]">
                        {formatHours(done).replace(" h", "")}
                        <span className="text-muted">
                          {" "}
                          / {formatHours(goal)}
                        </span>
                      </span>
                    </span>
                    <HoursMeter
                      done={done}
                      goal={goal}
                      expected={expected}
                      behind={behind}
                      label={`${m.short_name}: ${formatHours(done)} de ${formatHours(goal)}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Pipeline por etapa */}
        <section aria-labelledby="eq-pipeline">
          <SectionHeading
            id="eq-pipeline"
            title="Pipeline por etapa"
            action={<More href="/clientes">Pipeline</More>}
          />
          {stages.every((s) => s.count === 0) ? (
            <Empty compact title="Pipeline vacío">
              Cuando un lead responda, pásalo a Respondió desde Leads y ponle un
              valor estimado: aquí verás cuánto hay en cada etapa.
            </Empty>
          ) : (
            <>
              <table className="w-full border-t border-line text-[13px]">
                <caption className="sr-only">
                  Valor estimado y número de clientes en cada etapa del pipeline
                </caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Etapa</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s) => (
                    <tr key={s.stage} className="group border-b border-line">
                      <th
                        scope="row"
                        className="w-[136px] py-2 pr-3 text-left font-normal"
                      >
                        <Link href="/clientes" className="hover:underline">
                          {STAGE_LABELS[s.stage]}
                        </Link>
                      </th>
                      <td
                        className="py-2"
                        title={`${STAGE_LABELS[s.stage]}: ${formatEur(s.value)} · ${s.count} clientes`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="relative block h-2 min-w-0 flex-1"
                            aria-hidden
                          >
                            {s.value > 0 ? (
                              <span
                                className={cx(
                                  "absolute inset-y-0 left-0 rounded-r-[4px] transition-opacity duration-150",
                                  s.stage === "ganado"
                                    ? "bg-positive"
                                    : "bg-text/75 group-hover:bg-text",
                                )}
                                style={{
                                  width: `max(2px, ${(s.value / maxStage) * 100}%)`,
                                }}
                              />
                            ) : (
                              <span className="absolute inset-y-[3px] left-0 w-full border-t border-dashed border-line-strong" />
                            )}
                          </span>
                          <span className="num w-[92px] shrink-0 text-right">
                            {formatEur(s.value, { round: true })}
                          </span>
                        </span>
                      </td>
                      <td className="num w-12 py-2 text-right text-[12px] text-muted">
                        {s.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[12px] text-muted">
                Valor estimado de cada cliente; Ganado en verde.
                {noValue
                  ? ` ${noValue} ${noValue === 1 ? "cliente abierto no tiene" : "clientes abiertos no tienen"} valor puesto.`
                  : ""}
              </p>
            </>
          )}
        </section>

        {/* Entregas */}
        <section aria-labelledby="eq-entregas">
          <SectionHeading
            id="eq-entregas"
            title="Entregas de los próximos 14 días"
            count={deliveries.length}
          />
          {deliveries.length === 0 ? (
            <Empty compact title="Nada que entregar">
              Ni LPs con fecha en las dos próximas semanas ni OBVs por redactar.
            </Empty>
          ) : (
            <ul className="border-t border-line">
              {deliveries.map((d) => (
                <li key={d.key} className="border-b border-line">
                  <Link
                    href={d.href}
                    className="flex min-h-10 items-center gap-3 py-2 hover:bg-surface-hover"
                  >
                    <span className="num w-14 shrink-0 text-[12px] text-muted">
                      {formatDayMonth(d.date)}
                    </span>
                    <span className="num w-14 shrink-0 text-[12px] text-muted">
                      {d.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {d.title}
                    </span>
                    {d.chip ? (
                      <Chip tone={d.late ? "accent" : "neutral"}>{d.chip}</Chip>
                    ) : null}
                    {d.owner ? <Avatar person={d.owner} size="xs" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Objetivos */}
        <section aria-labelledby="eq-objetivos">
          <SectionHeading
            id="eq-objetivos"
            title="Objetivos de la semana"
            action={<More href="/objetivos">Objetivos</More>}
          />
          {visibleGoals.length === 0 ? (
            <Empty compact title="Sin objetivos esta semana">
              Ponedlos el lunes en Objetivos: qué tiene que estar hecho el
              viernes y quién se encarga.
            </Empty>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3">
                <div
                  role="meter"
                  aria-label="Objetivos hechos"
                  aria-valuemin={0}
                  aria-valuemax={goalStats.total}
                  aria-valuenow={goalStats.done}
                  className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-text"
                    style={{
                      width: `${goalStats.total ? (goalStats.done / goalStats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="num text-[12px]">
                  {goalStats.done}
                  <span className="text-muted">
                    {" "}
                    / {goalStats.total} hechos
                  </span>
                </span>
              </div>
              <ul className="border-t border-line">
                {visibleGoals.map((g) => {
                  const owners = g.owners
                    .map((o) => membersById.get(o.member_id))
                    .filter((m) => m !== undefined);
                  const done = g.status === "hecho";
                  return (
                    <li
                      key={g.id}
                      className="flex min-h-10 items-center gap-3 border-b border-line py-2"
                    >
                      <span
                        className={cx(
                          "min-w-0 flex-1 truncate text-[13px]",
                          done &&
                            "text-muted line-through decoration-line-strong",
                        )}
                      >
                        {g.title}
                      </span>
                      {g.status === "en_curso" ? (
                        <Chip>En curso</Chip>
                      ) : done ? (
                        <Chip tone="positive">Hecho</Chip>
                      ) : null}
                      {owners.length ? <AvatarStack people={owners} /> : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
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

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text"
    >
      {children} <ArrowRight className="size-3" aria-hidden />
    </Link>
  );
}
