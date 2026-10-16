import type { Metadata } from "next";
import { SondiaLogo } from "@/components/brand";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : "/");

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-4">
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
        <SondiaLogo className="mb-10" />
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Entrar en el ERP</h1>
        <p className="mt-1 mb-6 text-[13px] text-muted">
          Con tu email y la contraseña del equipo. Solo pueden entrar Guzmán, Dani y Hugo.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
