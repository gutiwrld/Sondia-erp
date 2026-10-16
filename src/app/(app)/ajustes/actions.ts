"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type FormResult = { ok: true; message: string } | { ok: false; error: string; field?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseGoal(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 80) return null;
  return Math.round(n * 2) / 2; // medias horas
}

function initialsFrom(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export async function updateMemberGoal(memberId: string, formData: FormData): Promise<FormResult> {
  await getCurrentMember();
  if (!UUID_RE.test(memberId)) return { ok: false, error: "Miembro no válido." };
  const goal = parseGoal(formData.get("goal"));
  if (goal === null) return { ok: false, error: "Entre 0 y 80 horas.", field: "goal" };

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ weekly_hours_goal: goal }).eq("id", memberId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Objetivo guardado" };
}

export async function addMember(formData: FormData): Promise<FormResult> {
  await getCurrentMember();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const goal = parseGoal(formData.get("goal") || "25");
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Escribe un email válido.", field: "email" };
  if (!name || name.length > 80) return { ok: false, error: "Escribe el nombre.", field: "name" };
  if (goal === null) return { ok: false, error: "Entre 0 y 80 horas.", field: "goal" };

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    email,
    name,
    short_name: name.split(/\s+/)[0],
    initials: initialsFrom(name),
    weekly_hours_goal: goal,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese email ya está en la lista.", field: "email" };
    return { ok: false, error: "No se ha podido añadir." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `${name} ya puede entrar con ${email}` };
}

export async function setMemberActive(memberId: string, active: boolean): Promise<FormResult> {
  const me = await getCurrentMember();
  if (!UUID_RE.test(memberId)) return { ok: false, error: "Miembro no válido." };
  if (memberId === me.id && !active) {
    return { ok: false, error: "No puedes quitarte el acceso a ti mismo. Pídeselo a otro miembro." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ active }).eq("id", memberId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/", "layout");
  return { ok: true, message: active ? "Acceso devuelto" : "Acceso retirado. Sus datos se conservan." };
}

export async function changePassword(formData: FormData): Promise<FormResult> {
  await getCurrentMember();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  if (password.length < 8) return { ok: false, error: "Al menos 8 caracteres.", field: "password" };
  if (password !== repeat) return { ok: false, error: "Las dos contraseñas no coinciden.", field: "repeat" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Es la misma que ya tienes.", field: "password" };
    if (error.code === "weak_password") return { ok: false, error: "Es demasiado débil; prueba con una más larga.", field: "password" };
    return { ok: false, error: "No se ha podido cambiar la contraseña." };
  }
  return { ok: true, message: "Contraseña cambiada" };
}
