"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/app/toast";
import { QuickLogProvider } from "@/components/app/quick-log";

export function AppProviders({ today, children }: { today: string; children: ReactNode }) {
  return (
    <ToastProvider>
      <QuickLogProvider today={today}>{children}</QuickLogProvider>
    </ToastProvider>
  );
}
