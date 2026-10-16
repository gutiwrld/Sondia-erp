import {
  BookOpen,
  Clock,
  Columns3,
  Contact,
  Flag,
  Home,
  ListChecks,
  MessagesSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Fase en la que llega; sin valor = ya disponible. */
  phase?: number;
  badgeKey?: "obvs";
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Mi trabajo",
    items: [
      { href: "/", label: "Mi espacio", icon: Home },
      { href: "/horas", label: "Horas", icon: Clock },
      { href: "/tareas", label: "Tareas", icon: ListChecks },
      { href: "/objetivos", label: "Objetivos de la semana", icon: Flag },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/clientes", label: "Pipeline", icon: Columns3 },
      { href: "/clientes/leads", label: "Leads", icon: Contact },
    ],
  },
  {
    label: "LEINN",
    items: [
      { href: "/leinn/lps", label: "Learning Paths", icon: BookOpen, phase: 4 },
      { href: "/leinn/obvs", label: "OBVs", icon: MessagesSquare, phase: 4, badgeKey: "obvs" },
    ],
  },
  {
    label: "Equipo",
    items: [
      { href: "/equipo", label: "Inicio del equipo", icon: Users, phase: 4 },
      { href: "/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Pipeline no se marca en las páginas de Leads e importación.
  if (href === "/clientes") return pathname === "/clientes" || /^\/clientes\/[0-9a-f-]{36}/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}
