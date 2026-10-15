"use client";

import { useEffect, useState, useTransition } from "react";
import { Square, Trash2 } from "lucide-react";
import { useQuickLog } from "@/components/app/quick-log";
import { useToast } from "@/components/app/toast";
import { IconButton, cx } from "@/components/ui";
import { discardTimer, stopTimerPreview } from "@/app/(app)/horas/actions";
import { durationInput } from "@/lib/duration";
import { CATEGORY_LABELS, type HourCategory } from "@/lib/hours";

export type TimerView = {
  started_at: string;
  category: HourCategory | null;
  label: string | null;
};

function elapsed(startedAt: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Cronómetro en marcha. Al pararlo abre el registro con la duración rellena. */
export function RunningTimer({ timer, compact = false }: { timer: TimerView; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const quickLog = useQuickLog();
  const toast = useToast();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function stop() {
    startTransition(async () => {
      const preview = await stopTimerPreview();
      if (!preview.ok) {
        toast.show(preview.error, { tone: "danger" });
        return;
      }
      if (!preview.valid) {
        toast.show(
          preview.minutes < 1
            ? "Ha pasado menos de un minuto. Descarta el cronómetro o déjalo correr."
            : "Lleva más de 24 h en marcha: apunta la duración real a mano.",
          { tone: "danger" },
        );
      }
      quickLog.open({
        title: "Guardar el cronómetro",
        fromTimer: true,
        defaults: {
          duration: preview.valid ? durationInput(preview.minutes) : "",
          category: preview.category,
          date: preview.date,
          link: preview.link,
          note: preview.note,
        },
      });
    });
  }

  function discard() {
    startTransition(async () => {
      await discardTimer();
      toast.show("Cronómetro descartado");
    });
  }

  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-sm border border-accent/40 bg-accent-soft",
        compact ? "h-9 pr-1 pl-2.5" : "h-10 pr-1 pl-3",
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-accent [animation:pulse-dot_1.6s_ease-in-out_infinite]" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="num text-[13px] font-medium text-text" aria-label="Tiempo en marcha">
          {elapsed(timer.started_at, now)}
        </span>
        {!compact ? (
          <span className="truncate text-[11px] text-muted">
            {[timer.category ? CATEGORY_LABELS[timer.category] : null, timer.label].filter(Boolean).join(" · ") ||
              "Sin categoría"}
          </span>
        ) : null}
      </span>
      <IconButton label="Parar y guardar" onClick={stop} disabled={pending} className="text-accent-text hover:text-text">
        <Square className="size-3.5 fill-current" aria-hidden />
      </IconButton>
      {!compact ? (
        <IconButton label="Descartar cronómetro" onClick={discard} disabled={pending}>
          <Trash2 className="size-3.5" aria-hidden />
        </IconButton>
      ) : null}
    </div>
  );
}
