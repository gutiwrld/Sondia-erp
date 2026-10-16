import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/labels";
import { todayInMadrid } from "@/lib/dates";

// CSV con todos los clientes y leads (separado por «;» para que Excel en
// español lo abra bien). Solo para miembros: la RLS no devuelve nada a nadie más.
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new NextResponse("No autorizado", { status: 401 });

  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("clients")
      .select("name, stage, do_not_contact, email_bounced, sector, city, province, contact_name, email, phone, website, service, value_eur, next_action, next_action_date, lost_reason, batch, notes")
      .order("name")
      .range(from, from + 999);
    if (error) return new NextResponse("No se ha podido exportar", { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const headers = ["nombre", "etapa", "no_contactar", "email_rebotado", "sector", "ciudad", "provincia", "contacto", "email", "telefono", "web", "servicio", "valor_eur", "proxima_accion", "fecha_proxima_accion", "motivo_perdida", "tanda", "notas"];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.name,
        STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS],
        r.do_not_contact ? "sí" : "",
        r.email_bounced ? "sí" : "",
        r.sector,
        r.city,
        r.province,
        r.contact_name,
        r.email,
        r.phone,
        r.website,
        r.service,
        r.value_eur === null ? "" : String(r.value_eur).replace(".", ","),
        r.next_action,
        r.next_action_date,
        r.lost_reason,
        r.batch,
        r.notes,
      ]
        .map(cell)
        .join(";"),
    ),
  ];

  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sondia-clientes-${todayInMadrid()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
