import type { Metadata } from "next";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getLps } from "@/lib/data/leinn";
import { todayInMadrid } from "@/lib/dates";
import { LpsView } from "./lps-view";

export const metadata: Metadata = { title: "Learning Paths" };

export default async function LpsPage({
  searchParams,
}: PageProps<"/leinn/lps">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const [members, lps] = await Promise.all([getMembers(), getLps()]);
  return (
    <LpsView
      me={me}
      members={members}
      lps={lps}
      today={todayInMadrid()}
      openLpId={typeof params.lp === "string" ? params.lp : null}
      openNew={params.nueva === "1"}
    />
  );
}
