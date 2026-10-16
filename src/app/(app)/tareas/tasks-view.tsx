"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type DragEvent } from "react";
import { Check, ChevronDown, Columns3, List, Plus, X } from "lucide-react";
import { Avatar, AvatarStack, Button, Chip, Empty, Field, IconButton, Input, Select, cx, inputClass } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { Task, TaskLinkOptions } from "@/lib/data/tasks";
import {
  DUE_GROUP_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  compareTasks,
  groupByDue,
  type TaskStatus,
} from "@/lib/tasks";
import { addDays, isoWeekday } from "@/lib/dates";
import { formatDayMonth, formatHours, formatRelativeDay, formatShortDate } from "@/lib/format";
import { PRIORITY_LABELS } from "@/lib/labels";
import { createTask, deleteTask, setTaskStatus, updateTask } from "./actions";

type Filters = { persona: string; priority: string | null; clientId: string | null };

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function TasksView({
  me,
  members,
  tasks,
  totalBeforeFilters,
  options,
  today,
  view,
  filters,
  openTaskId,
  openNew = false,
}: {
  me: Member;
  members: Member[];
  tasks: Task[];
  totalBeforeFilters: number;
  options: TaskLinkOptions;
  today: string;
  view: "lista" | "tablero";
  filters: Filters;
  openTaskId: string | null;
  openNew?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [, startTransition] = useTransition();

  // Cambios de estado optimistas (marcar hecha, mover en el tablero).
  const [optimisticTasks, applyStatus] = useOptimistic(tasks, (state, change: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === change.id ? { ...t, status: change.status, completed_at: change.status === "hecha" ? new Date().toISOString() : null } : t)),
  );

  const [panel, setPanel] = useState<{ mode: "new" } | { mode: "edit"; task: Task } | null>(() => {
    const t = openTaskId ? tasks.find((x) => x.id === openTaskId) : undefined;
    return t ? { mode: "edit", task: t } : openNew ? { mode: "new" } : null;
  });

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  function setParam(updates: Record<string, string | null>) {
    const q = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") q.delete(k);
      else q.set(k, v);
    }
    q.delete("tarea");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function changeStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    startTransition(async () => {
      applyStatus({ id: task.id, status });
      const result = await setTaskStatus(task.id, status);
      if (!result.ok) toast.show(result.error ?? "No se ha podido mover", { tone: "danger" });
      else if (status === "hecha") {
        toast.show("Tarea hecha", {
          action: { label: "Deshacer", onClick: () => startTransition(async () => void (await setTaskStatus(task.id, task.status))) },
        });
      }
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "t" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      setPanel({ mode: "new" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = optimisticTasks.filter((t) => t.status !== "hecha");
  const done = optimisticTasks.filter((t) => t.status === "hecha").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const filtered = Boolean(filters.priority || filters.clientId);
  const defaultOwner = filters.persona !== "yo" && filters.persona !== "equipo" ? filters.persona : me.id;

  const personaTabs = [
    { id: "yo", label: "Yo" },
    ...members.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, label: m.short_name })),
    { id: "equipo", label: "Equipo" },
  ];

  return (
    <>
      <header className="border-b border-line">
        <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Tareas</h1>
            <span className="num text-[12px] text-muted">{open.length} abiertas</span>
          </div>
          <div className="flex items-center gap-2">
            <div role="radiogroup" aria-label="Vista" className="flex rounded-sm border border-line bg-surface p-0.5">
              {(
                [
                  ["lista", "Lista", List],
                  ["tablero", "Tablero", Columns3],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  onClick={() => {
                    document.cookie = `tareas_vista=${value}; path=/; max-age=31536000; samesite=lax`;
                    setParam({ vista: value });
                  }}
                  className={cx(
                    "flex h-7 items-center gap-1.5 rounded-xs px-2 text-[12px] transition-colors duration-150 max-md:h-9",
                    view === value ? "bg-surface-hover font-medium text-text" : "text-muted hover:text-text",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  <span className="max-sm:sr-only">{label}</span>
                </button>
              ))}
            </div>
            <Button variant="strong" onClick={() => setPanel({ mode: "new" })}>
              <Plus className="size-4" aria-hidden />
              <span>
                Nueva<span className="max-sm:hidden"> tarea</span>
              </span>
              <kbd className="num rounded-xs bg-bg/15 px-1 text-[11px] font-medium max-md:hidden">T</kbd>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 md:px-6">
          <nav aria-label="Responsable" className="flex rounded-sm border border-line bg-surface p-0.5">
            {personaTabs.map((t) => {
              const active = filters.persona === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setParam({ persona: t.id === "yo" ? null : t.id })}
                  className={cx(
                    "flex h-7 items-center rounded-xs px-2.5 text-[12px] transition-colors duration-150 max-md:h-9",
                    active ? "bg-surface-hover font-medium text-text" : "text-muted hover:text-text",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
          <Select
            aria-label="Prioridad"
            value={filters.priority ?? ""}
            onChange={(e) => setParam({ prioridad: e.target.value || null })}
            className="h-8 max-w-[190px] max-md:h-10"
          >
            <option value="">Cualquier prioridad</option>
            {TASK_PRIORITIES.slice()
              .reverse()
              .map((p) => (
                <option key={p} value={p}>
                  Prioridad {PRIORITY_LABELS[p].toLowerCase()}
                </option>
              ))}
          </Select>
          <Select
            aria-label="Cliente"
            value={filters.clientId ?? ""}
            onChange={(e) => setParam({ cliente: e.target.value || null })}
            className="h-8 max-w-[220px] max-md:h-10"
          >
            <option value="">Todos los clientes</option>
            {options.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {filtered ? (
            <button
              type="button"
              onClick={() => setParam({ prioridad: null, cliente: null })}
              className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-[12px] text-muted hover:text-text"
            >
              <X className="size-3.5" aria-hidden /> Quitar filtros
            </button>
          ) : null}
        </div>
      </header>

      <div className="px-4 py-5 md:px-6">
        {view === "lista" ? (
          <ListView
            open={open}
            done={done}
            today={today}
            membersById={membersById}
            showOwners={filters.persona === "equipo"}
            onOpen={(task) => setPanel({ mode: "edit", task })}
            onStatus={changeStatus}
            quickAdd={<QuickAdd ownerId={defaultOwner} />}
            empty={
              totalBeforeFilters === 0 ? (
                <Empty
                  title={filters.persona === "yo" ? "No tienes tareas abiertas" : "No hay tareas abiertas"}
                  action={
                    <Button variant="strong" onClick={() => setPanel({ mode: "new" })}>
                      <Plus className="size-4" aria-hidden /> Nueva tarea
                    </Button>
                  }
                >
                  Escribe arriba qué hay que hacer y pulsa Enter, o crea una tarea con fecha, prioridad y responsables.
                  Puedes vincularla a un cliente, a una LP o a un objetivo de la semana.
                </Empty>
              ) : filtered ? (
                <Empty title="Ninguna tarea con estos filtros">Prueba a quitar el filtro de prioridad o de cliente.</Empty>
              ) : null
            }
          />
        ) : (
          <BoardView
            tasks={optimisticTasks}
            today={today}
            membersById={membersById}
            onOpen={(task) => setPanel({ mode: "edit", task })}
            onStatus={changeStatus}
            quickAdd={<QuickAdd ownerId={defaultOwner} compact />}
          />
        )}
      </div>

      <TaskPanel
        key={panel ? (panel.mode === "new" ? "new" : panel.task.id) : "closed"}
        state={panel}
        onClose={() => {
          setPanel(null);
          if (searchParams.has("tarea") || searchParams.has("nueva")) setParam({ nueva: null });
        }}
        members={members}
        me={me}
        defaultOwner={defaultOwner}
        options={options}
        today={today}
      />
    </>
  );
}

// --- Alta rápida ---------------------------------------------------------------

function QuickAdd({ ownerId, compact = false }: { ownerId: string; compact?: boolean }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={(fd) => {
        if (!title.trim()) return;
        fd.set("owners", ownerId);
        startTransition(async () => {
          const result = await createTask(fd);
          if (result.ok) {
            setTitle("");
            toast.show("Tarea creada");
            inputRef.current?.focus();
          } else toast.show(result.error, { tone: "danger" });
        });
      }}
      className={cx("flex items-center gap-2", compact ? "" : "mb-5")}
    >
      <label htmlFor={compact ? "quick-add-board" : "quick-add"} className="sr-only">
        Nueva tarea
      </label>
      <div className="relative min-w-0 flex-1">
        <Plus className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          ref={inputRef}
          id={compact ? "quick-add-board" : "quick-add"}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={compact ? "Añadir tarea" : "Añadir una tarea y pulsar Enter"}
          maxLength={300}
          autoComplete="off"
          disabled={pending}
          className="pl-8"
        />
      </div>
    </form>
  );
}

// --- Lista -----------------------------------------------------------------------

function ListView({
  open,
  done,
  today,
  membersById,
  showOwners,
  onOpen,
  onStatus,
  quickAdd,
  empty,
}: {
  open: Task[];
  done: Task[];
  today: string;
  membersById: Map<string, Member>;
  showOwners: boolean;
  onOpen: (t: Task) => void;
  onStatus: (t: Task, s: TaskStatus) => void;
  quickAdd: React.ReactNode;
  empty: React.ReactNode;
}) {
  const [showDone, setShowDone] = useState(false);
  const groups = groupByDue(open, today);

  return (
    <div className="max-w-[960px]">
      {quickAdd}
      {groups.length === 0 ? (
        empty ?? <Empty title="Todo hecho">No te queda ninguna tarea abierta. Las hechas de esta semana están abajo.</Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.group} aria-labelledby={`grupo-${g.group}`}>
              <div className="flex h-8 items-center gap-2 border-b border-line">
                <h2
                  id={`grupo-${g.group}`}
                  className={cx("text-[13px] font-semibold", g.group === "atrasadas" && "text-accent-text")}
                >
                  {DUE_GROUP_LABELS[g.group]}
                </h2>
                <span className="num text-[12px] text-muted">{g.tasks.length}</span>
              </div>
              <ul>
                {g.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    today={today}
                    owners={t.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[]}
                    showOwners={showOwners}
                    onOpen={() => onOpen(t)}
                    onToggle={() => onStatus(t, "hecha")}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {done.length > 0 ? (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex h-8 w-full items-center gap-2 border-b border-line text-left"
          >
            <ChevronDown className={cx("size-3.5 text-muted transition-transform duration-150", !showDone && "-rotate-90")} aria-hidden />
            <span className="text-[13px] font-semibold">Hechas</span>
            <span className="num text-[12px] text-muted">{done.length}</span>
            <span className="text-[12px] text-muted">· últimos 7 días</span>
          </button>
          {showDone ? (
            <ul>
              {done.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  today={today}
                  owners={t.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[]}
                  showOwners={showOwners}
                  onOpen={() => onOpen(t)}
                  onToggle={() => onStatus(t, "por_hacer")}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function linkLabel(t: Task): string | null {
  if (t.client) return t.client.name;
  if (t.learning_path) return t.learning_path.number ? `LP ${t.learning_path.number}` : "LP";
  if (t.weekly_goal) return `Objetivo · ${t.weekly_goal.title}`;
  return null;
}

function DueChip({ task, today }: { task: Task; today: string }) {
  if (!task.due_date) return null;
  const late = task.status !== "hecha" && task.due_date < today;
  const near = task.due_date >= addDays(today, -1) && task.due_date <= addDays(today, 1);
  return (
    <Chip tone={late ? "accent" : "neutral"}>
      {near || late ? formatRelativeDay(task.due_date, today) : formatShortDate(task.due_date)}
    </Chip>
  );
}

function TaskRow({
  task,
  today,
  owners,
  showOwners,
  onOpen,
  onToggle,
}: {
  task: Task;
  today: string;
  owners: Member[];
  showOwners: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const done = task.status === "hecha";
  const link = linkLabel(task);
  return (
    <li className="group flex min-h-11 items-center gap-1 border-b border-line pr-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`${done ? "Reabrir" : "Marcar como hecha"}: ${task.title}`}
        onClick={onToggle}
        className="group/check flex size-8 shrink-0 items-center justify-center rounded-sm max-md:size-10"
      >
        <span
          className={cx(
            "flex size-4 items-center justify-center rounded-xs border transition-colors duration-150",
            done ? "border-text bg-text text-bg" : "border-line-strong group-hover/check:border-text",
          )}
        >
          {done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
        </span>
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col py-2 text-left">
        <span className={cx("line-clamp-2 text-[13px] md:truncate", done && "text-muted line-through decoration-line-strong")}>
          {task.title}
        </span>
        {link || task.status === "en_curso" ? (
          <span className="truncate text-[12px] text-muted">
            {[task.status === "en_curso" ? "En curso" : null, link].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </button>
      <span className="flex shrink-0 items-center gap-1.5">
        {task.priority === "alta" && !done ? <Chip>Alta</Chip> : null}
        <DueChip task={task} today={today} />
        {showOwners && owners.length ? <AvatarStack people={owners} /> : null}
      </span>
    </li>
  );
}

// --- Tablero ----------------------------------------------------------------------

function BoardView({
  tasks,
  today,
  membersById,
  onOpen,
  onStatus,
  quickAdd,
}: {
  tasks: Task[];
  today: string;
  membersById: Map<string, Member>;
  onOpen: (t: Task) => void;
  onStatus: (t: Task, s: TaskStatus) => void;
  quickAdd: React.ReactNode;
}) {
  const [over, setOver] = useState<TaskStatus | null>(null);
  const byId = new Map(tasks.map((t) => [t.id, t]));

  function onDrop(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    setOver(null);
    const task = byId.get(e.dataTransfer.getData("text/plain"));
    if (task) onStatus(task, status);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const column = tasks
            .filter((t) => t.status === status)
            .sort((a, b) =>
              status === "hecha" ? (b.completed_at ?? "").localeCompare(a.completed_at ?? "") : compareTasks(a, b),
            );
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={(e) => onDrop(e, status)}
              className={cx(
                "flex flex-col gap-2 rounded-md border md:min-h-[320px] border-line bg-surface-sunken p-2 transition-colors duration-150",
                over === status && "border-line-strong bg-surface-hover",
              )}
            >
              <div className="flex h-7 items-center gap-2 px-1">
                <h2 id={`col-${status}`} className="text-[13px] font-semibold">
                  {STATUS_LABELS[status]}
                </h2>
                <span className="num text-[12px] text-muted">{column.length}</span>
                {status === "hecha" ? <span className="text-[11px] text-muted">· 7 días</span> : null}
              </div>
              {status === "por_hacer" ? quickAdd : null}
              <ul className="flex flex-col gap-2">
                {column.map((t) => {
                  const owners = t.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[];
                  const link = linkLabel(t);
                  return (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab rounded-sm border border-line bg-surface active:cursor-grabbing"
                    >
                      <button type="button" onClick={() => onOpen(t)} className="flex w-full flex-col gap-2 p-2.5 text-left">
                        <span className={cx("text-[13px] leading-snug", t.status === "hecha" && "text-muted line-through decoration-line-strong")}>
                          {t.title}
                        </span>
                        {link ? <span className="truncate text-[12px] text-muted">{link}</span> : null}
                        <span className="flex items-center gap-1.5">
                          {t.priority === "alta" && t.status !== "hecha" ? <Chip>Alta</Chip> : null}
                          <DueChip task={t} today={today} />
                          <span className="ml-auto">{owners.length ? <AvatarStack people={owners} /> : null}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {column.length === 0 ? (
                <p className="px-1 py-2 text-[12px] text-muted">
                  {status === "en_curso" ? "Nada en curso." : status === "hecha" ? "Nada terminado en los últimos 7 días." : "Nada por hacer."}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-muted max-md:hidden">
        Arrastra las tarjetas para cambiar su estado, o ábrelas para editarlas.
      </p>
    </div>
  );
}

// --- Panel de detalle ------------------------------------------------------------

function nextFriday(today: string) {
  const d = isoWeekday(today);
  return addDays(today, d <= 5 ? 5 - d : 12 - d);
}

function TaskPanel({
  state,
  onClose,
  members,
  me,
  defaultOwner,
  options,
  today,
}: {
  state: { mode: "new" } | { mode: "edit"; task: Task } | null;
  onClose: () => void;
  members: Member[];
  me: Member;
  defaultOwner: string;
  options: TaskLinkOptions;
  today: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const task = state?.mode === "edit" ? state.task : null;

  const [owners, setOwners] = useState<string[]>(task ? task.owners.map((o) => o.member_id) : [defaultOwner]);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "por_hacer");
  const [priority, setPriority] = useState(task?.priority ?? "media");
  const [due, setDue] = useState(task?.due_date ?? "");
  const initialLink = task?.client
    ? `c:${task.client.id}`
    : task?.learning_path
      ? `l:${task.learning_path.id}`
      : task?.weekly_goal
        ? `g:${task.weekly_goal.id}`
        : "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (state && !dialog.open) dialog.showModal();
    if (!state && dialog.open) dialog.close();
  }, [state]);

  function submit(formData: FormData) {
    const link = String(formData.get("link") ?? "");
    formData.delete("link");
    formData.set("client_id", link.startsWith("c:") ? link.slice(2) : "");
    formData.set("learning_path_id", link.startsWith("l:") ? link.slice(2) : "");
    formData.set("weekly_goal_id", link.startsWith("g:") ? link.slice(2) : "");
    formData.delete("owners");
    for (const o of owners) formData.append("owners", o);
    formData.set("status", status);
    formData.set("priority", priority);
    formData.set("due_date", due);
    setError(null);
    startTransition(async () => {
      const result = task ? await updateTask(task.id, formData) : await createTask(formData);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        return;
      }
      toast.show(result.message);
      onClose();
    });
  }

  function remove() {
    if (!task) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.ok) toast.show(result.error ?? "No se ha podido borrar", { tone: "danger" });
      else {
        toast.show("Tarea borrada");
        onClose();
      }
    });
  }

  const quickDates = [
    { label: "Hoy", value: today },
    { label: "Mañana", value: addDays(today, 1) },
    { label: "Viernes", value: nextFriday(today) },
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-panel-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-text md:ml-auto md:w-[460px] max-md:mt-auto max-md:h-[92dvh]"
    >
      {state ? (
        <form
          action={submit}
          className="flex h-full flex-col border-line-strong bg-surface shadow-float [animation:sheet-in_200ms_cubic-bezier(0.16,1,0.3,1)] max-md:rounded-t-md max-md:border-t md:border-l"
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 id="task-panel-title" className="text-[14px] font-semibold">
              {task ? "Tarea" : "Nueva tarea"}
            </h2>
            <IconButton label="Cerrar" onClick={onClose}>
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
            <Field label="Qué hay que hacer" htmlFor="task-title" error={error?.field === "title" ? error.message : undefined}>
              <Input
                id="task-title"
                name="title"
                defaultValue={task?.title ?? ""}
                maxLength={300}
                required
                autoFocus={!task}
                aria-invalid={error?.field === "title"}
                placeholder="Llamar a Embutidos Pimar para cerrar"
              />
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-[12px] font-medium text-muted">Responsables</legend>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = owners.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setOwners((list) => (on ? list.filter((x) => x !== m.id) : [...list, m.id]))}
                      className={cx(
                        "flex h-8 items-center gap-2 rounded-full border pr-3 pl-1 text-[13px] transition-colors duration-150 max-md:h-10",
                        on ? "border-text bg-surface-hover text-text" : "border-line text-muted hover:border-line-strong",
                      )}
                    >
                      <Avatar person={m} size="xs" />
                      {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
                    </button>
                  );
                })}
              </div>
              {owners.length === 0 ? <p className="mt-1 text-[12px] text-muted">Sin elegir, la tarea será tuya.</p> : null}
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
              <Segmented
                label="Estado"
                value={status}
                onChange={(v) => setStatus(v as TaskStatus)}
                options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              />
              <Segmented
                label="Prioridad"
                value={priority}
                onChange={(v) => setPriority(v as Task["priority"])}
                options={TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
              />
            </div>

            <div>
              <Field label="Fecha límite" htmlFor="task-due">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="task-due"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className={cx(inputClass, "num w-[160px] max-md:w-[180px]")}
                  />
                  {quickDates.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setDue(d.value)}
                      aria-pressed={due === d.value}
                      className={cx(
                        "h-7 rounded-sm border px-2 text-[12px] transition-colors duration-150 max-md:h-9",
                        due === d.value ? "border-text text-text" : "border-line text-muted hover:text-text",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                  {due ? (
                    <button type="button" onClick={() => setDue("")} className="text-[12px] text-muted hover:text-text">
                      Sin fecha
                    </button>
                  ) : null}
                </div>
              </Field>
            </div>

            <Field label="Vinculada a" htmlFor="task-link" error={error?.field === "link" ? error.message : undefined}>
              <Select id="task-link" name="link" defaultValue={initialLink}>
                <option value="">Nada</option>
                {options.clients.length ? (
                  <optgroup label="Clientes">
                    {options.clients.map((c) => (
                      <option key={c.id} value={`c:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {options.learningPaths.length ? (
                  <optgroup label="Learning Paths">
                    {options.learningPaths.map((lp) => (
                      <option key={lp.id} value={`l:${lp.id}`}>
                        {lp.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {options.goals.length ? (
                  <optgroup label="Objetivos de la semana">
                    {options.goals.map((g) => (
                      <option key={g.id} value={`g:${g.id}`}>
                        {g.title} ({formatDayMonth(g.week_start)})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </Select>
            </Field>

            <Field label="Notas" htmlFor="task-description" error={error?.field === "description" ? error.message : undefined}>
              <textarea
                id="task-description"
                name="description"
                defaultValue={task?.description ?? ""}
                rows={5}
                maxLength={5000}
                placeholder="Contexto, enlaces, lo que haga falta"
                className={cx(inputClass, "h-auto min-h-24 resize-y py-2 leading-relaxed")}
              />
            </Field>

            {task ? (
              <p className="text-[12px] text-muted">
                {task.minutes ? (
                  <>
                    <span className="num text-text">{formatHours(task.minutes)}</span> apuntadas a esta tarea ·{" "}
                  </>
                ) : (
                  "Sin horas apuntadas · "
                )}
                creada el {formatDayMonth(task.created_at.slice(0, 10))}
                {task.completed_at ? <> · hecha el {formatDayMonth(task.completed_at.slice(0, 10))}</> : null}
              </p>
            ) : null}

            {error && !["title", "link", "description"].includes(error.field ?? "") ? (
              <p className="text-[12px] text-danger" role="alert">
                {error.message}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {task ? (
              <Button variant="danger" onClick={remove} disabled={pending} onBlur={() => setConfirmDelete(false)}>
                {confirmDelete ? "¿Borrar? Pulsa otra vez" : "Borrar"}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose} className="ml-auto">
              Cancelar
            </Button>
            <Button type="submit" variant="strong" disabled={pending} className="min-w-[96px]">
              {pending ? "Guardando…" : task ? "Guardar" : "Crear tarea"}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[12px] font-medium text-muted">{label}</legend>
      <div className="flex rounded-sm border border-line p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              "flex h-7 flex-1 cursor-pointer items-center justify-center rounded-xs px-1 text-[12px] whitespace-nowrap transition-colors duration-150 max-md:h-9",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              value === o.value ? "bg-text font-medium text-bg" : "text-muted hover:text-text",
            )}
          >
            <input
              type="radio"
              name={`seg-${label}`}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
