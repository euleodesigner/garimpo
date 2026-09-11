"use client";

import { useActionState } from "react";
import { redefinirSenha } from "./actions";
import { Input, Label, ButtonPrimary, FieldError } from "@/components/ui";

export default function RedefinirSenhaPage() {
  const [state, formAction, pending] = useActionState(redefinirSenha, undefined);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">⛏️</div>
          <div className="mt-1 text-xl font-extrabold tracking-wide text-ink">LISTA GARIMPO</div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-7">
          <h1 className="text-2xl font-extrabold text-ink">Nova senha</h1>
          <p className="mt-1 text-sm text-sub">Escolha uma nova senha para sua conta.</p>

          <form action={formAction}>
            <Label>Nova senha</Label>
            <Input type="password" name="senha" placeholder="••••••••" required minLength={6} />
            <FieldError>{state?.erro}</FieldError>
            <ButtonPrimary type="submit" disabled={pending} className="mt-5 w-full">
              {pending ? "Salvando…" : "Salvar nova senha"}
            </ButtonPrimary>
          </form>
        </div>
      </div>
    </div>
  );
}
