import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail, Phone } from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getClient } from "@/lib/data/clients";
import { madridDate, todayInMadrid } from "@/lib/dates";
import { placeLabel } from "@/lib/clients";
import { formatDayMonth, formatEur, formatHours, formatShortDate } from "@/lib/format";
import { OBV_TYPE_LABELS, STAGE_LABELS } from "@/lib/labels";
import { STATUS_LABELS, taskHref } from "@/lib/tasks";
import { AvatarStack, Chip, SectionHeading } from "@/components/ui";
import type { Member } from "@/lib/session";
import {
  DoNotContactControl,
  EditClientButton,
  EventComposer,
  NextActionForm,
  PaymentForm,
  PaymentRow,
  StageSelect,
} from "./client-controls";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/clientes/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Cliente" };
  const client = await getClient(id);
  return { title: client?.name ?? "Cliente" };
}

const EVENT_LABELS: Record<string, string> = {
  nota: "Nota",
  cambio_etapa: "Etapa",
  email: "Email",
  llamada: "Llamada",
  reunion: "Reunión",
  maqueta: "Maqueta",
  propuesta: "Propuesta",
  cobro: "Cobro",
  importacion: "Importación",
  no_contactar: "No contactar",
};

export default async function ClientPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const me = await getCurrentMember();
  const [client, members] = await Promise.all([getClient(id), getMembers({ includeInactive: true })]);
  if (!client) notFound();

  const today = todayInMadrid();
  const membersById = new Map(members.map((m) => [m.id, m]));
  const owners = client.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[];
  const paid = client.payments.reduce((s, p) => s + Number(p.amount_eur), 0);
  const value = client.value_eur !== null ? Number(client.value_eur) : null;
  const openTasks = client.tasks.filter((t) => t.status !== "hecha");
  const backHref = ["lead", "contactado", "perdido"].includes(client.stage) ? "/clientes/leads" : "/clientes";
  const website = client.website ? (client.website.startsWith("http") ? client.website : `https://${client.website}`) : null;

  const facts: [string, React.ReactNode][] = [
    ["Sector", client.sector],
    ["Lugar", placeLabel(client.city, client.province)],
    ["Contacto", client.contact_name],
    [
      "Email",
      client.email ? (
        <span className="flex items-center gap-1.5">
          <Mail className="size-3 text-muted" aria-hidden />
          <span className="break-all select-all">{client.email}</span>
        </span>
      ) : (
        ""
      ),
    ],
    [
      "Teléfono",
      client.phone ? (
        <span className="flex items-center gap-1.5">
          <Phone className="size-3 text-muted" aria-hidden />
          <span className="num select-all">{client.phone}</span>
        </span>
      ) : (
        ""
      ),
    ],
    [
      "Web",
      website ? (
        <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all hover:underline">
          {client.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <ExternalLink className="size-3 shrink-0 text-muted" aria-hidden />
        </a>
      ) : (
        ""
      ),
    ],
    ["Servicio", client.service],
    [
      "Modelo",
      client.pricing === "fijo" ? "Fijo" : client.pricing === "fijo_comision" ? "Fijo + comisión" : client.pricing === "solo_comision" ? "Solo comisión" : "",
    ],
    ["Origen", client.source === "cold_email" ? `Cold email${client.batch ? ` · tanda ${client.batch}` : ""}` : client.source === "referido" ? "Referido" : client.source],
    ["Asunto del email", client.email_subject],
    ["Cuenta de envío", client.send_account],
    ["Motivo de pérdida", client.stage === "perdido" ? client.lost_reason : ""],
  ];

  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="border-b border-line px-4 py-3 md:px-6">
        <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-[12px] text-muted hover:text-text">
          <ArrowLeft className="size-3.5" aria-hidden /> {backHref === "/clientes" ? "Pipeline" : "Leads"}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 text-[20px] font-semibold tracking-[-0.01em] text-balance">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StageSelect id={client.id} stage={client.stage} locked={client.do_not_contact} />
            {client.do_not_contact ? <Chip tone="danger">No contactar</Chip> : null}
            {client.email_bounced ? <Chip tone="accent">Email rebotado</Chip> : null}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {owners.length ? <AvatarStack people={owners} size="sm" /> : null}
            <EditClientButton client={client} members={members.filter((m) => m.active)} me={me} />
          </div>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {[
            value !== null ? `Valor ${formatEur(value, { round: !value || value % 1 === 0 })}` : null,
            paid ? `cobrado ${formatEur(paid)}` : null,
            client.minutes ? `${formatHours(client.minutes)} dedicadas` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Sin valor ni cobros todavía"}
        </p>
      </header>

      {client.do_not_contact ? (
        <div className="mx-4 mt-4 md:mx-6">
          <DoNotContactControl id={client.id} marked reason={client.do_not_contact_reason} since={client.do_not_contact_at} />
        </div>
      ) : null}

      <div className="grid gap-x-10 gap-y-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          {!client.do_not_contact ? (
            <section aria-labelledby="proxima">
              <SectionHeading id="proxima" title="Próxima acción" />
              <NextActionForm id={client.id} text={client.next_action} date={client.next_action_date} today={today} />
            </section>
          ) : null}

          <section aria-labelledby="datos">
            <SectionHeading id="datos" title="Datos" />
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 border-t border-line text-[13px]">
              {facts
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="border-b border-line py-2 text-muted">{k}</dt>
                    <dd className="min-w-0 border-b border-line py-2">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {client.notes ? (
            <section aria-labelledby="notas">
              <SectionHeading id="notas" title="Notas" />
              <p className="max-w-prose text-[13px] leading-relaxed whitespace-pre-line">{client.notes}</p>
            </section>
          ) : null}

          <section aria-labelledby="cobros">
            <SectionHeading
              id="cobros"
              title="Cobros"
              action={paid ? <span className="num text-[12px] text-muted">{formatEur(paid)}{value ? ` de ${formatEur(value, { round: true })}` : ""}</span> : null}
            />
            {client.payments.length ? (
              <ul className="mb-3 border-t border-line">
                {client.payments.map((p) => (
                  <PaymentRow key={p.id} payment={{ ...p, amount_eur: Number(p.amount_eur) }} />
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-[12px] text-muted">Sin cobros. Cuando cobres algo, regístralo aquí: cuenta en «Cobrado este mes».</p>
            )}
            <PaymentForm id={client.id} today={today} />
          </section>

          <section aria-labelledby="tareas-cliente">
            <SectionHeading
              id="tareas-cliente"
              title="Tareas"
              count={openTasks.length}
              action={
                <Link href={`/tareas?persona=equipo&cliente=${client.id}`} className="text-[12px] text-muted hover:text-text">
                  Ver en Tareas
                </Link>
              }
            />
            {client.tasks.length ? (
              <ul className="border-t border-line">
                {client.tasks.map((t) => (
                  <li key={t.id} className="flex min-h-9 items-center gap-3 border-b border-line py-1.5 text-[13px]">
                    <Link href={taskHref(t.id)} className={t.status === "hecha" ? "text-muted line-through" : "hover:underline"}>
                      {t.title}
                    </Link>
                    <span className="ml-auto flex shrink-0 items-center gap-2 text-[12px] text-muted">
                      {t.due_date ? <span className="num">{formatShortDate(t.due_date)}</span> : null}
                      <Chip>{STATUS_LABELS[t.status]}</Chip>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">Sin tareas. Desde Tareas puedes crear una y vincularla a este cliente.</p>
            )}
          </section>

          {client.obvs.length ? (
            <section aria-labelledby="obvs-cliente">
              <SectionHeading id="obvs-cliente" title="OBVs" count={client.obvs.length} />
              <ul className="border-t border-line">
                {client.obvs.map((o) => (
                  <li key={o.id} className="flex min-h-9 items-center gap-3 border-b border-line py-1.5 text-[13px]">
                    <span>
                      {OBV_TYPE_LABELS[o.type]} · {o.interviewee}
                    </span>
                    <span className="num ml-auto text-[12px] text-muted">{formatDayMonth(o.meeting_date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {!client.do_not_contact ? (
            <section aria-labelledby="zona-no-contactar">
              <h2 id="zona-no-contactar" className="sr-only">
                No contactar
              </h2>
              <DoNotContactControl id={client.id} marked={false} />
            </section>
          ) : null}
        </div>

        <section aria-labelledby="historial" className="min-w-0">
          <SectionHeading id="historial" title="Historial" count={client.events.length} />
          <EventComposer id={client.id} today={today} />
          <ol className="mt-4 flex flex-col">
            {client.events.map((e) => {
              const who = e.member_id ? membersById.get(e.member_id) : null;
              const text =
                e.type === "cambio_etapa" && e.from_stage && e.to_stage
                  ? `${STAGE_LABELS[e.from_stage]} → ${STAGE_LABELS[e.to_stage]}`
                  : e.body;
              return (
                <li key={e.id} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-line py-2.5 text-[13px]">
                  <span className="flex flex-col">
                    <span className="label text-muted">{EVENT_LABELS[e.type] ?? e.type}</span>
                    <span className="num text-[11px] text-muted">{formatDayMonth(madridDate(new Date(e.occurred_at)))}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={e.type === "cambio_etapa" ? "num" : "whitespace-pre-line"}>{text}</span>
                    {who ? <span className="block text-[12px] text-muted">{who.short_name}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
