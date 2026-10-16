// Crea (o actualiza) la cuenta de acceso de cada miembro activo con la
// contraseña que le pases. La contraseña no se guarda en el repositorio.
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SECRET_KEY=sb_secret_... \
//   ERP_PASSWORD='la contraseña del equipo' \
//   npm run cuentas
//
// La clave secreta está en Supabase → Project Settings → API Keys. No la
// pongas nunca en Vercel ni en el código del navegador.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ERP_PASSWORD;

if (!url || !secret || !password) {
  console.error("Faltan variables: SUPABASE_URL, SUPABASE_SECRET_KEY y ERP_PASSWORD.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña tiene que tener al menos 8 caracteres.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: members, error } = await admin.from("members").select("email, short_name").eq("active", true);
  if (error) throw error;
  if (!members.length) throw new Error("No hay miembros activos. Añade los emails en la tabla members primero.");

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

  for (const m of members) {
    const existing = byEmail.get(m.email.toLowerCase());
    const { error: e } = existing
      ? await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
      : await admin.auth.admin.createUser({ email: m.email, password, email_confirm: true });
    if (e) throw new Error(`${m.email}: ${e.message}`);
    console.log(`${existing ? "Actualizada" : "Creada"}: ${m.short_name} <${m.email}>`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
