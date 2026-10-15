"use client";

import { useRef, useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Avatar, Button, Field, Input, cx } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import { addMember, setMemberActive, updateMemberGoal } from "./actions";
import { setTheme, type ThemePreference } from "../preferences-actions";

export function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [goal, setGoal] = useState(String(member.weekly_hours_goal).replace(".", ","));
  const [error, setError] = useState<string | null>(null);
  const saved = String(member.weekly_hours_goal).replace(".", ",");

  function saveGoal() {
    if (goal === saved) return;
    const fd = new FormData();
    fd.set("goal", goal);
    startTransition(async () => {
      const result = await updateMemberGoal(member.id, fd);
      if (result.ok) {
        setError(null);
        toast.show(`${member.short_name}: ${result.message.toLowerCase()}`);
      } else setError(result.error);
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await setMemberActive(member.id, !member.active);
      toast.show(result.ok ? result.message : result.error, { tone: result.ok ? "neutral" : "danger" });
    });
  }

  return (
    <tr className={cx("border-b border-line", !member.active && "text-muted")}>
      <td className="px-4 py-2">
        <span className="flex items-center gap-2">
          <Avatar person={member} size="sm" />
          <span>
            {member.name}
            {isMe ? <span className="text-muted"> (tú)</span> : null}
          </span>
        </span>
      </td>
      <td className="px-2 py-2">
        <span className="num text-[12px] break-all">{member.email}</span>
      </td>
      <td className="px-2 py-2 text-right">
        <span className="inline-flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1.5">
            <Input
              aria-label={`Objetivo semanal de ${member.short_name}, en horas`}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onBlur={saveGoal}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveGoal();
                }
              }}
              inputMode="decimal"
              disabled={pending || !member.active}
              aria-invalid={Boolean(error)}
              className="num h-7 w-16 text-right"
            />
            <span className="text-[12px] text-muted">h</span>
          </span>
          {error ? (
            <span className="text-[11px] text-danger" role="alert">
              {error}
            </span>
          ) : null}
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        {isMe ? (
          <span className="text-[12px] text-muted">Activo</span>
        ) : (
          <Button size="sm" variant={member.active ? "ghost" : "secondary"} onClick={toggleActive} disabled={pending}>
            {member.active ? "Retirar acceso" : "Devolver acceso"}
          </Button>
        )}
      </td>
    </tr>
  );
}

export function AddMemberForm() {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setOpen(true)}>
          Añadir email permitido
        </Button>
        <p className="text-[12px] text-muted">Solo los emails de esta lista pueden pedir el enlace de acceso.</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const result = await addMember(fd);
          if (result.ok) {
            toast.show(result.message);
            formRef.current?.reset();
            setError(null);
            setOpen(false);
          } else setError({ message: result.error, field: result.field });
        })
      }
      className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_96px_auto] sm:items-end"
    >
      <Field label="Nombre" htmlFor="new-name" error={error?.field === "name" ? error.message : undefined}>
        <Input id="new-name" name="name" required maxLength={80} autoFocus aria-invalid={error?.field === "name"} />
      </Field>
      <Field label="Email" htmlFor="new-email" error={error?.field === "email" ? error.message : undefined}>
        <Input id="new-email" name="email" type="email" required aria-invalid={error?.field === "email"} />
      </Field>
      <Field label="Objetivo (h)" htmlFor="new-goal" error={error?.field === "goal" ? error.message : undefined}>
        <Input id="new-goal" name="goal" defaultValue="25" inputMode="decimal" className="num" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Añadiendo…" : "Añadir"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {error && !error.field ? (
        <p className="text-[12px] text-danger sm:col-span-4" role="alert">
          {error.message}
        </p>
      ) : null}
    </form>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

export function ThemeChoice({ current }: { current: ThemePreference }) {
  const [pending, startTransition] = useTransition();
  return (
    <fieldset>
      <legend className="mb-2 text-[12px] font-medium text-muted">Tema</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cx(
              "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-sm border text-[13px] transition-colors duration-150",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              current === value ? "border-text bg-text text-bg" : "border-line text-muted hover:border-line-strong hover:text-text",
              pending && "opacity-70",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={current === value}
              onChange={() => startTransition(() => setTheme(value))}
              className="sr-only"
            />
            <Icon className="size-3.5" aria-hidden />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
