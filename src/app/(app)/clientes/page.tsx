import type { Metadata } from "next";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getPipelineClients } from "@/lib/data/clients";
import { todayInMadrid } from "@/lib/dates";
import { PipelineBoard } from "./pipeline-board";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: PageProps<"/clientes">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const [members, clients] = await Promise.all([getMembers(), getPipelineClients()]);
  const onlyMine = params.persona === "yo";
  return (
    <PipelineBoard
      me={me}
      members={members}
      clients={onlyMine ? clients.filter((c) => c.owners.some((o) => o.member_id === me.id)) : clients}
      onlyMine={onlyMine}
      openNew={params.nuevo === "1"}
      today={todayInMadrid()}
    />
  );
}
