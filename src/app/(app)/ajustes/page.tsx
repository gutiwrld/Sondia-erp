import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CreditCard, Database, Mail, MessageCircle, Palette, Plug, Users } from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/session";
import { PageHeader, PhaseNote } from "@/components/ui";
import { AddMemberForm, MemberRow, ThemeChoice } from "./settings-controls";
import type { ThemePreference } from "../preferences-actions";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const me = await getCurrentMember();
  const members = await getMembers({ includeInactive: true });
  const themeCookie = (await cookies()).get("theme")?.value;
  const theme: ThemePreference = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid grid-cols-1 gap-4 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card icon={Users} title="Equipo" description="Quién puede entrar y su objetivo semanal de horas." wide>
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-y border-line text-left">
                  <th scope="col" className="label px-4 py-2 font-medium text-muted">Persona</th>
                  <th scope="col" className="label px-2 py-2 font-medium text-muted">Email permitido</th>
                  <th scope="col" className="label px-2 py-2 text-right font-medium text-muted">Objetivo semanal</th>
                  <th scope="col" className="label px-4 py-2 text-right font-medium text-muted">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.id} member={m} isMe={m.id === me.id} />
                ))}
              </tbody>
            </table>
          </div>
          <AddMemberForm />
        </Card>

        <Card icon={Palette} title="Preferencias" description="Solo para este navegador.">
          <ThemeChoice current={theme} />
        </Card>

        <Card icon={Database} title="Datos" description="Importar y exportar clientes y leads.">
          <ul className="flex flex-col gap-2 text-[13px]">
            <li className="flex items-center justify-between gap-3">
              <span>Importar CSV de clientes y leads</span>
              <PhaseNote phase={3}>con el pipeline</PhaseNote>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Exportar a CSV</span>
              <PhaseNote phase={3}>con el pipeline</PhaseNote>
            </li>
          </ul>
        </Card>

        <Card icon={Plug} title="Próximamente" description="Fuera de la versión 1; el modelo de datos ya está preparado.">
          <ul className="flex flex-col divide-y divide-line text-[13px]">
            <Soon icon={CreditCard} title="Facturación">
              Los cobros guardan ya la referencia de factura.
            </Soon>
            <Soon icon={Mail} title="Gmail">
              El historial de cada cliente tiene un tipo «email» listo para recibirlos.
            </Soon>
            <Soon icon={MessageCircle} title="WhatsApp">
              Mismo historial, cuando haya integración.
            </Soon>
          </ul>
        </Card>
      </div>
    </>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  wide = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`card-${title}`}
      className={`min-w-0 rounded-md border border-line bg-surface p-4 ${wide ? "xl:col-span-2" : ""}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-muted" aria-hidden />
        <div>
          <h2 id={`card-${title}`} className="text-[14px] font-semibold">
            {title}
          </h2>
          <p className="text-[12px] text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Soon({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 size-3.5 text-faint" aria-hidden />
      <span>
        <span className="block text-muted">{title}</span>
        <span className="block text-[12px] text-faint">{children}</span>
      </span>
    </li>
  );
}
