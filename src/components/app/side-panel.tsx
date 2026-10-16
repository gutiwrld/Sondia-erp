"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui";

/** Panel lateral (hoja inferior en el móvil) sobre <dialog>. */
export function SidePanel({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{ ["--panel-w" as string]: `${width}px` }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-text max-md:mt-auto max-md:h-[92dvh] md:ml-auto md:w-[var(--panel-w)]"
    >
      {open ? (
        <div className="flex h-full flex-col border-line-strong bg-surface shadow-float [animation:sheet-in_200ms_cubic-bezier(0.16,1,0.3,1)] max-md:rounded-t-md max-md:border-t md:border-l">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 className="text-[14px] font-semibold">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose}>
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
