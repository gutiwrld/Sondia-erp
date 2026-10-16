import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCurrentMember, getMembers } from "@/lib/session";
import { getTaskLinkOptions, getTasks } from "@/lib/data/tasks";
import { todayInMadrid } from "@/lib/dates";
import { isTaskPriority } from "@/lib/tasks";
import { TasksView } from "./tasks-view";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  const params = await searchParams;
  const me = await getCurrentMember();
  const today = todayInMadrid();
  const members = await getMembers();

  const persona = typeof params.persona === "string" ? params.persona : "yo";
  const ownerId = persona === "equipo" ? null : persona === "yo" ? me.id : (members.find((m) => m.id === persona)?.id ?? me.id);
  const savedView = (await cookies()).get("tareas_vista")?.value;
  const view = params.vista === "tablero" || params.vista === "lista" ? params.vista : savedView === "tablero" ? "tablero" : "lista";
  const priority = isTaskPriority(params.prioridad) ? params.prioridad : null;
  const clientId = typeof params.cliente === "string" ? params.cliente : null;

  const [tasks, options] = await Promise.all([getTasks({ ownerId, today }), getTaskLinkOptions(today)]);
  const visible = tasks.filter(
    (t) => (!priority || t.priority === priority) && (!clientId || t.client?.id === clientId),
  );

  return (
    <TasksView
      me={me}
      members={members}
      tasks={visible}
      totalBeforeFilters={tasks.length}
      options={options}
      today={today}
      view={view}
      filters={{ persona: ownerId === null ? "equipo" : ownerId === me.id ? "yo" : ownerId, priority, clientId }}
      openTaskId={typeof params.tarea === "string" ? params.tarea : null}
      openNew={params.nueva === "1"}
    />
  );
}
