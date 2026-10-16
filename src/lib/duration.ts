// Parser de duraciones para apuntar horas rápido.
//
// Acepta: «1,5» · «1.5» · «2» · «1h30» · «1 h 30 min» · «1h» · «90m» ·
// «90 min» · «45'» · «1:30». Un número suelto se lee como horas si es ≤ 12 y
// como minutos si es mayor (así «2» son 2 h y «45» son 45 min); la interfaz
// enseña siempre cómo lo ha entendido antes de guardar.

const MAX_MINUTES = 1440;

export function parseDuration(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return null;

  let minutes: number | null = null;

  // 1:30
  let m = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) minutes = Number(m[1]) * 60 + Number(m[2]);

  // 1h30, 1 h 30 min, 1h, 2 horas, 1h 30m
  if (minutes === null) {
    m = raw.match(/^(\d+(?:[.,]\d+)?) ?(?:h|hr|hrs|hora|horas)(?: ?(\d{1,2}) ?(?:m|min|mins|minutos|')?)?$/);
    if (m) minutes = Math.round(toNumber(m[1]) * 60) + (m[2] ? Number(m[2]) : 0);
  }

  // 90m, 90 min, 45'
  if (minutes === null) {
    m = raw.match(/^(\d+) ?(?:m|min|mins|minutos|')$/);
    if (m) minutes = Number(m[1]);
  }

  // Número suelto: 1,5 · 2 · 45
  if (minutes === null) {
    m = raw.match(/^(\d+(?:[.,]\d+)?)$/);
    if (m) {
      const n = toNumber(m[1]);
      minutes = n <= 12 ? Math.round(n * 60) : Math.round(n);
    }
  }

  if (minutes === null || !Number.isFinite(minutes)) return null;
  if (minutes < 1 || minutes > MAX_MINUTES) return null;
  return minutes;
}

function toNumber(s: string): number {
  return Number(s.replace(",", "."));
}

/** Minutos → texto que entiende `parseDuration`: 90 → «1h30», 45 → «45m». */
export function durationInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
