import { cookies } from "next/headers";
import { getCurrentMember } from "@/lib/session";
import { getTimer } from "@/lib/data/hours";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayInMadrid } from "@/lib/dates";
import { OBV_DEADLINE_DAYS } from "@/lib/obv";
import { AppProviders } from "@/components/app/providers";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav, MobileTopBar } from "@/components/app/mobile-nav";
import { RunningTimer, type TimerView } from "@/components/app/timer";
import type { ThemePreference } from "./preferences-actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getCurrentMember();
  const today = todayInMadrid();
  const supabase = await createClient();

  const [timer, overdueObvs, themeCookie] = await Promise.all([
    getTimer(me.id),
    // OBVs del equipo fuera de plazo (reunión hace más de 3 días y sin redactar).
    supabase
      .from("obvs")
      .select("id", { count: "exact", head: true })
      .is("written_date", null)
      .lt("meeting_date", addDays(today, -OBV_DEADLINE_DAYS)),
    cookies().then((c) => c.get("theme")?.value),
  ]);

  const theme: ThemePreference = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";
  const timerView: TimerView | null = timer
    ? {
        started_at: timer.started_at,
        category: timer.category,
        label: timer.client?.name ?? timer.task?.title ?? (timer.note || null),
      }
    : null;

  return (
    <AppProviders today={today}>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-sm bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-dvh">
        <Sidebar me={me} timer={timerView} theme={theme} badges={{ obvs: overdueObvs.count ?? 0 }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar timer={timerView ? <RunningTimer timer={timerView} compact /> : null} />
          <main id="contenido" className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </AppProviders>
  );
}
