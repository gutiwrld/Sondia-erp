import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { NAV } from "@/components/app/nav";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Más" };

/** Todas las secciones, para el móvil (la barra inferior solo tiene cuatro). */
export default async function MasPage() {
  await getCurrentMember();
  return (
    <>
      <PageHeader title="Todas las secciones" />
      <div className="flex flex-col gap-6 px-4 py-5">
        {NAV.map((group) => (
          <section key={group.label} aria-labelledby={`grupo-${group.label}`}>
            <h2 id={`grupo-${group.label}`} className="label mb-1 text-muted">
              {group.label}
            </h2>
            <ul className="border-t border-line">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href} className="border-b border-line">
                    {item.phase ? (
                      <span aria-disabled="true" className="flex h-12 items-center gap-3 text-[14px] text-faint">
                        <Icon className="size-4" aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        <span className="num text-[11px]">Fase {item.phase}</span>
                      </span>
                    ) : (
                      <Link href={item.href} className="flex h-12 items-center gap-3 text-[14px]">
                        <Icon className="size-4 text-muted" aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="size-4 text-muted" aria-hidden />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
