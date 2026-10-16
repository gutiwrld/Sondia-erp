"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Columns3,
  CornerDownLeft,
  ListChecks,
  MessagesSquare,
  Plus,
  Search,
  User,
} from "lucide-react";
import { cx } from "@/components/ui";
import { useQuickLog } from "@/components/app/quick-log";
import { NAV } from "@/components/app/nav";
import { searchEverything, type SearchHit } from "@/app/(app)/search-actions";
import { taskHref } from "@/lib/tasks";

type Item = {
  key: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: typeof Search;
  /** Ruta a la que lleva, o «horas» para abrir el registro rápido. */
  target: string;
};

const GROUP_LABELS: Record<SearchHit["kind"], string> = {
  cliente: "Clientes",
  tarea: "Tareas",
  lp: "Learning Paths",
  obv: "OBVs",
  persona: "Personas",
};
const KIND_ICONS: Record<SearchHit["kind"], typeof Search> = {
  cliente: Columns3,
  tarea: ListChecks,
  lp: BookOpen,
  obv: MessagesSquare,
  persona: User,
};
const KIND_ORDER: SearchHit["kind"][] = [
  "cliente",
  "tarea",
  "lp",
  "obv",
  "persona",
];

function hrefFor(hit: SearchHit) {
  switch (hit.kind) {
    case "cliente":
      return `/clientes/${hit.id}`;
    case "tarea":
      return taskHref(hit.id);
    case "lp":
      return `/leinn/lps?lp=${hit.id}`;
    case "obv":
      return `/leinn/obvs?obv=${hit.id}`;
    case "persona":
      return `/horas?persona=${hit.id}`;
  }
}

const PaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx)
    throw new Error("useCommandPalette fuera de CommandPaletteProvider");
  return ctx;
}

const EMPTY_HITS: SearchHit[] = [];

/** Buscador global: ⌘K / Ctrl K desde cualquier pantalla. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const quickLog = useQuickLog();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Resultados guardados junto a la consulta que los produjo.
  const [result, setResult] = useState<{
    q: string;
    hits: SearchHit[];
    failed: boolean;
  }>({ q: "", hits: [], failed: false });
  const [active, setActive] = useState(0);

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    setIsOpen(true);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) close();
        else open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Búsqueda con un pequeño retardo para no lanzar una consulta por tecla.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchEverything(q)
        .then((hits) => {
          if (cancelled) return;
          setResult({ q, hits, failed: false });
          setActive(0);
        })
        .catch(() => !cancelled && setResult({ q, hits: [], failed: true }));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const trimmed = query.trim();
  const current = result.q === trimmed;
  const hits = trimmed.length >= 2 && current ? result.hits : EMPTY_HITS;
  const failed = trimmed.length >= 2 && current && result.failed;
  const loading = trimmed.length >= 2 && !current;

  function run(item: Item) {
    close();
    if (item.target === "horas") quickLog.open();
    else router.push(item.target);
  }

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions: Item[] = [
      {
        key: "a-horas",
        group: "Acciones",
        title: "Apuntar horas",
        subtitle: "H",
        icon: Clock,
        target: "horas",
      },
      {
        key: "a-tarea",
        group: "Acciones",
        title: "Nueva tarea",
        subtitle: "T",
        icon: Plus,
        target: "/tareas?nueva=1",
      },
      {
        key: "a-cliente",
        group: "Acciones",
        title: "Nuevo cliente",
        icon: Plus,
        target: "/clientes?nuevo=1",
      },
      {
        key: "a-obv",
        group: "Acciones",
        title: "Nueva OBV",
        icon: Plus,
        target: "/leinn/obvs?nueva=1",
      },
      ...NAV.flatMap((g) =>
        g.items
          .filter((i) => !i.phase)
          .map((i) => ({
            key: `ir-${i.href}`,
            group: "Ir a",
            title: i.label,
            icon: ArrowRight,
            target: i.href,
          })),
      ),
    ].filter((a) => !q || a.title.toLowerCase().includes(q));

    const results: Item[] = KIND_ORDER.flatMap((kind) =>
      hits
        .filter((h) => h.kind === kind)
        .map((h) => ({
          key: `${h.kind}-${h.id}`,
          group: GROUP_LABELS[kind],
          title: h.title,
          subtitle: h.subtitle,
          icon: KIND_ICONS[kind],
          target: hrefFor(h),
        })),
    );
    return [...results, ...actions];
  }, [hits, query]);

  const groups = useMemo(() => {
    const out: { name: string; items: (Item & { index: number })[] }[] = [];
    items.forEach((item, index) => {
      const g =
        out.find((x) => x.name === item.group) ??
        out[out.push({ name: item.group, items: [] }) - 1];
      g.items.push({ ...item, index });
    });
    return out;
  }, [items]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) run(item);
    }
  }

  useEffect(() => {
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const q = query.trim();

  return (
    <PaletteContext value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label="Buscar"
        onClose={() => setIsOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 w-full max-w-none bg-transparent p-0 text-text max-md:h-dvh max-md:max-h-none md:mx-auto md:mt-[10vh] md:max-w-[620px]"
      >
        {isOpen ? (
          <div className="flex flex-col overflow-hidden border border-line-strong bg-surface shadow-float [animation:sheet-in_160ms_cubic-bezier(0.16,1,0.3,1)] max-md:h-full md:max-h-[70vh] md:rounded-md">
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={
                  items.length ? `${listId}-${active}` : undefined
                }
                aria-label="Buscar clientes, tareas, LPs, OBVs o personas"
                placeholder="Buscar clientes, tareas, LPs, OBVs o personas"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint max-md:text-base"
              />
              <button
                type="button"
                onClick={close}
                className="rounded-xs px-1.5 py-0.5 text-[12px] text-muted hover:text-text"
              >
                <span className="max-md:hidden">
                  <kbd className="num">Esc</kbd>
                </span>
                <span className="md:hidden">Cerrar</span>
              </button>
            </div>

            <div
              id={listId}
              role="listbox"
              aria-label="Resultados"
              className="min-h-0 flex-1 overflow-y-auto py-1"
            >
              {q.length >= 2 && !loading && !failed && hits.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-muted">
                  Nada con «{q}» en clientes, tareas, LPs, OBVs ni personas.
                </p>
              ) : null}
              {failed ? (
                <p className="px-4 py-3 text-[13px] text-danger" role="alert">
                  No se ha podido buscar. Comprueba la conexión y vuelve a
                  intentarlo.
                </p>
              ) : null}
              {groups.map((g) => (
                <div
                  key={g.name}
                  role="group"
                  aria-label={g.name}
                  className="py-1"
                >
                  <p className="label px-4 py-1 text-muted">{g.name}</p>
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const selected = item.index === active;
                    return (
                      <div
                        key={item.key}
                        id={`${listId}-${item.index}`}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(item.index)}
                        onClick={() => run(item)}
                        className={cx(
                          "mx-1 flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-[13px] max-md:h-12",
                          selected && "bg-surface-hover",
                        )}
                      >
                        <Icon
                          className="size-4 shrink-0 text-muted"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>
                        {item.subtitle ? (
                          <span
                            className={cx(
                              "max-w-[45%] shrink-0 truncate text-[12px] text-muted",
                              item.group === "Acciones" && "num",
                            )}
                          >
                            {item.subtitle}
                          </span>
                        ) : null}
                        {selected ? (
                          <CornerDownLeft
                            className="size-3.5 shrink-0 text-muted max-md:hidden"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex h-9 shrink-0 items-center gap-4 border-t border-line px-4 text-[11px] text-muted max-md:hidden">
              <span>
                <kbd className="num">↑↓</kbd> moverse
              </span>
              <span>
                <kbd className="num">Enter</kbd> abrir
              </span>
              <span>Busca sin acentos: «alcaravan» encuentra «Alcaraván»</span>
            </div>
          </div>
        ) : null}
      </dialog>
    </PaletteContext>
  );
}
