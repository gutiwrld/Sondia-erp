import type { Metadata } from "next";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getLps, getObvClientOptions, getObvs } from "@/lib/data/leinn";
import { todayInMadrid } from "@/lib/dates";
import { ObvsView } from "./obvs-view";

export const metadata: Metadata = { title: "OBVs" };

export default async function ObvsPage({
  searchParams,
}: PageProps<"/leinn/obvs">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const [members, obvs, lps, clients] = await Promise.all([
    getMembers(),
    getObvs(),
    getLps(),
    getObvClientOptions(),
  ]);
  const lpFilter =
    typeof params.lp === "string" && lps.some((l) => l.id === params.lp)
      ? params.lp
      : null;
  return (
    <ObvsView
      me={me}
      members={members}
      obvs={obvs}
      lps={lps.map((l) => ({ id: l.id, number: l.number, title: l.title }))}
      clients={clients}
      today={todayInMadrid()}
      lpFilter={lpFilter}
      openObvId={typeof params.obv === "string" ? params.obv : null}
      openNew={params.nueva === "1"}
    />
  );
}
