"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { error?: string; email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));
  if (!EMAIL_RE.test(email)) return { email, error: "Escribe un email válido, por ejemplo nombre@sondia.es." };
  if (!password) return { email, error: "Escribe la contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { email, error: "Demasiados intentos seguidos. Espera un minuto y vuelve a probar." };
    // Mismo mensaje para email desconocido y contraseña mal: no decimos qué emails existen.
    if (error.status === 400) return { email, error: "Email o contraseña incorrectos." };
    return { email, error: "No hemos podido entrar. Inténtalo de nuevo en un momento." };
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
