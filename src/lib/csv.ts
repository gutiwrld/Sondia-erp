// Lector de CSV (RFC 4180): comillas, comillas dobles escapadas, saltos de
// línea dentro de campos, BOM y separador «,» o «;» (Excel en español).

export function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === ",") commas++;
    else if (!quoted && ch === ";") semicolons++;
  }
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Fuera filas totalmente vacías (líneas en blanco al final, por ejemplo).
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Filas como objetos usando la primera fila como cabecera. */
export function parseCsvObjects(input: string): { headers: string[]; rows: Record<string, string>[] } {
  const [headers = [], ...data] = parseCsv(input);
  const clean = headers.map((h) => h.trim());
  return {
    headers: clean,
    rows: data.map((r) => Object.fromEntries(clean.map((h, i) => [h, (r[i] ?? "").trim()]))),
  };
}
