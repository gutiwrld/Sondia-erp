"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Toast = {
  id: number;
  message: string;
  tone: "neutral" | "danger";
  action?: { label: string; onClick: () => void };
};

type ToastApi = {
  show: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"] }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? "neutral", action: opts?.action }]);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4 max-md:bottom-[calc(64px+env(safe-area-inset-bottom))] md:items-end md:px-6 md:pb-6"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, toast.action ? 7000 : 4000);
    return () => clearTimeout(timeout);
  }, [onDismiss, toast.action]);

  return (
    <div
      role={toast.tone === "danger" ? "alert" : "status"}
      className="pointer-events-auto flex max-w-full min-w-0 items-center gap-3 rounded-md border border-line-strong bg-surface py-2 pr-2 pl-3 text-[13px] shadow-float [animation:sheet-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
    >
      <span className={toast.tone === "danger" ? "text-danger" : "text-text"}>{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className="rounded-xs px-1.5 py-0.5 font-medium text-accent-text hover:bg-accent-soft"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="inline-flex size-6 items-center justify-center rounded-xs text-muted hover:text-text"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
