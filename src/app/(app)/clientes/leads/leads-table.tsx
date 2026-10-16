"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Download, Search, Upload, X } from "lucide-react";
import { AvatarStack, Button, ButtonLink, Chip, Input, Select, cx } from "@/components/ui";
import { useToast } from "@/components/app/toast";
import type { Member } from "@/lib/session";
import type { ClientListItem } from "@/lib/data/clients";
import { ALL_STAGES, placeLabel } from "@/lib/clients";
import { normalize } from "@/lib/clients-import";
import { STAGE_LABELS } from "@/lib/labels";
import { bulkUpdateClients } from "../actions";

type View = "prospeccion" | "activos" | "todos" | "no_contactar" | `etapa:${string}`;

const VIEW_LABELS: Record<string, string> = {
  prospeccion: "Por contactar y contactados",
  activos: "Todos menos perdidos",
  todos: "Todos",
  no_contactar: "No contactar",
};

const PAGE = 100;

export function LeadsTable({ me, members, clients }: { me: Member; members: Member[]; clients: ClientListItem[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<View>("prospeccion");
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [province, setProvince] = useState("");
  const [batch, setBatch] = useState("");
  const [bounced, setBounced] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [confirmDnc, setConfirmDnc] = useState(false);
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const options = useMemo(() => {
    const uniq = (f: (c: ClientListItem) => string) =>
      [...new Set(clients.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    return { sectors: uniq((c) => c.sector), provinces: uniq((c) => c.province), batches: uniq((c) => c.batch) };
  }, [clients]);

  const rows = useMemo(() => {
    const needle = normalize(q);
    return clients.filter((c) => {
      if (view === "prospeccion" && !(c.stage === "lead" || c.stage === "contactado")) return false;
      if (view === "activos" && c.stage === "perdido") return false;
      if (view === "no_contactar" && !c.do_not_contact) return false;
      if (view.startsWith("etapa:") && c.stage !== view.slice(6)) return false;
      if (sector && c.sector !== sector) return false;
      if (province && c.province !== province) return false;
      if (batch && c.batch !== batch) return false;
      if (bounced && !c.email_bounced) return false;
      if (needle && !normalize(`${c.name} ${c.email} ${c.city} ${c.sector} ${c.website}`).includes(needle)) return false;
      return true;
    });
  }, [clients, view, q, sector, province, batch, bounced]);

  const visible = rows.slice(0, limit);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const filtered = Boolean(q || sector || province || batch || bounced);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk(change: Parameters<typeof bulkUpdateClients>[1]) {
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkUpdateClients(ids, change);
      toast.show(result.ok ? result.message : result.error, { tone: result.ok ? "neutral" : "danger" });
      if (result.ok) {
        setSelected(new Set());
        setConfirmDnc(false);
      }
    });
  }

  return (
    <>
      <header className="border-b border-line">
        <div className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Leads</h1>
            <span className="num text-[12px] text-muted">
              {rows.length} de {clients.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/clientes/exportar" variant="ghost" prefetch={false}>
              <Download className="size-3.5" aria-hidden />
              <span className="max-sm:sr-only">Exportar</span>
            </ButtonLink>
            <ButtonLink href="/clientes/importar" variant="secondary">
              <Upload className="size-3.5" aria-hidden /> Importar CSV
            </ButtonLink>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 md:px-6">
          <div className="relative w-full sm:w-[240px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              aria-label="Buscar por nombre, email, ciudad o web"
              placeholder="Buscar"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              className="pl-8"
            />
          </div>
          <Select aria-label="Qué ver" value={view} onChange={(e) => setView(e.target.value as View)} className="h-8 max-w-[230px] max-md:h-10">
            {Object.entries(VIEW_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            <optgroup label="Una etapa">
              {ALL_STAGES.map((s) => (
                <option key={s} value={`etapa:${s}`}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </optgroup>
          </Select>
          <Select aria-label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} className="h-8 max-w-[180px] max-md:h-10">
            <option value="">Todos los sectores</option>
            {options.sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select aria-label="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} className="h-8 max-w-[170px] max-md:h-10">
            <option value="">Todas las provincias</option>
            {options.provinces.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          {options.batches.length ? (
            <Select aria-label="Tanda" value={batch} onChange={(e) => setBatch(e.target.value)} className="h-8 max-w-[130px] max-md:h-10">
              <option value="">Todas las tandas</option>
              {options.batches.map((s) => (
                <option key={s} value={s}>
                  Tanda {s}
                </option>
              ))}
            </Select>
          ) : null}
          <label className="flex h-8 items-center gap-2 rounded-sm px-1 text-[12px] text-muted max-md:h-10">
            <input type="checkbox" checked={bounced} onChange={(e) => setBounced(e.target.checked)} className="accent-[var(--text)]" />
            Email rebotado
          </label>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSector("");
                setProvince("");
                setBatch("");
                setBounced(false);
              }}
              className="inline-flex h-8 items-center gap-1 px-1 text-[12px] text-muted hover:text-text"
            >
              <X className="size-3.5" aria-hidden /> Quitar filtros
            </button>
          ) : null}
        </div>
      </header>

      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Acciones sobre la selección"
          className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2 md:px-6 max-md:top-12"
        >
          <span className="text-[13px] font-medium">
            <span className="num">{selected.size}</span> seleccionados
          </span>
          <Select
            aria-label="Mover a la etapa"
            value=""
            onChange={(e) => e.target.value && bulk({ stage: e.target.value })}
            disabled={pending}
            className="h-8 max-w-[190px] max-md:h-10"
          >
            <option value="">Mover a…</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Asignar a"
            value=""
            onChange={(e) => e.target.value && bulk({ ownerId: e.target.value })}
            disabled={pending}
            className="h-8 max-w-[160px] max-md:h-10"
          >
            <option value="">Asignar a…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === me.id ? `${m.short_name} (tú)` : m.short_name}
              </option>
            ))}
          </Select>
          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() => (confirmDnc ? bulk({ doNotContact: true }) : setConfirmDnc(true))}
            onBlur={() => setConfirmDnc(false)}
          >
            {confirmDnc ? "¿Seguro? Pulsa otra vez" : "Marcar «No contactar»"}
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[12px] text-muted hover:text-text">
            Quitar selección
          </button>
        </div>
      ) : null}

      <div className="px-4 py-4 md:px-6">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-[13px] text-muted">
            {clients.length === 0
              ? "Aún no hay leads. Importa el tracker de cold email en CSV o crea un cliente desde el Pipeline."
              : "Ningún lead con estos filtros."}
          </p>
        ) : (
          <div className="overflow-x-auto max-md:-mx-4">
            <table className="w-full text-[13px] max-md:block">
              <thead className="max-md:sr-only">
                <tr className="border-b border-line text-left">
                  <th scope="col" className="w-9 py-2 pr-2">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar los visibles"
                      checked={allVisibleSelected}
                      onChange={() =>
                        setSelected((s) => {
                          const next = new Set(s);
                          for (const r of visible) {
                            if (allVisibleSelected) next.delete(r.id);
                            else next.add(r.id);
                          }
                          return next;
                        })
                      }
                      className="accent-[var(--text)]"
                    />
                  </th>
                  {["Nombre", "Sector", "Lugar", "Etapa", "Email", "Tanda", ""].map((h, i) => (
                    <th key={i} scope="col" className="label py-2 pr-3 font-medium text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="max-md:block">
                {visible.map((c) => {
                  const owners = c.owners.map((o) => membersById.get(o.member_id)).filter(Boolean) as Member[];
                  return (
                    <tr
                      key={c.id}
                      className={cx(
                        "border-b border-line align-top hover:bg-surface-hover max-md:flex max-md:flex-wrap max-md:items-start max-md:gap-x-2 max-md:px-4 max-md:py-2",
                        selected.has(c.id) && "bg-surface-hover",
                        c.do_not_contact && "text-muted",
                      )}
                    >
                      <td className="py-2 pr-2 max-md:py-0.5">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${c.name}`}
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                          className="accent-[var(--text)] max-md:size-5"
                        />
                      </td>
                      <td className="py-2 pr-3 max-md:min-w-0 max-md:flex-1 max-md:py-0">
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                        <span className="block text-[12px] text-muted md:hidden">
                          {[c.sector, c.city].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted max-md:hidden">{c.sector}</td>
                      <td className="py-2 pr-3 text-muted max-md:hidden">{placeLabel(c.city, c.province)}</td>
                      <td className="py-2 pr-3 max-md:w-full max-md:pl-7">
                        <span className="flex flex-wrap gap-1">
                          <Chip>{STAGE_LABELS[c.stage]}</Chip>
                          {c.do_not_contact ? <Chip tone="danger">No contactar</Chip> : null}
                          {c.email_bounced ? <Chip tone="accent">Email rebotado</Chip> : null}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate py-2 pr-3 text-muted max-md:hidden">{c.email}</td>
                      <td className="num py-2 pr-3 text-muted max-md:hidden">{c.batch}</td>
                      <td className="py-2 max-md:hidden">{owners.length ? <AvatarStack people={owners} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > limit ? (
              <div className="flex justify-center py-4">
                <Button onClick={() => setLimit((l) => l + PAGE)}>
                  Ver más ({rows.length - limit} restantes)
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
