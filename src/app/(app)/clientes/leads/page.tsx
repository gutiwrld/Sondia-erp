import type { Metadata } from "next";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getAllClients } from "@/lib/data/clients";
import { LeadsTable } from "./leads-table";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const me = await getCurrentMember();
  const [members, clients] = await Promise.all([getMembers(), getAllClients()]);
  return <LeadsTable me={me} members={members} clients={clients} />;
}
