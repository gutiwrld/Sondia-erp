import type { Metadata } from "next";
import { getCurrentMember } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Importar CSV" };

export default async function ImportarPage() {
  await getCurrentMember();
  const supabase = await createClient();
  // Para marcar duplicados en la vista previa: solo nombre, email y web.
  const existing: { name: string; email: string; website: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("clients").select("name, email, website").range(from, from + 999);
    if (error) throw error;
    existing.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return <Importer existing={existing} />;
}
