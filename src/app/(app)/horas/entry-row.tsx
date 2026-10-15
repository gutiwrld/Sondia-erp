"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Timer, Trash2 } from "lucide-react";
import { Avatar, Chip, IconButton, cx, type Person } from "@/components/ui";
import { EntryForm } from "@/components/app/entry-form";
import { useToast } from "@/components/app/toast";
import { deleteEntry } from "./actions";
import { durationInput } from "@/lib/duration";
import { formatClock, formatTime } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/hours";
import type { LinkOption, TimeEntry } from "@/lib/data/hours";

export function EntryRow({
  entry,
  person,
  editable,
  today,
  linkOptions,
}: {
  entry: TimeEntry;
  person: Person | null;
  editable: boolean;
  today: string;
  linkOptions: LinkOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const linkLabel = entry.client?.name ?? entry.task?.title ?? null;

  if (editing) {
    return (
      <li className="border-b border-line py-3">
        <EntryForm
          today={today}
          linkOptions={linkOptions}
          layout="inline"
          editingId={entry.id}
          showTimerButton={false}
          autoFocus
          defaults={{
            duration: durationInput(entry.minutes),
            category: entry.category,
            date: entry.date,
            link: entry.client ? `c:${entry.client.id}` : entry.task ? `t:${entry.task.id}` : "",
            note: entry.note,
          }}
          onDone={() => {
            setEditing(false);
            toast.show("Cambios guardados");
          }}
        />
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-[12px] text-muted hover:text-text">
          Cancelar
        </button>
      </li>
    );
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteEntry(entry.id);
      if (!result.ok) toast.show(result.error ?? "No se ha podido borrar", { tone: "danger" });
      else {
        toast.show("Entrada borrada");
        router.refresh();
      }
    });
  }

  return (
    <li
      className={cx(
        "group grid min-h-10 grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line py-1.5 last:border-b-0 sm:grid-cols-[52px_96px_minmax(0,1fr)_auto]",
        pending && "opacity-50",
      )}
    >
      <span className="num text-[13px] font-medium" title={`${entry.minutes} minutos`}>
        {formatClock(entry.minutes)}
      </span>
      <span className="max-sm:hidden">
        <Chip>{CATEGORY_LABELS[entry.category]}</Chip>
      </span>
      <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
        <span className="truncate text-[13px]">
          <span className="text-muted sm:hidden">{CATEGORY_LABELS[entry.category]} · </span>
          {linkLabel ?? (entry.note ? entry.note : <span className="text-muted">Sin vincular</span>)}
        </span>
        {linkLabel && entry.note ? <span className="truncate text-[12px] text-muted">{entry.note}</span> : null}
      </span>
      <span className="flex items-center gap-1">
        {entry.started_at && entry.ended_at ? (
          <span
            className="num flex items-center gap-1 text-[11px] text-muted max-md:hidden"
            title="Registrada con el cronómetro"
          >
            <Timer className="size-3" aria-hidden />
            {formatTime(new Date(entry.started_at))}–{formatTime(new Date(entry.ended_at))}
          </span>
        ) : null}
        {person ? <Avatar person={person} size="xs" /> : null}
        {editable ? (
          <span className="flex opacity-100 transition-opacity duration-150 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <IconButton label="Editar entrada" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Borrar entrada" onClick={remove} disabled={pending} className="hover:text-danger">
              <Trash2 className="size-3.5" aria-hidden />
            </IconButton>
          </span>
        ) : null}
      </span>
    </li>
  );
}
