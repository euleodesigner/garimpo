"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recuperarSenha } from "../auth-actions";
import { Input, Label, ButtonPrimary, ButtonGhost, FieldError } from "@/components/ui";

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(recuperarSenha, undefined);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">⛏️</div>
          <div className="mt-1 text-xl font-extrabold tracking-wide text-ink">LISTA GARIMPO</div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-7">
          <h1 className="text-2xl font-extrabold text-ink">Recuperar senha</h1>

          {state?.enviado ? (
            <>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-jade">
                ✓ Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
              </p>
              <Link href="/login">
                <ButtonGhost className="mt-4 w-full">← Voltar ao login</ButtonGhost>
              </Link>
            </>
          ) : (
            <form action={formAction}>
              <p className="mt-1 text-sm leading-relaxed text-sub">
                Informe seu e-mail e enviaremos um link para você criar uma nova senha.
              </p>
              <Label>E-mail</Label>
              <Input type="email" name="email" placeholder="voce@email.com" required />
              <FieldError>{state?.erro}</FieldError>
              <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
                {pending ? "Enviando…" : "Enviar link de redefinição"}
              </ButtonPrimary>
              <p className="mt-4 text-center text-sm">
                <Link href="/login" className="font-semibold text-clay underline">
                  ← Voltar ao login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
