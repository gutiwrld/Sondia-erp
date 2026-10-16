"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/app/toast";
import { QuickLogProvider } from "@/components/app/quick-log";
import { CommandPaletteProvider } from "@/components/app/command-palette";

export function AppProviders({ today, children }: { today: string; children: ReactNode }) {
  return (
    <ToastProvider>
      <QuickLogProvider today={today}>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </QuickLogProvider>
    </ToastProvider>
  );
}
