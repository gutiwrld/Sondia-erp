"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { cx } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import { setGoalStatus, setTaskDone } from "./actions";

export function TaskCheck({ id, title, done }: { id: string; title: string; done: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !optimisticDone;
    startTransition(async () => {
      setOptimisticDone(next);
      const result = await setTaskDone(id, next);
      if (!result.ok) toast.show(result.error ?? "No se ha podido actualizar", { tone: "danger" });
      else if (next) {
        toast.show("Tarea hecha", {
          action: { label: "Deshacer", onClick: () => startTransition(async () => void (await setTaskDone(id, false))) },
        });
      }
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticDone}
      aria-label={`Marcar como hecha: ${title}`}
      onClick={toggle}
      className="group/check flex size-8 shrink-0 items-center justify-center rounded-sm max-md:size-10"
    >
      <span
        className={cx(
          "flex size-4 items-center justify-center rounded-xs border transition-colors duration-150",
          optimisticDone ? "border-text bg-text text-bg" : "border-line-strong group-hover/check:border-text",
        )}
      >
        {optimisticDone ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
      </span>
    </button>
  );
}

const GOAL_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho",
  no_hecho: "No hecho",
  arrastrado: "Arrastrado",
};

export function GoalStatusSelect({ id, title, status }: { id: string; title: string; status: string }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const toast = useToast();

  const tone =
    optimistic === "hecho"
      ? "bg-positive-soft text-positive border-transparent"
      : optimistic === "en_curso"
        ? "bg-surface text-text border-line-strong"
        : optimistic === "no_hecho"
          ? "bg-danger-soft text-danger border-transparent"
          : "bg-surface-sunken text-muted border-line";

  return (
    <select
      aria-label={`Estado de «${title}»`}
      value={optimistic}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          setOptimistic(next);
          const result = await setGoalStatus(id, next);
          if (!result.ok) toast.show(result.error ?? "No se ha podido actualizar", { tone: "danger" });
        });
      }}
      className={cx(
        "h-6 shrink-0 appearance-none rounded-xs border px-1.5 font-mono text-[11px] font-medium tracking-[0.02em] focus:outline-none focus-visible:outline-2 focus-visible:outline-accent max-md:h-8",
        tone,
      )}
    >
      {["pendiente", "en_curso", "hecho", "no_hecho"].map((s) => (
        <option key={s} value={s}>
          {GOAL_LABELS[s]}
        </option>
      ))}
      {optimistic === "arrastrado" ? <option value="arrastrado">Arrastrado</option> : null}
    </select>
  );
}
