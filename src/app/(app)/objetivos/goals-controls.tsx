"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowRight, CornerDownRight, ListChecks, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarStack, Button, IconButton, Input, cx } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { Goal } from "@/lib/data/goals";
import { formatGoalDays } from "@/lib/labels";
import { GoalStatusSelect } from "../my-space-controls";
import { carryOverGoals, createGoal, deleteGoal, updateGoal } from "./actions";

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function CarryOverBanner({ week, count }: { week: string; count: number }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent/40 bg-accent-soft px-4 py-3" role="status">
      <CornerDownRight className="size-4 shrink-0 text-accent-text" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px]">
        La semana pasada {count === 1 ? "quedó 1 objetivo" : `quedaron ${count} objetivos`} sin terminar.
      </p>
      <Button
        variant="strong"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await carryOverGoals(week);
            if (!result.ok) toast.show(result.error ?? "No se han podido pasar", { tone: "danger" });
            else toast.show(result.count === 1 ? "1 objetivo pasado a esta semana" : `${result.count} objetivos pasados a esta semana`);
          })
        }
      >
        {pending ? "Pasando…" : "Pasarlos a esta semana"}
      </Button>
    </div>
  );
}

function DayToggles({ value, onChange, idPrefix }: { value: number[]; onChange: (v: number[]) => void; idPrefix: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-[12px] font-medium text-muted">Día</legend>
      <div className="flex gap-1">
        {DAY_LETTERS.map((letter, i) => {
          const day = i + 1;
          const on = value.includes(day);
          return (
            <button
              key={day}
              id={`${idPrefix}-d${day}`}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={DAY_NAMES[i]}
              onClick={() => onChange(on ? value.filter((d) => d !== day) : [...value, day].sort())}
              className={cx(
                "num flex size-8 items-center justify-center rounded-sm border text-[12px] transition-colors duration-150 max-md:size-10",
                on ? "border-text bg-text font-medium text-bg" : "border-line text-muted hover:border-line-strong hover:text-text",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function OwnerToggles({
  members,
  me,
  value,
  onChange,
  invalid,
}: {
  members: Member[];
  me: Member;
  value: string[];
  onChange: (v: string[]) => void;
  invalid?: boolean;
}) {
  const allOn = members.every((m) => value.includes(m.id));
  return (
    <fieldset className="flex flex-col gap-1" aria-invalid={invalid}>
      <legend className="mb-1 text-[12px] font-medium text-muted">Quién</legend>
      <div className="flex flex-wrap gap-1">
        {members.map((m) => {
          const on = value.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])}
              className={cx(
                "flex h-8 items-center gap-1.5 rounded-full border pr-2.5 pl-1 text-[12px] transition-colors duration-150 max-md:h-10",
                on ? "border-text bg-surface-hover text-text" : "border-line text-muted hover:border-line-strong",
              )}
            >
              <Avatar person={m} size="xs" />
              {m.id === me.id ? "Yo" : m.short_name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(allOn ? [me.id] : members.map((m) => m.id))}
          className="h-8 px-2 text-[12px] text-muted hover:text-text max-md:h-10"
        >
          {allOn ? "Solo yo" : "Todos"}
        </button>
      </div>
    </fieldset>
  );
}

/** Alta de objetivos (y edición, con `goal`). */
export function GoalForm({
  week,
  members,
  me,
  goal,
  onDone,
}: {
  week: string;
  members: Member[];
  me: Member;
  goal?: Goal;
  onDone?: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState<number[]>(goal?.days ?? []);
  const [owners, setOwners] = useState<string[]>(goal ? goal.owners.map((o) => o.member_id) : [me.id]);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  return (
    <form
      ref={formRef}
      aria-label={goal ? "Editar objetivo" : "Añadir objetivo"}
      action={(fd) => {
        for (const d of days) fd.append("days", String(d));
        for (const o of owners) fd.append("owners", o);
        setError(null);
        startTransition(async () => {
          const result = goal ? await updateGoal(goal.id, fd) : await createGoal(week, fd);
          if (!result.ok) {
            setError({ message: result.error, field: result.field });
            return;
          }
          toast.show(result.message);
          if (!goal) {
            formRef.current?.reset();
            setDays([]);
            titleRef.current?.focus();
          }
          onDone?.();
        });
      }}
      className={cx(
        "flex flex-col gap-3",
        goal ? "py-3" : "rounded-md border border-line bg-surface p-3",
      )}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={goal ? `goal-title-${goal.id}` : "goal-title"} className={goal ? "sr-only" : "text-[12px] font-medium text-muted"}>
          {goal ? "Objetivo" : "Nuevo objetivo"}
        </label>
        <Input
          ref={titleRef}
          id={goal ? `goal-title-${goal.id}` : "goal-title"}
          name="title"
          defaultValue={goal?.title ?? ""}
          placeholder="Cerrar un cliente nuevo"
          maxLength={300}
          required
          autoFocus={Boolean(goal)}
          aria-invalid={error?.field === "title"}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <DayToggles value={days} onChange={setDays} idPrefix={goal ? goal.id : "nuevo"} />
        <OwnerToggles members={members} me={me} value={owners} onChange={setOwners} invalid={error?.field === "owners"} />
        <div className="ml-auto flex items-center gap-2">
          {goal ? (
            <Button variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" variant={goal ? "strong" : "secondary"} disabled={pending}>
            {pending ? "Guardando…" : goal ? "Guardar" : "Añadir"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error.message}
        </p>
      ) : null}
    </form>
  );
}

export function GoalRow({ goal, members, me, week }: { goal: Goal; members: Member[]; me: Member; week: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const owners = goal.owners.map((o) => members.find((m) => m.id === o.member_id)).filter(Boolean) as Member[];
  const carriedAway = goal.status === "arrastrado";
  const openTasks = goal.tasks.filter((t) => t.status !== "hecha").length;

  if (editing) {
    return (
      <li className="border-b border-line">
        <GoalForm week={week} members={members} me={me} goal={goal} onDone={() => setEditing(false)} />
      </li>
    );
  }

  function remove() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      toast.show(result.ok ? "Objetivo borrado" : (result.error ?? "No se ha podido borrar"), {
        tone: result.ok ? "neutral" : "danger",
      });
    });
  }

  const meta = [
    goal.days.length > 1 ? formatGoalDays(goal.days) : null,
    goal.carried_from_id ? "viene de la semana pasada" : null,
    carriedAway ? "pasado a la semana siguiente" : null,
  ].filter(Boolean);

  return (
    <li
      className={cx(
        "group flex min-h-12 items-start gap-x-3 gap-y-1.5 border-b border-line py-2.5 max-sm:flex-col",
        pending && "opacity-50",
      )}
    >
      <span className="min-w-0 flex-1 max-sm:w-full">
        <span
          className={cx(
            "block text-[13px]",
            (goal.status === "hecho" || carriedAway) && "text-muted",
            goal.status === "hecho" && "line-through decoration-line-strong",
          )}
        >
          {goal.title}
        </span>
        {meta.length || goal.tasks.length ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            {meta.length ? <span>{meta.join(" · ")}</span> : null}
            {goal.tasks.length ? (
              <Link href={`/tareas?persona=equipo`} className="inline-flex items-center gap-1 hover:text-text">
                <ListChecks className="size-3" aria-hidden />
                {openTasks ? `${openTasks} de ${goal.tasks.length} tareas abiertas` : `${goal.tasks.length} tareas hechas`}
              </Link>
            ) : null}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 max-sm:-ml-1 max-sm:w-full">
        <AvatarStack people={owners} />
        {carriedAway ? (
          <span className="inline-flex h-6 items-center gap-1 px-1.5 font-mono text-[11px] text-muted">
            <ArrowRight className="size-3" aria-hidden /> Arrastrado
          </span>
        ) : (
          <GoalStatusSelect id={goal.id} title={goal.title} status={goal.status} />
        )}
        <span className="flex max-sm:ml-auto md:opacity-0 md:transition-opacity md:duration-150 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <IconButton label="Editar objetivo" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden />
          </IconButton>
          <IconButton
            label={confirm ? "Pulsa otra vez para borrar" : "Borrar objetivo"}
            onClick={remove}
            onBlur={() => setConfirm(false)}
            className={cx(confirm ? "bg-danger-soft text-danger" : "hover:text-danger")}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </IconButton>
        </span>
      </span>
    </li>
  );
}
