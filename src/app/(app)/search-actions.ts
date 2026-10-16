"use server";

import { getCurrentMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "cliente" | "tarea" | "lp" | "obv" | "persona";
  id: string;
  title: string;
  subtitle: string;
};

export async function searchEverything(query: string): Promise<SearchHit[]> {
  await getCurrentMember();
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_all", { p_query: q, p_limit: 6 });
  if (error) throw new Error("No se ha podido buscar");
  return (data ?? []).map((r) => ({ kind: r.kind as SearchHit["kind"], id: r.id, title: r.title, subtitle: r.subtitle ?? "" }));
}
