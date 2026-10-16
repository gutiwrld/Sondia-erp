"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ExternalLink, Plus, X } from "lucide-react";
import {
  Avatar,
  Button,
  Chip,
  Empty,
  Field,
  Input,
  PageHeader,
  Select,
  cx,
  inputClass,
} from "@/components/ui";
import { SidePanel } from "@/components/app/side-panel";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { Obv } from "@/lib/data/leinn";
import { OBV_TYPE_LABELS } from "@/lib/labels";
import { OBV_DEADLINE_DAYS, obvDeadlineLabel, obvStatus } from "@/lib/obv";
import { formatDayMonth, formatShortDate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { deleteObv, markObvWritten, saveObv } from "../actions";

type LpOption = { id: string; number: number | null; title: string };
const TYPES = Object.keys(OBV_TYPE_LABELS) as Obv["type"][];
const lpLabel = (lp: { number: number | null; title: string }) =>
  lp.number ? `LP ${lp.number}` : lp.title;
const obvName = (o: Obv) =>
  `OBV${o.number ? ` ${o.number}` : ""} · ${o.interviewee || o.company}`;

export function ObvsView({
  me,
  members,
  obvs,
  lps,
  clients,
  today,
  lpFilter,
  openObvId,
  openNew,
}: {
  me: Member;
  members: Member[];
  obvs: Obv[];
  lps: LpOption[];
  clients: { id: string; name: string }[];
  today: string;
  lpFilter: string | null;
  openObvId: string | null;
  openNew: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const [panel, setPanel] = useState<
    { mode: "new" } | { mode: "edit"; obv: Obv } | null
  >(() => {
    const o = openObvId ? obvs.find((x) => x.id === openObvId) : undefined;
    return o ? { mode: "edit", obv: o } : openNew ? { mode: "new" } : null;
  });

  function close() {
    setPanel(null);
    if (searchParams.has("obv") || searchParams.has("nueva")) {
      router.replace(lpFilter ? `${pathname}?lp=${lpFilter}` : pathname, {
        scroll: false,
      });
    }
  }

  function written(o: Obv) {
    startTransition(async () => {
      const r = await markObvWritten(o.id);
      toast.show(
        r.ok ? r.message : r.error,
        r.ok ? undefined : { tone: "danger" },
      );
    });
  }

  const rows = obvs
    .filter((o) => !lpFilter || o.learning_path?.id === lpFilter)
    .map((o) => ({
      ...o,
      status: obvStatus(o.meeting_date, o.written_date, today),
    }));
  const pendingRows = rows
    .filter((o) => !o.written_date)
    .sort((a, b) => a.status.daysLeft - b.status.daysLeft);
  const doneRows = rows.filter((o) => o.written_date);
  const late = pendingRows.filter(
    (o) => o.status.state === "fuera_de_plazo",
  ).length;
  const filterLp = lpFilter ? lps.find((l) => l.id === lpFilter) : null;

  return (
    <>
      <PageHeader
        title="OBVs"
        description={`Se redactan como mucho ${OBV_DEADLINE_DAYS} días después de la reunión`}
        actions={
          <Button variant="strong" onClick={() => setPanel({ mode: "new" })}>
            <Plus className="size-4" aria-hidden />
            <span>
              Nueva<span className="max-sm:hidden"> OBV</span>
            </span>
          </Button>
        }
      >
        {filterLp ? (
          <div className="flex items-center gap-2 px-4 pb-2.5 md:px-6">
            <span className="text-[12px] text-muted">Vinculadas a</span>
            <Link
              href={pathname}
              className="inline-flex h-7 items-center gap-1 rounded-sm border border-line px-2 text-[12px] hover:border-line-strong max-md:h-9"
            >
              {lpLabel(filterLp)}{" "}
              <X className="size-3.5 text-muted" aria-label="Quitar filtro" />
            </Link>
          </div>
        ) : null}
      </PageHeader>

      <div className="flex max-w-[1080px] flex-col gap-8 px-4 py-5 md:px-6">
        {obvs.length === 0 ? (
          <Empty
            title="Todavía no hay OBVs"
            action={
              <Button
                variant="strong"
                onClick={() => setPanel({ mode: "new" })}
              >
                <Plus className="size-4" aria-hidden /> Nueva OBV
              </Button>
            }
          >
            Apunta cada reunión con un cliente o entrevistado el mismo día.
            Desde la fecha de la reunión tienes {OBV_DEADLINE_DAYS} días
            naturales para redactarla; aquí verás cuántos te quedan.
          </Empty>
        ) : (
          <>
            <section aria-labelledby="por-redactar">
              <div className="flex h-8 items-center gap-2 border-b border-line">
                <h2 id="por-redactar" className="text-[13px] font-semibold">
                  Por redactar
                </h2>
                <span className="num text-[12px] text-muted">
                  {pendingRows.length}
                </span>
                {late ? (
                  <span className="text-[12px] text-accent-text">
                    · {late} fuera de plazo
                  </span>
                ) : null}
              </div>
              {pendingRows.length === 0 ? (
                <p className="py-3 text-[12px] text-muted">
                  Todas redactadas. Buen trabajo.
                </p>
              ) : (
                <ul>
                  {pendingRows.map((o) => {
                    const owner = membersById.get(o.owner_id);
                    const overdue = o.status.state === "fuera_de_plazo";
                    return (
                      <li
                        key={o.id}
                        className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-2"
                      >
                        {owner ? <Avatar person={owner} size="sm" /> : null}
                        <button
                          type="button"
                          onClick={() => setPanel({ mode: "edit", obv: o })}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-[13px] hover:underline">
                            {obvName(o)}
                          </span>
                          <span className="block truncate text-[12px] text-muted">
                            {[
                              OBV_TYPE_LABELS[o.type],
                              `reunión el ${formatDayMonth(o.meeting_date)}`,
                              `plazo ${formatDayMonth(o.status.deadline)}`,
                              o.learning_path ? lpLabel(o.learning_path) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                        <span className="flex items-center gap-2 max-sm:w-full max-sm:pl-9">
                          <Chip tone={overdue ? "accent" : "neutral"}>
                            {obvDeadlineLabel(o.status)}
                          </Chip>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => written(o)}
                            className="max-md:h-9"
                          >
                            <Check className="size-3.5" aria-hidden /> Redactada
                            hoy
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="redactadas">
              <div className="flex h-8 items-center gap-2 border-b border-line">
                <h2 id="redactadas" className="text-[13px] font-semibold">
                  Redactadas
                </h2>
                <span className="num text-[12px] text-muted">
                  {doneRows.length}
                </span>
              </div>
              {doneRows.length === 0 ? (
                <p className="py-3 text-[12px] text-muted">Ninguna todavía.</p>
              ) : (
                <>
                  <div
                    aria-hidden
                    className="grid h-8 grid-cols-[minmax(0,1fr)_112px_120px_96px_96px_20px] items-center gap-3 border-b border-line text-[11px] font-medium tracking-[0.04em] text-muted uppercase max-lg:hidden"
                  >
                    <span>OBV</span>
                    <span>Tipo</span>
                    <span>LP</span>
                    <span>Reunión</span>
                    <span>Redactada</span>
                    <span />
                  </div>
                  <ul>
                    {doneRows.map((o) => (
                      <li
                        key={o.id}
                        className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line py-2 lg:grid-cols-[minmax(0,1fr)_112px_120px_96px_96px_20px]"
                      >
                        <button
                          type="button"
                          onClick={() => setPanel({ mode: "edit", obv: o })}
                          className="min-w-0 text-left"
                        >
                          <span className="block truncate text-[13px] hover:underline">
                            {obvName(o)}
                          </span>
                          <span className="block truncate text-[12px] text-muted lg:hidden">
                            {OBV_TYPE_LABELS[o.type]} · reunión el{" "}
                            {formatDayMonth(o.meeting_date)}
                          </span>
                          {o.client ? (
                            <span className="block truncate text-[12px] text-muted max-lg:hidden">
                              {o.client.name}
                            </span>
                          ) : null}
                        </button>
                        <span className="text-[12px] max-lg:hidden">
                          {OBV_TYPE_LABELS[o.type]}
                        </span>
                        <span className="truncate text-[12px] text-muted max-lg:hidden">
                          {o.learning_path ? lpLabel(o.learning_path) : "—"}
                        </span>
                        <span className="num text-[12px] text-muted max-lg:hidden">
                          {formatShortDate(o.meeting_date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {o.status.state === "redactada_tarde" ? (
                            <Chip>tarde</Chip>
                          ) : (
                            <span className="text-[12px] text-muted lg:hidden">
                              a tiempo
                            </span>
                          )}
                          <span className="num text-[12px] max-lg:hidden">
                            {formatShortDate(o.written_date!)}
                          </span>
                        </span>
                        <span className="max-lg:hidden">
                          {o.doc_url ? (
                            <a
                              href={o.doc_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted hover:text-text"
                              aria-label="Abrir documento"
                            >
                              <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <SidePanel
        open={panel !== null}
        onClose={close}
        title={panel?.mode === "edit" ? "OBV" : "Nueva OBV"}
        width={480}
      >
        {panel ? (
          <ObvForm
            key={panel.mode === "edit" ? panel.obv.id : "new"}
            obv={panel.mode === "edit" ? panel.obv : null}
            members={members}
            me={me}
            lps={lps}
            clients={clients}
            defaultLp={lpFilter}
            nextNumber={Math.max(0, ...obvs.map((o) => o.number ?? 0)) + 1}
            today={today}
            onDone={close}
          />
        ) : null}
      </SidePanel>
    </>
  );
}

function ObvForm({
  obv,
  members,
  me,
  lps,
  clients,
  defaultLp,
  nextNumber,
  today,
  onDone,
}: {
  obv: Obv | null;
  members: Member[];
  me: Member;
  lps: LpOption[];
  clients: { id: string; name: string }[];
  defaultLp: string | null;
  nextNumber: number;
  today: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{
    message: string;
    field?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [meeting, setMeeting] = useState(obv?.meeting_date ?? today);
  const [writtenDate, setWrittenDate] = useState(obv?.written_date ?? "");
  const err = (f: string) => (error?.field === f ? error.message : undefined);
  const preview = meeting
    ? obvStatus(meeting, writtenDate || null, today)
    : null;
  // El cliente vinculado puede haber vuelto a Lead; lo mantenemos en la lista.
  const clientOptions =
    obv?.client && !clients.some((c) => c.id === obv.client!.id)
      ? [obv.client, ...clients]
      : clients;

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await saveObv(obv?.id ?? null, fd);
          if (!r.ok) return setError({ message: r.error, field: r.field });
          toast.show(r.message);
          onDone();
        });
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <Field label="Número" htmlFor="obv-number" error={err("number")}>
          <Input
            id="obv-number"
            name="number"
            inputMode="numeric"
            defaultValue={obv ? (obv.number ?? "") : nextNumber}
            className="num"
          />
        </Field>
        <Field label="Tipo" htmlFor="obv-type" error={err("type")}>
          <Select
            id="obv-type"
            name="type"
            defaultValue={obv?.type ?? "validacion"}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {OBV_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Entrevistado"
          htmlFor="obv-interviewee"
          error={err("interviewee")}
        >
          <Input
            id="obv-interviewee"
            name="interviewee"
            defaultValue={obv?.interviewee ?? ""}
            maxLength={300}
            autoFocus={!obv}
          />
        </Field>
        <Field label="Empresa" htmlFor="obv-company">
          <Input
            id="obv-company"
            name="company"
            defaultValue={obv?.company ?? ""}
            maxLength={300}
          />
        </Field>
      </div>
      <Field label="Redacta" htmlFor="obv-owner" error={err("owner_id")}>
        <Select
          id="obv-owner"
          name="owner_id"
          defaultValue={obv?.owner_id ?? me.id}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Reunión"
            htmlFor="obv-meeting"
            error={err("meeting_date")}
          >
            <input
              id="obv-meeting"
              name="meeting_date"
              type="date"
              required
              max={today}
              value={meeting}
              onChange={(e) => setMeeting(e.target.value)}
              className={cx(inputClass, "num")}
            />
          </Field>
          <Field
            label="Redactada"
            htmlFor="obv-written"
            error={err("written_date")}
          >
            <input
              id="obv-written"
              name="written_date"
              type="date"
              min={meeting || undefined}
              max={today}
              value={writtenDate}
              onChange={(e) => setWrittenDate(e.target.value)}
              className={cx(inputClass, "num")}
            />
          </Field>
        </div>
        {preview ? (
          <p
            className={cx(
              "mt-1.5 text-[12px]",
              preview.state === "fuera_de_plazo"
                ? "text-accent-text"
                : "text-muted",
            )}
          >
            Plazo hasta el {formatDayMonth(addDays(meeting, OBV_DEADLINE_DAYS))}{" "}
            · {obvDeadlineLabel(preview)}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Cliente"
          htmlFor="obv-client"
          hint="Desde Respondió en adelante."
        >
          <Select
            id="obv-client"
            name="client_id"
            defaultValue={obv?.client?.id ?? ""}
          >
            <option value="">Sin cliente</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Learning Path" htmlFor="obv-lp">
          <Select
            id="obv-lp"
            name="learning_path_id"
            defaultValue={obv?.learning_path?.id ?? defaultLp ?? ""}
          >
            <option value="">Sin LP</option>
            {lps.map((l) => (
              <option key={l.id} value={l.id}>
                {lpLabel(l)}
                {l.number ? ` · ${l.title}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Documento" htmlFor="obv-doc" error={err("doc_url")}>
        <Input
          id="obv-doc"
          name="doc_url"
          type="url"
          inputMode="url"
          defaultValue={obv?.doc_url ?? ""}
          placeholder="https://docs.google.com/…"
        />
      </Field>
      <Field label="Notas" htmlFor="obv-notes">
        <textarea
          id="obv-notes"
          name="notes"
          rows={4}
          defaultValue={obv?.notes ?? ""}
          className={cx(inputClass, "h-auto py-2")}
        />
      </Field>

      {error && !error.field ? (
        <p role="alert" className="text-[12px] text-danger">
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-t border-line pt-4">
        <Button type="submit" variant="strong" disabled={pending}>
          {obv ? "Guardar" : "Crear OBV"}
        </Button>
        <Button onClick={onDone}>Cancelar</Button>
        {obv ? (
          <Button
            variant="danger"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              startTransition(async () => {
                const r = await deleteObv(obv.id);
                if (!r.ok) return toast.show(r.error, { tone: "danger" });
                toast.show(r.message);
                onDone();
              });
            }}
          >
            {confirmDelete ? "¿Seguro? Borrar" : "Borrar"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
