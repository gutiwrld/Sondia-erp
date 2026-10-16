// Componentes base. Planos, densos y con un único acento (ver DESIGN.md).

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// --- Botones -----------------------------------------------------------------

type ButtonVariant = "primary" | "strong" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover font-semibold",
  // Acción principal de una página sin gastar el naranja (reservado para «Apuntar horas» y avisos).
  strong: "bg-text text-bg hover:opacity-90 font-semibold",
  secondary: "bg-surface text-text border border-line hover:bg-surface-hover hover:border-line-strong",
  ghost: "text-muted hover:text-text hover:bg-surface-hover",
  danger: "text-danger hover:bg-danger-soft",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2 text-[13px]",
  md: "h-8 px-3 text-[13px] max-md:h-10 max-md:text-sm",
  lg: "h-10 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra?: string) {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], extra);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({
  label,
  className,
  type = "button",
  children,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40 max-md:size-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// --- Campos ------------------------------------------------------------------

export const inputClass =
  "h-8 w-full min-w-0 rounded-sm border border-line bg-surface px-2.5 text-[13px] text-text transition-colors duration-150 hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger max-md:h-11 max-md:text-base";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cx(inputClass, "appearance-none bg-no-repeat pr-7", className)} style={selectChevron} {...props}>
      {children}
    </select>
  );
}

const selectChevron = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b94' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 8px center",
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// --- Avatares ----------------------------------------------------------------

export type Person = { id: string; short_name: string; initials: string };

export function Avatar({ person, size = "sm" }: { person: Person; size?: "xs" | "sm" | "md" }) {
  const sizes = { xs: "size-5 text-[10px]", sm: "size-6 text-[11px]", md: "size-8 text-[12px]" };
  return (
    <span
      title={person.short_name}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-sunken font-mono font-medium text-muted",
        sizes[size],
      )}
    >
      {person.initials}
      <span className="sr-only"> {person.short_name}</span>
    </span>
  );
}

export function AvatarStack({ people, size = "xs" }: { people: Person[]; size?: "xs" | "sm" }) {
  return (
    <span className="inline-flex -space-x-1.5">
      {people.map((p) => (
        <span key={p.id} className="rounded-full ring-2 ring-bg">
          <Avatar person={p} size={size} />
        </span>
      ))}
    </span>
  );
}

// --- Chips de estado -----------------------------------------------------------

type Tone = "neutral" | "accent" | "positive" | "danger";

const chipTones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-muted border-line",
  accent: "bg-accent-soft text-accent-text border-transparent",
  positive: "bg-positive-soft text-positive border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Chip({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-xs border px-1.5 font-mono text-[11px] font-medium tracking-[0.02em] whitespace-nowrap",
        chipTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Estructura ---------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line">
      <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</h1>
          {description ? <p className="truncate text-[13px] text-muted max-sm:hidden">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function SectionHeading({
  title,
  count,
  action,
  id,
}: {
  title: ReactNode;
  count?: number;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex h-9 items-center gap-2">
      <h2 id={id} className="text-[13px] font-semibold">
        {title}
      </h2>
      {count !== undefined ? <span className="num text-[12px] text-muted">{count}</span> : null}
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </div>
  );
}

/** Estado vacío que explica qué poner y ofrece la acción para hacerlo. */
export function Empty({
  title,
  children,
  action,
  compact = false,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-start gap-1 rounded-md border border-dashed border-line-strong",
        compact ? "px-3 py-3" : "px-4 py-5",
      )}
    >
      <p className="text-[13px] font-medium">{title}</p>
      {children ? <div className="max-w-prose text-[13px] text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

// --- Medidor de horas -----------------------------------------------------------

/**
 * Barra de horas frente al objetivo. El tramo hasta el ritmo esperado se marca
 * en Ember solo cuando vas por detrás.
 */
export function HoursMeter({
  done,
  goal,
  expected,
  behind,
  size = "sm",
  label,
}: {
  done: number;
  goal: number;
  expected: number;
  behind: boolean;
  size?: "sm" | "md";
  label: string;
}) {
  const max = Math.max(goal, done, 1);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={done}
      className={cx("relative w-full overflow-hidden rounded-full bg-line", size === "md" ? "h-1.5" : "h-1")}
    >
      {behind ? (
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent/45" style={{ width: pct(expected) }} />
      ) : null}
      <span className="absolute inset-y-0 left-0 rounded-full bg-text" style={{ width: pct(done) }} />
    </div>
  );
}

// --- Fase pendiente ---------------------------------------------------------------

export function PhaseNote({ phase, children }: { phase: number; children: ReactNode }) {
  return (
    <p className="text-[12px] text-muted">
      <span className="num">Fase {phase}</span> · {children}
    </p>
  );
}
