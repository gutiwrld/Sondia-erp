import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Member = {
  id: string;
  email: string;
  name: string;
  short_name: string;
  initials: string;
  weekly_hours_goal: number;
  active: boolean;
};

const MEMBER_COLUMNS = "id, email, name, short_name, initials, weekly_hours_goal, active";

function toMember(row: {
  id: string;
  email: string;
  name: string;
  short_name: string;
  initials: string;
  weekly_hours_goal: number | string;
  active: boolean;
}): Member {
  return { ...row, weekly_hours_goal: Number(row.weekly_hours_goal) };
}

/**
 * Miembro que ha entrado. Redirige a /login sin sesión y a /sin-acceso si la
 * cuenta existe pero ya no está en la lista de miembros activos.
 * Se llama también desde cada Server Action: nunca confiamos en el cliente.
 */
export const getCurrentMember = cache(async (): Promise<Member> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: row } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!row) redirect("/sin-acceso");
  return toMember(row);
});

export const getMembers = cache(async ({ includeInactive = false } = {}): Promise<Member[]> => {
  const supabase = await createClient();
  let query = supabase.from("members").select(MEMBER_COLUMNS).order("created_at");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toMember);
});
