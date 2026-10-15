"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { sendMagicLink, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [sent, send, sending] = useActionState(sendMagicLink, { step: "email", error: initialError } as LoginState);
  const [verified, verify, verifying] = useActionState(verifyCode, {});
  const [editingEmail, setEditingEmail] = useState(false);

  if (sent.step === "code" && !editingEmail) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[13px]" role="status">
            Enlace enviado a <strong className="font-semibold break-all">{sent.email}</strong>. Ábrelo en este
            dispositivo o escribe aquí el código de 6 cifras que viene en el email.
          </p>
        </div>
        <form action={verify} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={sent.email} />
          <input type="hidden" name="next" value={sent.next} />
          <Field label="Código" htmlFor="code" error={verified.error}>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              className="num tracking-[0.3em]"
              aria-invalid={Boolean(verified.error)}
              autoFocus
              required
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={verifying}>
            {verifying ? "Comprobando…" : "Entrar"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setEditingEmail(true)}
          className="inline-flex items-center gap-1.5 self-start text-[13px] text-muted hover:text-text"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Usar otro email o pedir otro enlace
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setEditingEmail(false);
        send(formData);
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={sent.step === "email" ? sent.error : undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nombre@sondia.es"
          defaultValue={sent.email}
          aria-invalid={Boolean(sent.step === "email" && sent.error)}
          autoFocus
          required
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" disabled={sending}>
        {sending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
