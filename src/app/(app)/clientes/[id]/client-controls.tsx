"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Ban, Pencil, Trash2 } from "lucide-react";
import { Button, Field, IconButton, Input, Select, cx, inputClass } from "@/components/ui";
import { SidePanel } from "@/components/app/side-panel";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { ClientDetail } from "@/lib/data/clients";
import { ALL_STAGES } from "@/lib/clients";
import { STAGE_LABELS } from "@/lib/labels";
import { addDays } from "@/lib/dates";
import { formatDayMonth, formatEur } from "@/lib/format";
import { ClientForm } from "../client-form";
import {
  addClientEvent,
  addPayment,
  deletePayment,
  markDoNotContact,
  setClientStage,
  setNextAction,
  unmarkDoNotContact,
} from "../actions";

export function StageSelect({ id, stage, locked }: { id: string; stage: string; locked: boolean }) {
  const toast = useToast();
  const [optimistic, setOptimistic] = useOptimistic(stage);
  const [, startTransition] = useTransition();
  return (
    <Select
      aria-label="Etapa"
      value={optimistic}
      disabled={locked}
      title={locked ? "Marcado como «No contactar»: quita antes la marca para cambiar la etapa" : undefined}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          setOptimistic(next);
          const result = await setClientStage(id, next);
          toast.show(result.ok ? result.message : result.error, { tone: result.ok ? "neutral" : "danger" });
        });
      }}
      className="h-8 w-auto max-w-[200px] font-medium max-md:h-10"
    >
      {ALL_STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}

export function EditClientButton({ client, members, me }: { client: ClientDetail; members: Member[]; me: Member }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" aria-hidden /> Editar datos
      </Button>
      <SidePanel open={open} onClose={() => setOpen(false)} title="Editar cliente">
        <ClientForm
          initial={{
            id: client.id,
            name: client.name,
            sector: client.sector,
            city: client.city,
            province: client.province,
            website: client.website,
            email: client.email,
            phone: client.phone,
            contact_name: client.contact_name,
            service: client.service,
            value_eur: client.value_eur,
            pricing: client.pricing,
            next_action: client.next_action,
            next_action_date: client.next_action_date,
            notes: client.notes,
            lost_reason: client.lost_reason,
            owners: client.owners.map((o) => o.member_id),
          }}
          members={members}
          me={me}
          onCancel={() => setOpen(false)}
          onDone={() => setOpen(false)}
        />
      </SidePanel>
    </>
  );
}

export function NextActionForm({ id, text, date, today }: { id: string; text: string; date: string | null; today: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState(date ?? "");
  const overdue = Boolean(date && date < today);
  return (
    <form
      aria-label="Próxima acción"
      action={(fd) => {
        fd.set("next_action_date", d);
        startTransition(async () => {
          const r = await setNextAction(id, fd);
          toast.show(r.ok ? r.message : r.error, { tone: r.ok ? "neutral" : "danger" });
        });
      }}
      className={cx("flex flex-col gap-2 rounded-md border p-3", overdue ? "border-accent/50 bg-accent-soft" : !text ? "border-dashed border-line-strong" : "border-line")}
    >
      <label htmlFor="next-text" className="sr-only">
        Qué hay que hacer
      </label>
      <Input id="next-text" name="next_action" defaultValue={text} placeholder="Qué es lo siguiente con este cliente" maxLength={300} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="next-date" className="sr-only">
          Fecha
        </label>
        <input id="next-date" type="date" value={d} onChange={(e) => setD(e.target.value)} className={cx(inputClass, "num w-[150px]")} />
        {[
          ["Hoy", today],
          ["Mañana", addDays(today, 1)],
          ["En 1 semana", addDays(today, 7)],
        ].map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setD(value)}
            aria-pressed={d === value}
            className={cx(
              "h-7 rounded-sm border px-2 text-[12px] max-md:h-9",
              d === value ? "border-text text-text" : "border-line text-muted hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
        <Button type="submit" variant="strong" size="sm" disabled={pending} className="ml-auto">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {overdue ? <p className="text-[12px] text-accent-text">Vencida el {formatDayMonth(date!)}. Haz la acción o pon una fecha nueva.</p> : null}
      {!text ? <p className="text-[12px] text-muted">Sin próxima acción, este cliente no aparecerá en Mi espacio.</p> : null}
    </form>
  );
}

const EVENT_OPTIONS = [
  ["nota", "Nota"],
  ["llamada", "Llamada"],
  ["email", "Email"],
  ["reunion", "Reunión"],
  ["maqueta", "Maqueta enviada"],
  ["propuesta", "Propuesta enviada"],
] as const;

export function EventComposer({ id, today }: { id: string; today: string }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      ref={formRef}
      aria-label="Añadir al historial"
      action={(fd) =>
        startTransition(async () => {
          const r = await addClientEvent(id, fd);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setError(null);
          formRef.current?.reset();
          toast.show(r.message);
        })
      }
      className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3"
    >
      <label htmlFor="event-body" className="sr-only">
        Qué ha pasado
      </label>
      <textarea
        id="event-body"
        name="body"
        rows={2}
        maxLength={5000}
        placeholder="Qué ha pasado: llamada, respuesta, acuerdo…"
        className={cx(inputClass, "h-auto min-h-16 resize-y py-2 leading-relaxed")}
        aria-invalid={Boolean(error)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select name="type" aria-label="Tipo" defaultValue="nota" className="h-8 max-w-[170px] max-md:h-10">
          {EVENT_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <input type="date" name="date" aria-label="Fecha" defaultValue={today} max={today} className={cx(inputClass, "num w-[150px]")} />
        <Button type="submit" size="sm" disabled={pending} className="ml-auto">
          {pending ? "Añadiendo…" : "Añadir"}
        </Button>
      </div>
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function PaymentForm({ id, today }: { id: string; today: string }) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Registrar cobro
      </Button>
    );
  }
  return (
    <form
      ref={formRef}
      aria-label="Registrar cobro"
      action={(fd) =>
        startTransition(async () => {
          const r = await addPayment(id, fd);
          if (!r.ok) {
            setError({ message: r.error, field: r.field });
            return;
          }
          toast.show(r.message);
          setError(null);
          setOpen(false);
        })
      }
      className="grid gap-3 rounded-md border border-line bg-surface p-3 sm:grid-cols-[110px_150px_1fr]"
    >
      <Field label="Importe (€)" htmlFor="pay-amount" error={error?.field === "amount" ? error.message : undefined}>
        <Input id="pay-amount" name="amount" inputMode="decimal" className="num" placeholder="175,45" autoFocus required />
      </Field>
      <Field label="Fecha" htmlFor="pay-date" error={error?.field === "paid_on" ? error.message : undefined}>
        <input id="pay-date" type="date" name="paid_on" defaultValue={today} max={today} required className={cx(inputClass, "num")} />
      </Field>
      <Field label="Concepto" htmlFor="pay-concept">
        <Input id="pay-concept" name="concept" placeholder="Pago final de la web" />
      </Field>
      <Field label="Nº de factura" htmlFor="pay-invoice" className="sm:col-span-2">
        <Input id="pay-invoice" name="invoice_ref" placeholder="F260046" />
      </Field>
      <div className="flex items-end justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="strong" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cobro"}
        </Button>
      </div>
      {error && !error.field ? (
        <p className="text-[12px] text-danger sm:col-span-3" role="alert">
          {error.message}
        </p>
      ) : null}
    </form>
  );
}

export function PaymentRow({
  payment,
}: {
  payment: { id: string; amount_eur: number; paid_on: string; concept: string; invoice_ref: string | null };
}) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <li className={cx("group flex min-h-10 items-center gap-3 border-b border-line py-1.5 text-[13px]", pending && "opacity-50")}>
      <span className="num w-[56px] shrink-0 text-[12px] text-muted">{formatDayMonth(payment.paid_on)}</span>
      <span className="min-w-0 flex-1 truncate">
        {payment.concept || "Cobro"}
        {payment.invoice_ref ? <span className="num text-[12px] text-muted"> · {payment.invoice_ref}</span> : null}
      </span>
      <span className="num shrink-0 font-medium">{formatEur(payment.amount_eur)}</span>
      <IconButton
        label={confirm ? "Pulsa otra vez para borrar el cobro" : "Borrar cobro"}
        onBlur={() => setConfirm(false)}
        onClick={() => {
          if (!confirm) return setConfirm(true);
          startTransition(async () => {
            const r = await deletePayment(payment.id);
            toast.show(r.ok ? r.message : r.error, { tone: r.ok ? "neutral" : "danger" });
          });
        }}
        className={cx(confirm ? "bg-danger-soft text-danger" : "hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100")}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </IconButton>
    </li>
  );
}

/**
 * Marcar o quitar «No contactar». Marcar pide un motivo y pasa el cliente a
 * Perdido; quitar la marca exige confirmarlo y queda en el historial.
 */
export function DoNotContactControl({
  id,
  marked,
  reason,
  since,
}: {
  id: string;
  marked: boolean;
  reason?: string;
  since?: string | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [why, setWhy] = useState("");

  if (marked) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-danger/40 bg-danger-soft px-4 py-3" role="status">
        <Ban className="size-4 shrink-0 text-danger" aria-hidden />
        <p className="min-w-0 flex-1 text-[13px]">
          <strong className="font-semibold">No contactar.</strong> {reason || "Dijo que no."}
          {since ? <span className="text-muted"> · desde el {formatDayMonth(since.slice(0, 10))}</span> : null}
          <span className="block text-[12px] text-muted">No se puede volver a mover a Contactado ni a ninguna etapa activa.</span>
        </p>
        {step === "confirm" ? (
          <span className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("idle")}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await unmarkDoNotContact(id);
                  toast.show(r.ok ? r.message : r.error, { tone: r.ok ? "neutral" : "danger" });
                  setStep("idle");
                })
              }
            >
              Sí, quitar la marca
            </Button>
          </span>
        ) : (
          <Button size="sm" onClick={() => setStep("confirm")}>
            Quitar la marca…
          </Button>
        )}
      </div>
    );
  }

  return step === "confirm" ? (
    <form
      aria-label="Marcar como No contactar"
      action={() =>
        startTransition(async () => {
          const r = await markDoNotContact(id, why);
          toast.show(r.ok ? r.message : r.error, { tone: r.ok ? "neutral" : "danger" });
          setStep("idle");
        })
      }
      className="flex flex-col gap-2 rounded-md border border-danger/40 p-3"
    >
      <Field label="¿Por qué? (lo verá el resto del equipo)" htmlFor="dnc-reason">
        <Input id="dnc-reason" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Contestó que no le interesa" autoFocus />
      </Field>
      <p className="text-[12px] text-muted">Pasará a Perdido y no se podrá volver a contactar sin quitar antes la marca.</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setStep("idle")}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" size="sm" disabled={pending} className="border border-danger/40">
          Marcar «No contactar»
        </Button>
      </div>
    </form>
  ) : (
    <button type="button" onClick={() => setStep("confirm")} className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-danger">
      <Ban className="size-3.5" aria-hidden /> Marcar como «No contactar»
    </button>
  );
}
