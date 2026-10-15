import type { Metadata } from "next";
import { SondiaLogo } from "@/components/brand";
import { Button } from "@/components/ui";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = { title: "Sin acceso" };

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg px-4">
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
        <SondiaLogo className="mb-10" />
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Esta cuenta ya no tiene acceso</h1>
        <p className="mt-2 mb-6 text-[13px] text-muted">
          Tu email no está en la lista de miembros activos de SondIA. Si crees que es un error, pide a Guzmán, Dani o
          Hugo que te devuelvan el acceso desde Ajustes.
        </p>
        <form action={signOut}>
          <Button type="submit" size="lg" className="w-full">
            Salir
          </Button>
        </form>
      </div>
    </main>
  );
}
