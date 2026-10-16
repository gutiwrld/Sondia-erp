"use client";

import { useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button, Field, Input, Select, cx, inputClass } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import { deleteEntry, logHours, startTimer, updateEntry, type LogResult } from "@/app/(app)/horas/actions";
import { parseDuration } from "@/lib/duration";
import { formatDuration } from "@/lib/format";
import { CATEGORY_LABELS, HOUR_CATEGORIES, isHourCategory, type HourCategory } from "@/lib/hours";
import type { LinkOption } from "@/lib/data/hours";

export type EntryDefaults = {
  duration?: string;
  category?: HourCategory | null;
  date?: string;
  link?: string;
  note?: string;
};

const LAST_CATEGORY_KEY = "sondia:ultima-categoria";

function readLastCategory(): HourCategory | null {
  try {
    const v = localStorage.getItem(LAST_CATEGORY_KEY);
    return isHourCategory(v) ? v : null;
  } catch {
    return null;
  }
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function writeLastCategory(c: HourCategory) {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY, c);
  } catch {
    // Sin almacenamiento (modo privado): no pasa nada, solo no se recuerda.
  }
}

/**
 * Formulario de horas. Se usa en el registro rápido (`layout="stacked"`), en
 * la barra de la página de Horas (`layout="inline"`) y para editar una entrada.
 */
export function EntryForm({
  today,
  linkOptions,
  defaults,
  layout,
  fromTimer = false,
  editingId,
  onDone,
  autoFocus = false,
  showTimerButton = true,
}: {
  today: string;
  linkOptions: LinkOption[] | null;
  defaults?: EntryDefaults;
  layout: "inline" | "stacked";
  fromTimer?: boolean;
  editingId?: string;
  onDone?: (result: Extract<LogResult, { ok: true }>) => void;
  autoFocus?: boolean;
  showTimerButton?: boolean;
}) {
  const ids = useId();
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState(defaults?.duration ?? "");
  const [picked, setCategory] = useState<HourCategory | null>(defaults?.category ?? null);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  // La última categoría usada se recuerda en este dispositivo.
  const remembered = useSyncExternalStore(subscribeToStorage, readLastCategory, () => null);
  const category = picked ?? (editingId || defaults?.category ? null : remembered);

  const minutes = parseDuration(duration);
  const durationHint = duration.trim() && minutes === null ? "Formato: 1,5 · 1h30 · 90m" : null;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editingId ? await updateEntry(editingId, formData) : await logHours(formData);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        if (result.field === "duration") durationRef.current?.focus();
        return;
      }
      writeLastCategory(result.category);
      setDuration("");
      const noteInput = formRef.current?.elements.namedItem("note");
      if (noteInput instanceof HTMLInputElement) noteInput.value = "";
      if (!editingId) {
        const id = result.id;
        toast.show(result.message, {
          action: {
            label: "Deshacer",
            onClick: async () => {
              const undo = await deleteEntry(id);
              if (undo.ok) {
                toast.show("Entrada borrada");
                router.refresh();
              } else toast.show(undo.error ?? "No se ha podido deshacer", { tone: "danger" });
            },
          },
        });
      }
      onDone?.(result);
      durationRef.current?.focus();
    });
  }

  function start() {
    const formData = formRef.current ? new FormData(formRef.current) : new FormData();
    startTransition(async () => {
      const result = await startTimer(formData);
      if (!result.ok) toast.show(result.error ?? "No se ha podido iniciar", { tone: "danger" });
      else {
        toast.show("Cronómetro en marcha");
        onDone?.({ ok: true, id: "", message: "", category: category ?? "gestion" });
      }
    });
  }

  const invalid = (field: string) => error?.field === field;
  const inline = layout === "inline";

  const durationField = (
    <Field
      label="Duración"
      htmlFor={`${ids}-d`}
      className={inline ? "w-[132px] max-lg:w-auto" : undefined}
      error={invalid("duration") ? error?.message : undefined}
    >
      <div className="relative">
        <Input
          ref={durationRef}
          id={`${ids}-d`}
          name="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="1h30"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={invalid("duration")}
          aria-describedby={`${ids}-dh`}
          className="num pr-16"
          autoFocus={autoFocus}
          required
        />
        <span
          id={`${ids}-dh`}
          aria-live="polite"
          className="num pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] whitespace-nowrap text-muted"
        >
          {minutes !== null ? formatDuration(minutes) : ""}
        </span>
      </div>
      {!invalid("duration") && durationHint ? <p className="text-[12px] text-muted">{durationHint}</p> : null}
    </Field>
  );

  const categoryField = (
    <fieldset className={cx("flex min-w-0 flex-col gap-1", inline && "max-lg:col-span-2")}>
      <legend className="mb-1 text-[12px] font-medium text-muted">Categoría</legend>
      <div
        role="radiogroup"
        aria-invalid={invalid("category")}
        className={cx(
          "grid gap-1",
          inline ? "grid-cols-6 max-lg:grid-cols-3" : "grid-cols-3",
        )}
      >
        {HOUR_CATEGORIES.map((c) => (
          <label
            key={c}
            className={cx(
              "flex h-8 cursor-pointer items-center justify-center rounded-sm border px-2 text-[12px] font-medium whitespace-nowrap transition-colors duration-150 select-none max-md:h-10 max-md:text-[13px]",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              category === c
                ? "border-text bg-text text-bg"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-text",
            )}
          >
            <input
              type="radio"
              name="category"
              value={c}
              checked={category === c}
              onChange={() => setCategory(c)}
              className="sr-only"
            />
            {CATEGORY_LABELS[c]}
          </label>
        ))}
      </div>
      {invalid("category") ? (
        <p className="text-[12px] text-danger" role="alert">
          {error?.message}
        </p>
      ) : null}
    </fieldset>
  );

  const linkField = (
    <Field label="Cliente o tarea" htmlFor={`${ids}-l`} className={inline ? "w-[200px] max-lg:w-auto" : undefined}>
      <Select id={`${ids}-l`} name="link" defaultValue={defaults?.link ?? ""} disabled={linkOptions === null}>
        <option value="">{linkOptions === null ? "Cargando…" : "Sin vincular"}</option>
        {linkOptions && linkOptions.some((o) => o.group === "clientes") ? (
          <optgroup label="Clientes">
            {linkOptions
              .filter((o) => o.group === "clientes")
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ) : null}
        {linkOptions && linkOptions.some((o) => o.group === "tareas") ? (
          <optgroup label="Tareas">
            {linkOptions
              .filter((o) => o.group === "tareas")
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </optgroup>
        ) : null}
      </Select>
    </Field>
  );

  const dateField = (
    <Field
      label="Fecha"
      htmlFor={`${ids}-f`}
      className={inline ? "w-[148px] max-lg:w-auto" : undefined}
      error={invalid("date") ? error?.message : undefined}
    >
      <input
        id={`${ids}-f`}
        type="date"
        name="date"
        defaultValue={defaults?.date ?? today}
        max={today}
        required
        aria-invalid={invalid("date")}
        className={cx(inputClass, "num")}
      />
    </Field>
  );

  const noteField = (
    <Field
      label="Nota"
      htmlFor={`${ids}-n`}
      className={inline ? "min-w-[160px] flex-1 max-lg:col-span-2" : undefined}
      error={invalid("note") ? error?.message : undefined}
    >
      <Input
        id={`${ids}-n`}
        name="note"
        defaultValue={defaults?.note ?? ""}
        placeholder="Qué has hecho (opcional)"
        maxLength={500}
        autoComplete="off"
      />
    </Field>
  );

  const generalError =
    error && !["duration", "category", "date", "note"].includes(error.field ?? "") ? (
      <p className="text-[12px] text-danger" role="alert">
        {error.message}
      </p>
    ) : null;

  const submitLabel = editingId ? "Guardar" : fromTimer ? "Guardar horas" : "Apuntar";

  if (inline) {
    return (
      <form ref={formRef} action={submit} className="flex flex-col gap-2" aria-label="Apuntar horas">
        {fromTimer ? <input type="hidden" name="fromTimer" value="1" /> : null}
        <div className="flex flex-wrap items-end gap-3 max-lg:grid max-lg:grid-cols-2">
          {durationField}
          {categoryField}
          {linkField}
          {dateField}
          {noteField}
          <div className="flex items-end gap-2 max-lg:col-span-2">
            <Button type="submit" variant="secondary" disabled={pending} className="min-w-[88px] max-lg:flex-1">
              {pending ? "Guardando…" : submitLabel}
            </Button>
            {showTimerButton ? (
              <Button type="button" variant="ghost" onClick={start} disabled={pending} title="Iniciar cronómetro" aria-label="Iniciar cronómetro">
                <Play className="size-3.5" aria-hidden />
                <span className="max-xl:sr-only">Cronómetro</span>
              </Button>
            ) : null}
          </div>
        </div>
        {generalError}
      </form>
    );
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-4" aria-label="Apuntar horas">
      {fromTimer ? <input type="hidden" name="fromTimer" value="1" /> : null}
      <div className="grid grid-cols-2 gap-3">
        {durationField}
        {dateField}
      </div>
      {categoryField}
      {linkField}
      {noteField}
      {generalError}
      <div className="flex items-center gap-2">
        {showTimerButton && !fromTimer && !editingId ? (
          <Button type="button" variant="ghost" onClick={start} disabled={pending}>
            <Play className="size-3.5" aria-hidden /> Iniciar cronómetro
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={pending} className="ml-auto min-w-[112px]">
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
      <p className="text-[12px] text-muted max-md:hidden">
        <kbd className="num">Enter</kbd> guarda · <kbd className="num">Esc</kbd> cierra
      </p>
    </form>
  );
}
