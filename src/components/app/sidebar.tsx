"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Monitor, Moon, Plus, Search, Sun } from "lucide-react";
import { SondiaLogo } from "@/components/brand";
import { Avatar, IconButton, cx, type Person } from "@/components/ui";
import { useQuickLog } from "@/components/app/quick-log";
import { useCommandPalette } from "@/components/app/command-palette";
import { RunningTimer, type TimerView } from "@/components/app/timer";
import { NAV, isActive } from "@/components/app/nav";
import { signOut } from "@/app/login/actions";
import { setTheme, type ThemePreference } from "@/app/(app)/preferences-actions";

const THEME_NEXT: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };
const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Tema: el del sistema",
  light: "Tema: claro",
  dark: "Tema: oscuro",
};

export function Sidebar({
  me,
  timer,
  theme,
  badges,
}: {
  me: Person & { name: string };
  timer: TimerView | null;
  theme: ThemePreference;
  badges: { obvs: number };
}) {
  const pathname = usePathname();
  const quickLog = useQuickLog();
  const palette = useCommandPalette();
  const [, startTransition] = useTransition();
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <aside className="sticky top-0 flex h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-chrome max-md:hidden">
      <div className="flex h-12 items-center px-4">
        <Link href="/" aria-label="SondIA, ir a Mi espacio" className="rounded-xs">
          <SondiaLogo />
        </Link>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => palette.open()}
          className="flex h-8 items-center gap-2 rounded-sm border border-line bg-surface px-2.5 text-[13px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-text"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="flex-1 text-left">Buscar</span>
          <kbd className="num text-[11px]">⌘K</kbd>
        </button>
        {timer ? (
          <RunningTimer timer={timer} />
        ) : (
          <button
            type="button"
            onClick={() => quickLog.open()}
            className="flex h-8 items-center gap-2 rounded-sm bg-accent px-2.5 text-[13px] font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-hover"
          >
            <Plus className="size-4" aria-hidden />
            <span className="flex-1 text-left">Apuntar horas</span>
            <kbd className="num rounded-xs bg-on-accent/10 px-1 text-[11px] font-medium">H</kbd>
          </button>
        )}
      </div>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <p className="label px-2 pb-1 text-muted">{group.label}</p>
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                if (item.phase) {
                  return (
                    <li key={item.href}>
                      <span
                        aria-disabled="true"
                        title={`Llega en la fase ${item.phase}`}
                        className="flex h-8 items-center gap-2.5 rounded-sm px-2 text-[13px] text-faint"
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 ? (
                          <span className="num rounded-xs bg-accent-soft px-1.5 text-[11px] font-medium text-accent-text">
                            {badge}
                          </span>
                        ) : (
                          <span className="num text-[10px]">F{item.phase}</span>
                        )}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex h-8 items-center gap-2.5 rounded-sm px-2 text-[13px] transition-colors duration-150",
                        active
                          ? "bg-surface-hover font-medium text-text before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-full before:bg-accent"
                          : "text-muted hover:bg-surface-hover hover:text-text",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 ? (
                        <span
                          title={`${badge} fuera de plazo`}
                          className="num rounded-xs bg-accent-soft px-1.5 text-[11px] font-medium text-accent-text"
                        >
                          {badge}
                          <span className="sr-only"> fuera de plazo</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex h-14 items-center gap-2 border-t border-line px-3">
        <Avatar person={me} size="md" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium">{me.short_name}</p>
          <p className="truncate text-[11px] text-muted">{me.name === me.short_name ? "SondIA" : me.name}</p>
        </div>
        <IconButton
          label={`${THEME_LABEL[theme]}. Cambiar`}
          onClick={() => startTransition(() => setTheme(THEME_NEXT[theme]))}
        >
          <ThemeIcon className="size-4" aria-hidden />
        </IconButton>
        <form action={signOut}>
          <IconButton label="Salir" type="submit">
            <LogOut className="size-4" aria-hidden />
          </IconButton>
        </form>
      </div>
    </aside>
  );
}
