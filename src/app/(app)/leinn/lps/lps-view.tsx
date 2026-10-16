"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ExternalLink, Plus } from "lucide-react";
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
import type { Lp } from "@/lib/data/leinn";
import { LP_STATUS_LABELS } from "@/lib/labels";
import { isDueSoon } from "@/lib/obv";
import { formatRelativeDay, formatShortDate } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { deleteLp, saveLp, setLpStatus } from "../actions";

const STATUSES = Object.keys(LP_STATUS_LABELS) as Lp["status"][];
const isOpen = (s: Lp["status"]) => s === "idea" || s === "en_curso";

export function LpsView({
  me,
  members,
  lps,
  today,
  openLpId,
  openNew,
}: {
  me: Member;
  members: Member[];
  lps: Lp[];
  today: string;
  openLpId: string | null;
  openNew: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const [optimistic, applyStatus] = useOptimistic(
    lps,
    (state, c: { id: string; status: Lp["status"] }) =>
      state.map((lp) => (lp.id === c.id ? { ...lp, status: c.status } : lp)),
  );
  const [panel, setPanel] = useState<
    { mode: "new" } | { mode: "edit"; lp: Lp } | null
  >(() => {
    const lp = openLpId ? lps.find((x) => x.id === openLpId) : undefined;
    return lp ? { mode: "edit", lp } : openNew ? { mode: "new" } : null;
  });

  function close() {
    setPanel(null);
    if (searchParams.has("lp") || searchParams.has("nueva"))
      router.replace(pathname, { scroll: false });
  }

  function changeStatus(lp: Lp, status: Lp["status"]) {
    startTransition(async () => {
      applyStatus({ id: lp.id, status });
      const r = await setLpStatus(lp.id, status);
      if (!r.ok) toast.show(r.error, { tone: "danger" });
      else
        toast.show(
          `LP ${lp.number ?? ""} · ${LP_STATUS_LABELS[status].toLowerCase()}`.replace(
            "  ",
            " ",
          ),
        );
    });
  }

  const open = optimistic.filter((lp) => isOpen(lp.status));
  const closed = optimistic.filter((lp) => !isOpen(lp.status));

  return (
    <>
      <PageHeader
        title="Learning Paths"
        description={`${open.length} abiertas`}
        actions={
          <Button variant="strong" onClick={() => setPanel({ mode: "new" })}>
            <Plus className="size-4" aria-hidden />
            <span>
              Nueva<span className="max-sm:hidden"> LP</span>
            </span>
          </Button>
        }
      />
      <div className="flex max-w-[1080px] flex-col gap-8 px-4 py-5 md:px-6">
        {optimistic.length === 0 ? (
          <Empty
            title="Todavía no hay LPs"
            action={
              <Button
                variant="strong"
                onClick={() => setPanel({ mode: "new" })}
              >
                <Plus className="size-4" aria-hidden /> Nueva LP
              </Button>
            }
          >
            Cada Learning Path es una pregunta que el equipo quiere responder.
            Apunta su número, quién la lleva, la fecha de entrega y quién la
            valida; las OBVs y las tareas se vinculan después.
          </Empty>
        ) : (
          <>
            <LpTable
              title="Abiertas"
              lps={open}
              today={today}
              membersById={membersById}
              onOpen={(lp) => setPanel({ mode: "edit", lp })}
              onStatus={changeStatus}
              empty="Ninguna LP abierta. Las entregadas y validadas están abajo."
            />
            {closed.length ? (
              <LpTable
                title="Entregadas y validadas"
                lps={closed}
                today={today}
                membersById={membersById}
                onOpen={(lp) => setPanel({ mode: "edit", lp })}
                onStatus={changeStatus}
              />
            ) : null}
          </>
        )}
      </div>

      <SidePanel
        open={panel !== null}
        onClose={close}
        title={panel?.mode === "edit" ? "Learning Path" : "Nueva LP"}
        width={480}
      >
        {panel ? (
          <LpForm
            key={panel.mode === "edit" ? panel.lp.id : "new"}
            lp={panel.mode === "edit" ? panel.lp : null}
            members={members}
            me={me}
            nextNumber={Math.max(0, ...lps.map((l) => l.number ?? 0)) + 1}
            today={today}
            onDone={close}
          />
        ) : null}
      </SidePanel>
    </>
  );
}

function DueCell({ lp, today }: { lp: Lp; today: string }) {
  if (!lp.due_date)
    return <span className="text-[12px] text-muted">Sin fecha</span>;
  if (!isOpen(lp.status))
    return (
      <span className="num text-[12px] text-muted">
        {formatShortDate(lp.due_date)}
      </span>
    );
  const late = lp.due_date < today;
  const soon = isDueSoon(lp.due_date, today);
  const near =
    lp.due_date >= addDays(today, -1) && lp.due_date <= addDays(today, 1);
  if (late || soon)
    return (
      <Chip tone="accent">
        {late || near
          ? formatRelativeDay(lp.due_date, today)
          : formatShortDate(lp.due_date)}
      </Chip>
    );
  return (
    <span className="num text-[12px]">{formatShortDate(lp.due_date)}</span>
  );
}

function LpTable({
  title,
  lps,
  today,
  membersById,
  onOpen,
  onStatus,
  empty,
}: {
  title: string;
  lps: Lp[];
  today: string;
  membersById: Map<string, Member>;
  onOpen: (lp: Lp) => void;
  onStatus: (lp: Lp, s: Lp["status"]) => void;
  empty?: string;
}) {
  const id = `lps-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <div className="flex h-8 items-center gap-2 border-b border-line">
        <h2 id={id} className="text-[13px] font-semibold">
          {title}
        </h2>
        <span className="num text-[12px] text-muted">{lps.length}</span>
      </div>
      {lps.length === 0 ? (
        <p className="py-3 text-[12px] text-muted">{empty}</p>
      ) : (
        <>
          <div
            aria-hidden
            className="grid h-8 grid-cols-[48px_minmax(0,1fr)_96px_132px_104px_88px] items-center gap-3 border-b border-line text-[11px] font-medium tracking-[0.04em] text-muted uppercase max-lg:hidden"
          >
            <span>Nº</span>
            <span>Pregunta</span>
            <span>Lleva</span>
            <span>Estado</span>
            <span>Entrega</span>
            <span className="text-right">OBVs · tareas</span>
          </div>
          <ul>
            {lps.map((lp) => {
              const owner = membersById.get(lp.owner_id);
              return (
                <li
                  key={lp.id}
                  className="grid min-h-12 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line py-2 lg:grid-cols-[48px_minmax(0,1fr)_96px_132px_104px_88px]"
                >
                  <span className="num text-[12px] text-muted">
                    {lp.number ? `LP ${lp.number}` : "LP"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(lp)}
                    className="min-w-0 text-left"
                  >
                    <span className="line-clamp-2 text-[13px] hover:underline lg:truncate">
                      {lp.title}
                    </span>
                    {lp.validators ? (
                      <span className="block truncate text-[12px] text-muted">
                        Valida: {lp.validators}
                      </span>
                    ) : null}
                  </button>
                  <span className="flex items-center gap-1.5 text-[12px] max-lg:hidden">
                    {owner ? (
                      <>
                        <Avatar person={owner} size="xs" />
                        {owner.short_name}
                      </>
                    ) : null}
                  </span>
                  <span className="max-lg:col-start-3 max-lg:row-start-1">
                    <Select
                      aria-label={`Estado de ${lp.number ? `LP ${lp.number}` : lp.title}`}
                      value={lp.status}
                      onChange={(e) =>
                        onStatus(lp, e.target.value as Lp["status"])
                      }
                      className="h-7 w-[124px] text-[12px] max-md:h-9"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {LP_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </span>
                  <span className="flex items-center gap-2 max-lg:col-start-2 max-lg:row-start-2">
                    <DueCell lp={lp} today={today} />
                    {owner ? (
                      <span className="text-[12px] text-muted lg:hidden">
                        · {owner.short_name}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-end gap-2 text-[12px] text-muted max-lg:col-start-3 max-lg:row-start-2">
                    <Link
                      href={`/leinn/obvs?lp=${lp.id}`}
                      className="num hover:text-text"
                      title="OBVs vinculadas"
                    >
                      {lp.obv_count}
                    </Link>
                    <span aria-hidden>·</span>
                    <span className="num" title="Tareas abiertas">
                      {lp.open_tasks}
                    </span>
                    {lp.doc_url ? (
                      <a
                        href={lp.doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-text"
                        aria-label="Abrir documento"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function LpForm({
  lp,
  members,
  me,
  nextNumber,
  today,
  onDone,
}: {
  lp: Lp | null;
  members: Member[];
  me: Member;
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
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await saveLp(lp?.id ?? null, fd);
          if (!r.ok) return setError({ message: r.error, field: r.field });
          toast.show(r.message);
          onDone();
        });
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <Field label="Número" htmlFor="lp-number" error={err("number")}>
          <Input
            id="lp-number"
            name="number"
            inputMode="numeric"
            defaultValue={lp ? (lp.number ?? "") : nextNumber}
            className="num"
          />
        </Field>
        <Field label="Lleva" htmlFor="lp-owner" error={err("owner_id")}>
          <Select
            id="lp-owner"
            name="owner_id"
            defaultValue={lp?.owner_id ?? me.id}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Pregunta" htmlFor="lp-title" error={err("title")}>
        <textarea
          id="lp-title"
          name="title"
          rows={2}
          required
          maxLength={300}
          autoFocus={!lp}
          defaultValue={lp?.title ?? ""}
          placeholder="¿Pagaría un restaurante por una web que se actualiza sola?"
          className={cx(inputClass, "h-auto py-2 leading-snug")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado" htmlFor="lp-status">
          <Select
            id="lp-status"
            name="status"
            defaultValue={lp?.status ?? "idea"}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LP_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Entrega" htmlFor="lp-due" error={err("due_date")}>
          <input
            id="lp-due"
            name="due_date"
            type="date"
            min={lp ? undefined : today}
            defaultValue={lp?.due_date ?? ""}
            className={cx(inputClass, "num")}
          />
        </Field>
      </div>
      <Field
        label="Validadores"
        htmlFor="lp-validators"
        hint="Quién tiene que dar la LP por buena: tutor, compañeros, cliente…"
      >
        <Input
          id="lp-validators"
          name="validators"
          defaultValue={lp?.validators ?? ""}
          maxLength={300}
        />
      </Field>
      <Field label="Documento" htmlFor="lp-doc" error={err("doc_url")}>
        <Input
          id="lp-doc"
          name="doc_url"
          type="url"
          inputMode="url"
          defaultValue={lp?.doc_url ?? ""}
          placeholder="https://docs.google.com/…"
        />
      </Field>
      <Field label="Notas" htmlFor="lp-notes">
        <textarea
          id="lp-notes"
          name="notes"
          rows={4}
          defaultValue={lp?.notes ?? ""}
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
          {lp ? "Guardar" : "Crear LP"}
        </Button>
        <Button onClick={onDone}>Cancelar</Button>
        {lp ? (
          <Button
            variant="danger"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              startTransition(async () => {
                const r = await deleteLp(lp.id);
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
      {lp && (lp.obv_count || lp.open_tasks) ? (
        <p className="text-[12px] text-muted">
          Tiene <span className="num">{lp.obv_count}</span> OBVs y{" "}
          <span className="num">{lp.open_tasks}</span> tareas abiertas
          vinculadas. Si la borras, se quedan sin LP.
        </p>
      ) : null}
    </form>
  );
}
