"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, cx, inputClass } from "@/components/ui";
import { OwnerPicker } from "@/components/app/owner-picker";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import { ALL_STAGES } from "@/lib/clients";
import { STAGE_LABELS } from "@/lib/labels";
import { createClientRecord, updateClientRecord } from "./actions";

export type ClientFormValues = {
  id?: string;
  name: string;
  sector: string;
  city: string;
  province: string;
  website: string;
  email: string;
  phone: string;
  contact_name: string;
  service: string;
  value_eur: number | string | null;
  pricing: string | null;
  next_action: string;
  next_action_date: string | null;
  notes: string;
  lost_reason: string;
  stage?: string;
  owners: string[];
};

/** Alta (sin `id`) y edición de los datos de un cliente. */
export function ClientForm({
  initial,
  members,
  me,
  onDone,
  onCancel,
}: {
  initial: ClientFormValues;
  members: Member[];
  me: Member;
  onDone?: (id: string) => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [owners, setOwners] = useState(initial.owners.length ? initial.owners : [me.id]);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const editing = Boolean(initial.id);
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <form
      aria-label={editing ? "Editar cliente" : "Nuevo cliente"}
      action={(fd) => {
        fd.delete("owners");
        for (const o of owners) fd.append("owners", o);
        fd.set("owners_present", "1");
        setError(null);
        startTransition(async () => {
          const result = editing ? await updateClientRecord(initial.id!, fd) : await createClientRecord(fd);
          if (!result.ok) {
            setError({ message: result.error, field: result.field });
            return;
          }
          toast.show(result.message);
          if (!editing && result.id) router.push(`/clientes/${result.id}`);
          onDone?.(result.id ?? initial.id!);
        });
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Nombre del negocio" htmlFor="cf-name" error={err("name")}>
        <Input id="cf-name" name="name" defaultValue={initial.name} required maxLength={200} autoFocus={!editing} aria-invalid={Boolean(err("name"))} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        {!editing ? (
          <Field label="Etapa" htmlFor="cf-stage">
            <Select id="cf-stage" name="stage" defaultValue={initial.stage ?? "lead"}>
              {ALL_STAGES.filter((s) => s !== "perdido").map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Sector" htmlFor="cf-sector">
          <Input id="cf-sector" name="sector" defaultValue={initial.sector} placeholder="Casa rural" />
        </Field>
        <Field label="Ciudad" htmlFor="cf-city">
          <Input id="cf-city" name="city" defaultValue={initial.city} />
        </Field>
        <Field label="Provincia" htmlFor="cf-province">
          <Input id="cf-province" name="province" defaultValue={initial.province} />
        </Field>
        <Field label="Persona de contacto" htmlFor="cf-contact">
          <Input id="cf-contact" name="contact_name" defaultValue={initial.contact_name} />
        </Field>
        <Field label="Email" htmlFor="cf-email" error={err("email")}>
          <Input id="cf-email" name="email" type="email" defaultValue={initial.email} aria-invalid={Boolean(err("email"))} />
        </Field>
        <Field label="Teléfono" htmlFor="cf-phone">
          <Input id="cf-phone" name="phone" type="tel" defaultValue={initial.phone} />
        </Field>
        <Field label="Web" htmlFor="cf-website">
          <Input id="cf-website" name="website" defaultValue={initial.website} placeholder="https://" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_120px_160px]">
        <Field label="Servicio" htmlFor="cf-service">
          <Input id="cf-service" name="service" defaultValue={initial.service} placeholder="Web completa" />
        </Field>
        <Field label="Valor (€)" htmlFor="cf-value" error={err("value_eur")}>
          <Input
            id="cf-value"
            name="value_eur"
            inputMode="decimal"
            className="num"
            defaultValue={initial.value_eur !== null && initial.value_eur !== "" ? String(initial.value_eur).replace(".", ",") : ""}
            placeholder="490"
            aria-invalid={Boolean(err("value_eur"))}
          />
        </Field>
        <Field label="Modelo" htmlFor="cf-pricing">
          <Select id="cf-pricing" name="pricing" defaultValue={initial.pricing ?? ""}>
            <option value="">Sin definir</option>
            <option value="fijo">Fijo</option>
            <option value="fijo_comision">Fijo + comisión</option>
            <option value="solo_comision">Solo comisión</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
        <Field label="Próxima acción" htmlFor="cf-next">
          <Input id="cf-next" name="next_action" defaultValue={initial.next_action} placeholder="Llamar para cerrar" />
        </Field>
        <Field label="Fecha" htmlFor="cf-next-date" error={err("next_action_date")}>
          <input id="cf-next-date" type="date" name="next_action_date" defaultValue={initial.next_action_date ?? ""} className={cx(inputClass, "num")} />
        </Field>
      </div>

      <OwnerPicker members={members} meId={me.id} value={owners} onChange={setOwners} />

      <Field label="Notas" htmlFor="cf-notes">
        <textarea
          id="cf-notes"
          name="notes"
          rows={4}
          defaultValue={initial.notes}
          className={cx(inputClass, "h-auto min-h-24 resize-y py-2 leading-relaxed")}
        />
      </Field>

      {editing ? (
        <Field label="Motivo de pérdida (si se perdió)" htmlFor="cf-lost">
          <Input id="cf-lost" name="lost_reason" defaultValue={initial.lost_reason} />
        </Field>
      ) : null}

      {error && !error.field ? (
        <p className="text-[12px] text-danger" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" variant="strong" disabled={pending} className="min-w-[110px]">
          {pending ? "Guardando…" : editing ? "Guardar" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}

export const EMPTY_CLIENT: ClientFormValues = {
  name: "",
  sector: "",
  city: "",
  province: "",
  website: "",
  email: "",
  phone: "",
  contact_name: "",
  service: "",
  value_eur: null,
  pricing: null,
  next_action: "",
  next_action_date: null,
  notes: "",
  lost_reason: "",
  stage: "respondio",
  owners: [],
};
