"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { EntryForm, type EntryDefaults } from "@/components/app/entry-form";
import { loadLinkOptions } from "@/app/(app)/horas/actions";
import type { LinkOption } from "@/lib/data/hours";

type OpenOptions = { defaults?: EntryDefaults; fromTimer?: boolean; title?: string };

const QuickLogContext = createContext<{ open: (opts?: OpenOptions) => void } | null>(null);

export function useQuickLog() {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog fuera de QuickLogProvider");
  return ctx;
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Registro rápido de horas desde cualquier pantalla: botón «Apuntar horas»,
 * atajo H o al parar el cronómetro. En el móvil se abre como hoja inferior.
 */
export function QuickLogProvider({ today, children }: { today: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState<(OpenOptions & { key: number }) | null>(null);
  const [linkOptions, setLinkOptions] = useState<LinkOption[] | null>(null);

  const open = useCallback(
    (opts?: OpenOptions) => {
      setSession({ ...opts, key: Date.now() });
      dialogRef.current?.showModal();
      if (linkOptions === null) {
        loadLinkOptions()
          .then(setLinkOptions)
          .catch(() => setLinkOptions([]));
      }
    },
    [linkOptions],
  );

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "h" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (dialogRef.current?.open) return;
      e.preventDefault();
      open();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <QuickLogContext value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="quick-log-title"
        onClose={() => setSession(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 w-full max-w-none bg-transparent p-0 text-text backdrop:[animation:fade-in_150ms_ease-out] max-md:mt-auto md:mx-auto md:mt-[12vh] md:max-w-[480px]"
      >
        {session ? (
          <div className="border border-line-strong bg-surface shadow-float [animation:sheet-in_200ms_cubic-bezier(0.16,1,0.3,1)] max-md:rounded-t-md max-md:border-b-0 max-md:pb-[env(safe-area-inset-bottom)] md:rounded-md">
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
              <h2 id="quick-log-title" className="text-[14px] font-semibold">
                {session.title ?? "Apuntar horas"}
              </h2>
              <IconButton label="Cerrar" onClick={close}>
                <X className="size-4" aria-hidden />
              </IconButton>
            </div>
            <div className="p-4">
              <EntryForm
                key={session.key}
                today={today}
                linkOptions={linkOptions}
                defaults={session.defaults}
                fromTimer={session.fromTimer}
                layout="stacked"
                autoFocus
                onDone={close}
              />
            </div>
          </div>
        ) : null}
      </dialog>
    </QuickLogContext>
  );
}
