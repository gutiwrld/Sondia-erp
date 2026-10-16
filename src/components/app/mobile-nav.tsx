"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3, Home, ListChecks, Menu, Plus } from "lucide-react";
import { cx } from "@/components/ui";
import { useQuickLog } from "@/components/app/quick-log";
import { SondiaLogo } from "@/components/brand";
import { isActive } from "@/components/app/nav";

/** Cabecera móvil: logo y, si hay cronómetro, su tiempo. */
export function MobileTopBar({ timer }: { timer: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-chrome px-4 md:hidden">
      <Link href="/" aria-label="SondIA, ir a Mi espacio">
        <SondiaLogo />
      </Link>
      <div className="ml-auto">{timer}</div>
    </div>
  );
}

/**
 * Barra inferior en el móvil: Mi espacio · Tareas · [+ Horas] · Clientes · Más.
 */
export function MobileNav() {
  const pathname = usePathname();
  const quickLog = useQuickLog();

  const item = (href: string, label: string, Icon: typeof Home, disabled = false) => {
    const active = isActive(pathname, href);
    const cls = cx(
      "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
      disabled ? "text-faint" : active ? "text-text font-medium" : "text-muted",
    );
    if (disabled) {
      return (
        <span aria-disabled="true" className={cls}>
          <Icon className="size-5" aria-hidden />
          {label}
        </span>
      );
    }
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={cls}>
        <Icon className="size-5" aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-chrome pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-16 items-stretch">
        {item("/", "Mi espacio", Home)}
        {item("/tareas", "Tareas", ListChecks)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => quickLog.open()}
            aria-label="Apuntar horas"
            className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-float active:bg-accent-hover"
          >
            <Plus className="size-6" aria-hidden />
          </button>
        </div>
        {item("/clientes", "Clientes", Columns3)}
        {item("/mas", "Más", Menu)}
      </div>
    </nav>
  );
}
