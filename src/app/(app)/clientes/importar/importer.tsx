"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, FileUp } from "lucide-react";
import { Button, ButtonLink, Chip, Select, cx } from "@/components/ui";
import { parseCsvObjects } from "@/lib/csv";
import {
  CLIENT_FIELDS,
  FIELD_LABELS,
  findMatch,
  guessMapping,
  rowToDraft,
  type ClientDraft,
  type ClientField,
} from "@/lib/clients-import";
import { STAGE_LABELS } from "@/lib/labels";
import { importClients, type ImportSummary } from "../actions";

type Parsed = { fileName: string; headers: string[]; rows: Record<string, string>[] };
type Checked = { draft: ClientDraft; status: "nuevo" | "duplicado" } | { error: string; line: number };

const MAX_ROWS = 5000;
const CHUNK = 300;

export function Importer({ existing }: { existing: { name: string; email: string; website: string }[] }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ClientField, string>>>({});
  const [mode, setMode] = useState<"omitir" | "completar">("omitir");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, startTransition] = useTransition();

  async function load(file: File) {
    setFileError(null);
    setSummary(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError("Sube un archivo .csv (en Excel o Google Sheets: Archivo → Descargar → CSV).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("El archivo pesa más de 5 MB. Divídelo en varios.");
      return;
    }
    const text = await file.text();
    const { headers, rows } = parseCsvObjects(text);
    if (!headers.length || !rows.length) {
      setFileError("El archivo está vacío o no tiene filas debajo de la cabecera.");
      return;
    }
    if (rows.length > MAX_ROWS) {
      setFileError(`El archivo tiene ${rows.length} filas; el máximo es ${MAX_ROWS}.`);
      return;
    }
    setParsed({ fileName: file.name, headers, rows });
    setMapping(guessMapping(headers));
  }

  const checked: Checked[] = useMemo(() => {
    if (!parsed || !mapping.name) return [];
    const seen: ClientDraft[] = [];
    return parsed.rows.map((row, i) => {
      const d = rowToDraft(row, mapping, { source: "csv" });
      if ("error" in d) return { error: d.error, line: i + 2 };
      const dup = findMatch(d, existing) || findMatch(d, seen);
      seen.push(d);
      return { draft: d, status: dup ? "duplicado" : "nuevo" };
    });
  }, [parsed, mapping, existing]);

  const ok = checked.filter((c): c is Extract<Checked, { draft: ClientDraft }> => "draft" in c);
  const counts = {
    nuevos: ok.filter((c) => c.status === "nuevo").length,
    duplicados: ok.filter((c) => c.status === "duplicado").length,
    errores: checked.length - ok.length,
    noContactar: ok.filter((c) => c.draft.do_not_contact).length,
    rebotados: ok.filter((c) => c.draft.email_bounced).length,
  };

  function run() {
    const drafts = ok.map((c) => c.draft);
    startTransition(async () => {
      const total: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
      for (let i = 0; i < drafts.length; i += CHUNK) {
        setProgress(`Importando ${Math.min(i + CHUNK, drafts.length)} de ${drafts.length}…`);
        const r = await importClients(drafts.slice(i, i + CHUNK), mode);
        total.created += r.created;
        total.updated += r.updated;
        total.skipped += r.skipped;
        total.errors.push(...r.errors);
      }
      setProgress(null);
      setSummary(total);
    });
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6">
      <Link href="/clientes/leads" className="mb-2 inline-flex items-center gap-1 text-[12px] text-muted hover:text-text">
        <ArrowLeft className="size-3.5" aria-hidden /> Leads
      </Link>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Importar clientes y leads</h1>
      <p className="mt-1 mb-6 max-w-prose text-[13px] text-muted">
        Sube un CSV con una fila por negocio. Reconoce las columnas del tracker de cold email (nombre, email, estado, nota,
        tanda…) y las del pipeline (cliente, etapa, valor, próxima acción). Antes de importar ves qué se crea y qué ya
        existe. Nada se borra ni se cambia de etapa.
      </p>

      {summary ? (
        <section aria-label="Resultado" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
          <h2 className="text-[15px] font-semibold">Importación terminada</h2>
          <p className="text-[13px]">
            <span className="num">{summary.created}</span> creados ·{" "}
            {summary.updated ? (
              <>
                <span className="num">{summary.updated}</span> completados ·{" "}
              </>
            ) : null}
            <span className="num">{summary.skipped}</span> ya existían y se han dejado como estaban
          </p>
          {summary.errors.length ? (
            <ul className="text-[12px] text-danger">
              {summary.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <ButtonLink href="/clientes/leads" variant="strong">
              Ver Leads
            </ButtonLink>
            <Button
              onClick={() => {
                setParsed(null);
                setSummary(null);
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        </section>
      ) : !parsed ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) void load(f);
          }}
          className={cx(
            "flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center transition-colors duration-150",
            dragging ? "border-text bg-surface-hover" : "border-line-strong hover:bg-surface-hover",
          )}
        >
          <FileUp className="size-6 text-muted" aria-hidden />
          <span className="text-[14px] font-medium">Arrastra aquí el CSV o pulsa para elegirlo</span>
          <span className="text-[12px] text-muted">Separado por comas o por punto y coma · máximo 5.000 filas</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
            }}
          />
          {fileError ? (
            <span className="mt-2 text-[13px] text-danger" role="alert">
              {fileError}
            </span>
          ) : null}
        </label>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="columnas">
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 id="columnas" className="text-[14px] font-semibold">
                Columnas de {parsed.fileName}
              </h2>
              <span className="num text-[12px] text-muted">{parsed.rows.length} filas</span>
              <button type="button" onClick={() => setParsed(null)} className="ml-auto text-[12px] text-muted hover:text-text">
                Elegir otro archivo
              </button>
            </div>
            <div className="grid gap-x-6 gap-y-2 rounded-md border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3">
              {CLIENT_FIELDS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-[13px]">
                  <span className={cx("w-[120px] shrink-0", f === "name" ? "font-medium" : "text-muted")}>
                    {FIELD_LABELS[f]}
                    {f === "name" ? " *" : ""}
                  </span>
                  <Select
                    value={mapping[f] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value || undefined }))}
                    className="h-8 min-w-0 max-md:h-10"
                  >
                    <option value="">No importar</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
            {!mapping.name ? (
              <p className="mt-2 text-[13px] text-danger" role="alert">
                Elige qué columna tiene el nombre del negocio.
              </p>
            ) : null}
          </section>

          {mapping.name ? (
            <>
              <section aria-labelledby="resumen-import" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <h2 id="resumen-import" className="sr-only">
                  Resumen
                </h2>
                <span>
                  <span className="num font-medium">{counts.nuevos}</span> nuevos
                </span>
                <span className="text-muted">
                  <span className="num">{counts.duplicados}</span> ya existen
                </span>
                {counts.noContactar ? (
                  <span className="text-muted">
                    <span className="num">{counts.noContactar}</span> entrarán como «No contactar»
                  </span>
                ) : null}
                {counts.rebotados ? (
                  <span className="text-muted">
                    <span className="num">{counts.rebotados}</span> con el email rebotado
                  </span>
                ) : null}
                {counts.errores ? (
                  <span className="text-danger">
                    <span className="num">{counts.errores}</span> filas sin nombre (se saltan)
                  </span>
                ) : null}
              </section>

              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-surface-sunken text-left">
                      {["", "Nombre", "Etapa", "Email", "Ciudad", "Próxima acción"].map((h) => (
                        <th key={h} scope="col" className="label px-3 py-2 font-medium text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {checked.slice(0, 50).map((c, i) =>
                      "error" in c ? (
                        <tr key={i} className="border-b border-line text-danger">
                          <td className="px-3 py-1.5" colSpan={6}>
                            Línea {c.line}: {c.error}
                          </td>
                        </tr>
                      ) : (
                        <tr key={i} className={cx("border-b border-line", c.status === "duplicado" && "text-muted")}>
                          <td className="px-3 py-1.5">
                            <Chip tone={c.status === "nuevo" ? "positive" : "neutral"}>{c.status === "nuevo" ? "Nuevo" : "Ya existe"}</Chip>
                          </td>
                          <td className="px-3 py-1.5">{c.draft.name}</td>
                          <td className="px-3 py-1.5">
                            <span className="flex flex-wrap gap-1">
                              {STAGE_LABELS[c.draft.stage]}
                              {c.draft.do_not_contact ? <Chip tone="danger">No contactar</Chip> : null}
                              {c.draft.email_bounced ? <Chip tone="accent">Rebotado</Chip> : null}
                            </span>
                          </td>
                          <td className="max-w-[220px] truncate px-3 py-1.5 text-muted">{c.draft.email}</td>
                          <td className="px-3 py-1.5 text-muted">{c.draft.city}</td>
                          <td className="max-w-[240px] truncate px-3 py-1.5 text-muted">{c.draft.next_action}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {checked.length > 50 ? <p className="-mt-4 text-[12px] text-muted">Se muestran las 50 primeras filas.</p> : null}

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-[13px] font-medium">Con los que ya existen</legend>
                {(
                  [
                    ["omitir", "Dejarlos como están"],
                    ["completar", "Rellenar solo los datos que les falten (email, web, teléfono…)"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-[13px]">
                    <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="accent-[var(--text)]" />
                    {l}
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="strong" size="lg" onClick={run} disabled={pending || (counts.nuevos === 0 && mode === "omitir")}>
                  {pending ? (progress ?? "Importando…") : `Importar ${counts.nuevos} nuevos`}
                </Button>
                {counts.nuevos === 0 && mode === "omitir" ? (
                  <span className="text-[12px] text-muted">Todos los negocios del archivo ya están en el ERP.</span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
