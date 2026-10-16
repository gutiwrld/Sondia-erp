"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { Plus, Upload } from "lucide-react";
import { AvatarStack, Button, ButtonLink, Chip, cx } from "@/components/ui";
import { SidePanel } from "@/components/app/side-panel";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { ClientListItem } from "@/lib/data/clients";
import type { ClientStage } from "@/lib/clients-import";
import { PIPELINE_STAGES, isActionOverdue, openPipelineValue, stageTotals } from "@/lib/clients";
import { STAGE_LABELS } from "@/lib/labels";
import { formatEur, formatRelativeDay, formatShortDate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { ClientForm, EMPTY_CLIENT } from "./client-form";
import { setClientStage } from "./actions";

export function PipelineBoard({
  me,
  members,
  clients,
  onlyMine,
  today,
}: {
  me: Member;
  members: Member[];
  clients: ClientListItem[];
  onlyMine: boolean;
  today: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [over, setOver] = useState<ClientStage | null>(null);
  const [creating, setCreating] = useState(false);
  const [optimistic, move] = useOptimistic(clients, (state, m: { id: string; stage: ClientStage }) =>
    state.map((c) => (c.id === m.id ? { ...c, stage: m.stage } : c)),
  );
  const totals = stageTotals(optimistic);
  const byId = new Map(optimistic.map((c) => [c.id, c]));
  const membersById = new Map(members.map((m) => [m.id, m]));

  function drop(e: DragEvent, stage: ClientStage) {
    e.preventDefault();
    setOver(null);
    const client = byId.get(e.dataTransfer.getData("text/plain"));
    if (!client || client.stage === stage) return;
    startTransition(async () => {
      move({ id: client.id, stage });
      const result = await setClientStage(client.id, stage);
      toast.show(result.ok ? `${client.name}: ${result.message.toLowerCase()}` : result.error, {
        tone: result.ok ? "neutral" : "danger",
      });
    });
  }

  return (
    <>
      <header className="border-b border-line">
        <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Pipeline</h1>
            <span className="text-[12px] text-muted">
              Abierto <span className="num text-text">{formatEur(openPipelineValue(optimistic), { round: true })}</span> ·{" "}
              <span className="num">{optimistic.filter((c) => c.stage !== "ganado").length}</span> en curso
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Responsable" className="flex rounded-sm border border-line bg-surface p-0.5">
              {[
                { label: "Equipo", mine: false },
                { label: "Míos", mine: true },
              ].map((t) => (
                <Link
                  key={t.label}
                  href={t.mine ? "/clientes?persona=yo" : "/clientes"}
                  aria-current={onlyMine === t.mine ? "true" : undefined}
                  className={cx(
                    "flex h-7 items-center rounded-xs px-2.5 text-[12px] max-md:h-9",
                    onlyMine === t.mine ? "bg-surface-hover font-medium text-text" : "text-muted hover:text-text",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <ButtonLink href="/clientes/importar" variant="ghost">
              <Upload className="size-3.5" aria-hidden />
              <span className="max-sm:sr-only">Importar</span>
            </ButtonLink>
            <Button variant="strong" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden /> <span>Nuevo<span className="max-sm:hidden"> cliente</span></span>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 px-4 py-5 sm:grid-cols-2 md:px-6 lg:grid-cols-3 xl:grid-cols-6">
        {PIPELINE_STAGES.map((stage) => {
          const column = optimistic
            .filter((c) => c.stage === stage)
            .sort((a, b) => (a.next_action_date ?? "9999").localeCompare(b.next_action_date ?? "9999"));
          return (
            <section
              key={stage}
              aria-labelledby={`etapa-${stage}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver((s) => (s === stage ? null : s))}
              onDrop={(e) => drop(e, stage)}
              className={cx(
                "flex min-w-0 flex-col gap-2 rounded-md border border-line bg-surface-sunken p-2 transition-colors duration-150 xl:min-h-[420px]",
                over === stage && "border-line-strong bg-surface-hover",
              )}
            >
              <div className="px-1 pt-0.5">
                <div className="flex items-baseline gap-2">
                  <h2 id={`etapa-${stage}`} className="truncate text-[13px] font-semibold">
                    {STAGE_LABELS[stage]}
                  </h2>
                  <span className="num text-[12px] text-muted">{totals[stage].count}</span>
                </div>
                <p className="num text-[12px] text-muted">{totals[stage].value ? formatEur(totals[stage].value, { round: true }) : "—"}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {column.map((c) => {
                  const owners = c.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[];
                  const overdue = isActionOverdue(c.next_action_date, today);
                  const near = c.next_action_date && c.next_action_date <= addDays(today, 1);
                  return (
                    <li
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab rounded-sm border border-line bg-surface active:cursor-grabbing"
                    >
                      <Link href={`/clientes/${c.id}`} className="flex flex-col gap-1.5 p-2.5" draggable={false}>
                        <span className="text-[13px] leading-snug font-medium">{c.name}</span>
                        {c.service || c.value_eur ? (
                          <span className="flex items-baseline justify-between gap-2 text-[12px] text-muted">
                            <span className="truncate">{c.service}</span>
                            {c.value_eur ? <span className="num shrink-0 text-text">{formatEur(Number(c.value_eur), { round: true })}</span> : null}
                          </span>
                        ) : null}
                        {c.next_action ? (
                          <span className="text-[12px] leading-snug text-muted">
                            {c.next_action_date ? (
                              <span className={cx("num", overdue ? "text-accent-text" : near ? "text-text" : "")}>
                                {overdue || near ? formatRelativeDay(c.next_action_date, today) : formatShortDate(c.next_action_date)}
                                {" · "}
                              </span>
                            ) : null}
                            {c.next_action}
                          </span>
                        ) : (
                          <Chip tone="accent" className="self-start">
                            Sin próxima acción
                          </Chip>
                        )}
                        {owners.length ? (
                          <span className="flex justify-end">
                            <AvatarStack people={owners} />
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {column.length === 0 ? <p className="px-1 py-1 text-[12px] text-muted">Nadie en esta etapa.</p> : null}
            </section>
          );
        })}
      </div>
      <p className="px-4 pb-6 text-[12px] text-muted md:px-6">
        Arrastra una tarjeta para cambiar de etapa, o ábrela para ver la ficha. Los leads y los contactados están en{" "}
        <Link href="/clientes/leads" className="text-text underline">
          Leads
        </Link>
        ; los perdidos, también ahí con su filtro.
      </p>

      <SidePanel open={creating} onClose={() => setCreating(false)} title="Nuevo cliente">
        <ClientForm
          initial={EMPTY_CLIENT}
          members={members}
          me={me}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      </SidePanel>
    </>
  );
}
