import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvObjects } from "./csv";
import {
  classify,
  findMatch,
  guessMapping,
  mergeDrafts,
  parseEuros,
  parseOwners,
  rowToDraft,
  type ClientDraft,
} from "./clients-import";

const datos = (f: string) => readFileSync(path.join(import.meta.dirname, "../../datos-iniciales", f), "utf8");

describe("CSV", () => {
  it("comillas, comas y saltos de línea dentro de un campo", () => {
    expect(parseCsv('a,b\n"uno, dos","tres ""entre comillas""\nsegunda línea"\n')).toEqual([
      ["a", "b"],
      ["uno, dos", 'tres "entre comillas"\nsegunda línea'],
    ]);
  });

  it("punto y coma (Excel en español), BOM y CRLF", () => {
    expect(parseCsv("﻿nombre;valor\r\nPimar;1.234,56\r\n")).toEqual([
      ["nombre", "valor"],
      ["Pimar", "1.234,56"],
    ]);
  });

  it("ignora líneas vacías", () => {
    expect(parseCsv("a\n\n1\n\n")).toEqual([["a"], ["1"]]);
  });
});

describe("columnas", () => {
  it("reconoce las cabeceras del tracker y del pipeline", () => {
    expect(guessMapping(["nombre", "telefono", "estado", "cuenta_envio", "nota", "tanda"])).toMatchObject({
      name: "nombre",
      phone: "telefono",
      stage: "estado",
      send_account: "cuenta_envio",
      notes: "nota",
      batch: "tanda",
    });
    expect(guessMapping(["cliente", "etapa", "valor_eur", "proxima_accion", "Teléfono"])).toMatchObject({
      name: "cliente",
      stage: "etapa",
      value_eur: "valor_eur",
      next_action: "proxima_accion",
      phone: "Teléfono",
    });
  });
});

describe("clasificación de los descartados", () => {
  it("dijeron que no → No contactar", () => {
    const c = classify("descartado", 'Contestaron "no". No volver a escribir.', "924 149 250");
    expect(c).toEqual({ kind: "no_contactar", reason: 'Contestaron "no".' });
    expect(classify("descartado", "La web la lleva un familiar. No insistir.", "").kind).toBe("no_contactar");
  });

  it("aunque se esté jubilando, si dice que no se escriba, gana No contactar", () => {
    expect(classify("descartado", "Contestó: no le interesa, se está jubilando. No volver a escribir.", "").kind).toBe(
      "no_contactar",
    );
  });

  it("rebote → se sigue por teléfono, con el número de la nota", () => {
    expect(classify("descartado", "Email rebotó (no existe). Llamar al 988 321 728.", "988 321 728")).toEqual({
      kind: "rebote",
      nextAction: "Llamar al 988 321 728",
    });
    expect(classify("descartado", "Email rebotó (el dominio terra.com ya no recibe correo).", "983 822 049")).toEqual({
      kind: "rebote",
      nextAction: "Llamar al 983 822 049",
    });
  });

  it("cerrado, vendido, traspasado o jubilado → Perdido con motivo", () => {
    for (const nota of [
      "Contestó: se jubiló el 1 de octubre.",
      "Contestó: están traspasando el negocio.",
      "la casa se vendió a finales de septiembre",
      "cierran el 15 de noviembre por jubilación",
      "la casa está cerrada al turismo rural",
    ]) {
      expect(classify("descartado", nota, "").kind).toBe("cerrado");
    }
  });

  it("estados normales", () => {
    expect(classify("enviado", "", "")).toEqual({ kind: "stage", stage: "contactado" });
    expect(classify("preparado (sin enviar)", "", "")).toEqual({ kind: "stage", stage: "lead" });
    expect(classify("Reunión acordada", "", "")).toEqual({ kind: "stage", stage: "reunion" });
    expect(classify("Propuesta enviada", "", "")).toEqual({ kind: "stage", stage: "propuesta_enviada" });
  });
});

describe("valores", () => {
  it.each([
    ["490", 490],
    ["1.200", 1200],
    ["12.500", 12500],
    ["1.234.567", 1234567],
    ["490.5", 490.5],
    ["1.234,56", 1234.56],
    ["290 €", 290],
    ["175,45", 175.45],
    ["", null],
    ["abc", null],
  ])("«%s» → %s", (input, out) => {
    expect(parseEuros(input)).toBe(out);
  });

  it("responsables", () => {
    expect(parseOwners("Guzmán")).toEqual(["Guzmán"]);
    expect(parseOwners("Dani y Hugo")).toEqual(["Dani", "Hugo"]);
    expect(parseOwners("Equipo")).toEqual(["*"]);
    expect(parseOwners("Todos")).toEqual(["*"]);
  });
});

describe("los datos reales", () => {
  const leads = parseCsvObjects(datos("leads-cold-email.csv"));
  const leadMap = guessMapping(leads.headers);
  const drafts = leads.rows.map((r) => rowToDraft(r, leadMap, { source: "cold_email" })) as ClientDraft[];

  it("305 leads, todos válidos", () => {
    expect(drafts).toHaveLength(305);
    expect(drafts.every((d) => !("error" in d))).toBe(true);
  });

  it("reparto de etapas del tracker", () => {
    const count = (f: (d: ClientDraft) => boolean) => drafts.filter(f).length;
    expect(count((d) => d.stage === "lead")).toBe(26);
    expect(count((d) => d.do_not_contact)).toBe(8);
    expect(count((d) => d.email_bounced)).toBe(8);
    expect(count((d) => d.stage === "perdido" && !d.do_not_contact)).toBe(6);
    expect(count((d) => d.stage === "respondio")).toBe(6);
    expect(count((d) => d.stage === "contactado")).toBe(251 + 8);
  });

  it("cruza los clientes del pipeline con su lead", () => {
    const pipeline = parseCsvObjects(datos("clientes.csv"));
    const map = guessMapping(pipeline.headers);
    const clients = pipeline.rows.map((r) => rowToDraft(r, map)) as ClientDraft[];
    const matches = clients.map((c) => findMatch(c, drafts, { fuzzy: true })?.name ?? null);
    expect(matches).toEqual([
      "Librería Alcaraván",
      "Hotel Restaurante Gurutze-Berri",
      "Embutidos Pimar",
      "Legumbres La Gallareta",
      "Mesón Asador Valderrey",
      null, // Red F7 no viene del cold email
    ]);

    const merged = mergeDrafts(findMatch(clients[3], drafts, { fuzzy: true })!, clients[3]);
    expect(merged.name).toBe("La Gallareta / Distribución Mena de la Fuente");
    expect(merged.stage).toBe("negociacion");
    expect(merged.phone).toBe("920 34 03 16");
    expect(merged.notes).toContain("Quiere solo comisión");
    expect(merged.notes).toContain("WhatsApp");
  });

  it("no se arriesga cuando dos negocios comparten palabra", () => {
    const a = { name: "Casa Rural El Olivo" };
    expect(findMatch({ name: "Olivo Gourmet" }, [a, { name: "Restaurante El Olivo" }], { fuzzy: true })).toBeNull();
  });
});
