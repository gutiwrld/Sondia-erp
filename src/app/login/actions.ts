"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; next: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? "/"));
  if (!EMAIL_RE.test(email)) {
    return { step: "email", email, error: "Escribe un email válido, por ejemplo nombre@sondia.es." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // El trigger de la lista cerrada hace que Auth falle al crear el usuario.
    if (error.status === 500 || /database error/i.test(error.message)) {
      return { step: "email", email, error: "Este email no tiene acceso al ERP de SondIA." };
    }
    if (error.status === 429) {
      return {
        step: "email",
        email,
        error: "Has pedido varios enlaces seguidos. Espera un minuto y vuelve a intentarlo.",
      };
    }
    return { step: "email", email, error: "No hemos podido enviar el enlace. Inténtalo de nuevo en un momento." };
  }

  return { step: "code", email, next };
}

export async function verifyCode(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? "/"));
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { error: "El código tiene 6 cifras." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { error: "Código incorrecto o caducado. Si ha pasado más de una hora, pide un enlace nuevo." };
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
